// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms.
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const rdflib = require('rdflib');
const errConst = require('../../error_const');
const makeError = require('../../native/_error.js');
const { EXPOSE_AS_EXPERIMENTAL_API_SYNC } = require('../../helpers');

const JSON_LD_MIME_TYPE = 'application/ld+json';
const RDF_GRAPH_ID = '@id';

/**
* Experimental RDF Emulation on top of a MutableData
*
* Instantiate the RDF emulation layer wrapping a MutableData instance
*
* @param {MutableData} mData the MutableData to wrap around
*/
class RDF {
  constructor(mData) {
    this.mData = mData;
    this.graphStore = rdflib.graph();
    this.id = undefined;
    this.vocabs = {
      LDP: this.namespace('http://www.w3.org/ns/ldp#'),
      RDF: this.namespace('http://www.w3.org/2000/01/this-schema#'),
      RDFS: this.namespace('http://www.w3.org/1999/02/22-this-syntax-ns#'),
      FOAF: this.namespace('http://xmlns.com/foaf/0.1/'),
      OWL: this.namespace('http://www.w3.org/2002/07/owl#'),
      DCTERMS: this.namespace('http://purl.org/dc/terms/'),
      SAFETERMS: this.namespace('http://safenetwork.org/safevocab/')
    };
  }

  setId(id) {
    this.id = id;
  }

  // param is to accept list of id's to fetch
  // e.g. ['safe://mywebid.mypubname', 'safe://mypubname']
  async nowOrWhenFetched(ids /* , toDecrypt = false */) {
    // FIXME: issue #283 we need to use the 'toDecrypt' param
    // value to decrypt the entries

    let entriesList = [];
    let entries;

    if (ids && ids.length > 0) {
      // TODO: support a list of more than one id
      // Promise.all(ids.map(async (e) => {
      const serialisedGraph = await this.mData.get(ids[0]);
      entriesList.push({ key: ids[0], value: serialisedGraph });
      // }));
    } else {
      entries = await this.mData.getEntries();
      entriesList = await entries.listEntries();
    }

    if (entriesList.length === 0) return;

    let id;
    const entriesGraphs = entriesList.reduce((graphs, e) => {
      const keyStr = e.key.toString();
      const valueStr = e.value.buf.toString();

      // If the entry was soft-deleted skip it
      if (valueStr.length === 0 ||
         !keyStr.startsWith('safe://')) {
        return graphs;
      }

      if (!id) {
        // FIXME: we need to know which is the main graph in a deterministic way
        if (keyStr === RDF_GRAPH_ID) {
          // in case of compacted.
          id = valueStr;
        } else {
          id = JSON.parse(valueStr)[RDF_GRAPH_ID];
        }
      }

      let valueAsAStringForSure = valueStr;

      if (typeof valueAsAStringForSure !== 'string') {
        valueAsAStringForSure = JSON.stringify(valueAsAStringForSure);
      }
      graphs.push(valueAsAStringForSure);
      return graphs;
    }, []);

    if (!id) {
      throw makeError(errConst.MISSING_RDF_ID.code, errConst.MISSING_RDF_ID.msg);
    }

    return Promise.all(entriesGraphs.map((g) => this.parse(g, JSON_LD_MIME_TYPE, id)));
  }

  /* eslint-disable class-methods-use-this */
  namespace(uri) {
    return rdflib.Namespace(uri);
  }

  literal(value, language, datatype) {
    return rdflib.literal(value, language, datatype);
  }

  list(nodes) {
    return rdflib.list(nodes);
  }

  bnode() {
    return rdflib.bnode();
  }

  sym(uri) {
    return rdflib.sym(uri);
  }
  /* eslint-enable class-methods-use-this */

  any(subject, predicate, object) {
    return this.graphStore.any(subject, predicate, object);
  }

  each(subject, predicate, object) {
    return this.graphStore.each(subject, predicate, object);
  }

  statementsMatching(subject, predicate, object) {
    return this.graphStore.statementsMatching(subject, predicate, object);
  }

  removeMany(subject, predicate, object) {
    return this.graphStore.removeMany(subject, predicate, object);
  }

  parse(data, mimeType, id) {
    return new Promise((resolve, reject) => {
      const cb = (err, parsed) => {
        if (err) {
          return reject(err);
        }
        this.setId(id);
        resolve(parsed);
      };

      try {
        // since we provide a callback then parse becomes async
        rdflib.parse(data, this.graphStore, id, mimeType, cb);
      } catch (err) {
        reject(err);
      }
    });
  }

  add(subject, predicate, object) {
    this.graphStore.add(subject, predicate, object);
  }

  async serialise(mimeType) {
    return new Promise((resolve, reject) => {
      const cb = (err, parsed) => {
        if (err) {
          return reject(err);
        }
        resolve(parsed);
      };
      // TODO: serialise it with compact when it's jsonld. This is
      // currently not possible as it's not supporrted by rdflib.js
      rdflib.serialize(null, this.graphStore, this.id, mimeType, cb);
    });
  }

  /**
  * Commit the RDF document to the underlying MutableData on the network
  * @returns {Promise}
  */
  async commit(toEncrypt = false) {
    const serialJsonLd = await this.serialise(JSON_LD_MIME_TYPE);
    const graphs = JSON.parse(serialJsonLd);
    const entries = await this.mData.getEntries();
    const entriesList = await entries.listEntries();
    const mutation = await this.mData.app.mutableData.newMutation();
    const mData = this.mData;

    const graphPromises = graphs.map(async (graph) => {
      const unencryptedKey = graph[RDF_GRAPH_ID];
      let key = unencryptedKey;

      let match = false;

      // find the current graph in the entries list and remove it
      // (before replacing via the rdf graph) this is to be able to remove any
      // remainging entries (not readded via rdf) as they have been
      // removed from this graph.
      await Promise.all(entriesList.map(async (entry, i) => {
        if (!entry || !entry.key || match) return;

        let keyToCheck = await entry.key.toString();

        if (toEncrypt) {
          try {
            const decryptedKey = await mData.decrypt(entry.key);
            keyToCheck = decryptedKey.toString();
          } catch (e) {
            console.error('Error decrypting MD key in rdf.commit:', e);
          }
        }

        if (unencryptedKey === keyToCheck) {
          delete entriesList[i];

          match = entry;
        }
      }));

      const stringifiedGraph = JSON.stringify(graph);

      if (toEncrypt) {
        key = await mData.encryptKey(key);
      }

      if (match) {
        return mutation.update(key, stringifiedGraph, match.value.version + 1);
      }
      return mutation.insert(key, stringifiedGraph);
    });

    await Promise.all(graphPromises);

    // remove RDF entries which are not present in new RDF
    await entriesList.forEach(async (entry) => {
      if (entry) {
        let keyToCheck = await entry.key.toString();

        if (toEncrypt) {
          try {
            const decryptedKey = await mData.decrypt(entry.key);
            keyToCheck = await decryptedKey.toString();
          } catch (e) {
            console.error('Error decrypting MD key in rdf.commit.', e);
          }
        }

        if (keyToCheck.startsWith('safe://')) {
          await mutation.delete(entry.key, entry.value.version + 1);
        }
      }
    });

    await this.mData.applyEntriesMutation(mutation);
    const nameAndTag = await this.mData.getNameAndTag();
    return nameAndTag;
  }

  /**
  * Append the triples to the RDF document into the underlying MutableData on the network
  * @returns {Promise}
  */
  async append() {
    // TODO: this currently only supports adding graphs with different ID
    const serialJsonLd = await this.serialise(JSON_LD_MIME_TYPE);
    const graphs = JSON.parse(serialJsonLd);
    const mutation = await this.mData.app.mutableData.newMutation();
    graphs.forEach((e) => {
      const key = e[RDF_GRAPH_ID];
      const stringifiedGraph = JSON.stringify(e);
      mutation.insert(key, stringifiedGraph);
    });

    await this.mData.applyEntriesMutation(mutation);
    const nameAndTag = await this.mData.getNameAndTag();
    return nameAndTag;
  }
}

class rdfEmulationFactory {
  /**
  * @private
  * Instantiate the RDF emulation layer wrapping a MutableData instance,
  * hiding the whole RDF emulation class behind the experimental API flag
  *
  * @param {MutableData} mData the MutableData to wrap around
  */
  constructor(mData) {
    /* eslint-disable camelcase, prefer-arrow-callback */
    return EXPOSE_AS_EXPERIMENTAL_API_SYNC.call(mData.app, function RDF_Emulation() {
      return new RDF(mData);
    });
  }
}

module.exports = rdfEmulationFactory;

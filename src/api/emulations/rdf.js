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

const JSON_LD_MIME_TYPE = 'application/ld+json';
const RDF_GRAPH_ID = '@id';

/**
* RDF Emulation on top of a MutableData
*/
class RDF {
  /**
  * @private
  * Instantiate the RDF emulation layer wrapping a MutableData instance
  *
  * @param {MutableData} mData - the MutableData to wrap around
  */
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
  async nowOrWhenFetched(ids) {
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

    let id;
    const entriesGraphs = entriesList.reduce( (graphs, e, i) => {
      const keyStr = e.key.toString();
      const valueStr = e.value.buf.toString();

      // If the entry was soft-deleted skip it
      if (valueStr.length === 0) {
          return graphs;
      }

      if (!id) {
        // FIXME: we need to know which is the main graph in a deterministic way
        if (keyStr === RDF_GRAPH_ID) {
          // incase of compacted.
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
      throw makeError( errConst.MISSING_RDF_ID.code, errConst.MISSING_RDF_ID.msg);
    }

    return Promise.all( entriesGraphs.map( g => this.parse(g, JSON_LD_MIME_TYPE, id) ) )
  }

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
        // console.log('PARSED!?!?!?!?', parsed)
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
      // TODO: serialise it with compact when is jsonld
      rdflib.serialize(null, this.graphStore, this.id, mimeType, cb);
    });
  }

  /**
  * Commit the RDF document to the underlying MutableData on the network
  * @returns {Promise}
  */
  async commit() {
    const serialJsonLd = await this.serialise(JSON_LD_MIME_TYPE);
    const graphs = JSON.parse(serialJsonLd);
    const entries = await this.mData.getEntries();
    const entriesList = await entries.listEntries();
    const mutation = await this.mData.app.mutableData.newMutation();
    graphs.forEach((e, i) => {
      const key = e[RDF_GRAPH_ID];
      // find the current graph in the entries
      const match = entriesList.find((e, i, a) => {
        if (e && key === e.key.toString()) {
          delete a[i];
          return true;
        }
        return false;
      });

      const stringifiedGraph = JSON.stringify(e);
      if (match) {
        mutation.update(key, stringifiedGraph, match.value.version + 1);
      } else {
        mutation.insert(key, stringifiedGraph);
      }
    });

    // remove the entries which are not present in new RDF
    entriesList.forEach((e, i, a) => {
      if (e) {
        mutation.delete(e.key, e.value.version + 1);
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
    graphs.forEach((e, i) => {
      const key = e[RDF_GRAPH_ID];
      const stringifiedGraph = JSON.stringify(e);
      mutation.insert(key, stringifiedGraph);
    });

    await this.mData.applyEntriesMutation(mutation);
    const nameAndTag = await this.mData.getNameAndTag();
    return nameAndTag;
  }
}

module.exports = RDF;

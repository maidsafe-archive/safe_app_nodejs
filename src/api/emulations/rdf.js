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

const JSON_LD_MIME_TYPE = 'application/ld+json';

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
  }

  setId(id) {
    this.id = id;
  }

  async nowOrWhenFetched() {
    const entries = await this.mData.getEntries();
    const entriesList = await entries.listEntries();
    const jsonld = {};
    let id;
    entriesList.forEach((e) => {
      const keyStr = e.key.toString();
      if (keyStr === "@id") {
        id = keyStr;
      }
      const valueStr = e.value.buf.toString();
      let valueObj;
      try {
        valueObj = JSON.parse(valueStr);
      } catch(e) {
        valueObj = valueStr;
      }
      jsonld[keyStr] = valueObj;
    });
    await this.parse(JSON.stringify(jsonld), JSON_LD_MIME_TYPE, id);
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
        resolve(parsed);
      }

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
      }
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
    const jsonld = JSON.parse(serialJsonLd)[0];
    const entries = await this.mData.getEntries();
    let entriesList = await entries.listEntries();
    const mutation = await this.mData.app.mutableData.newMutation();
    for (var key in jsonld) {
      if( jsonld.hasOwnProperty(key) ) {
        // find the current property in the entries
        const match = entriesList.find((e, i, a) => {
          if (e && key === e.key.toString()) {
            delete a[i];
            return true;
          }
          return false;
        });

        if (match) {
          mutation.update(key, JSON.stringify(jsonld[key]), match.value.version + 1);
        } else {
          mutation.insert(key, JSON.stringify(jsonld[key]));
        }
      }
    }

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
}

module.exports = RDF;

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
const { EXPOSE_AS_EXPERIMENTAL_API } = require('../../helpers');

const JSON_LD_MIME_TYPE = 'application/ld+json';
const RDF_GRAPH_ID = '@id';

/**
* Represents an RDF node resource named by an absolute URI property
* @typedef {Object} NamedNode
* @property {String} termType=NamedNode NamedNode
* @property {String} value Absolute URI
* @property {String} uri Absolute URI
*/

/**
* Represents a [blank node](https://en.wikipedia.org/wiki/Blank_node} RDF resource
* @typedef {Object} BlankNode
* @property {String} termType=BlankNode BlankNode
* @property {String} value=n0 n0
* @property {String} id=n0 n0
*/

/**
* Represents an literal RDF node resource such as a noun or date-time
* @typedef {Object} LiteralNode
* @property {String} termType=LiteralNode LiteralNode
* @property {String} value Either string or XSD datatype
* @property {String} [lang] Optional i18n language tag
* @property {NamedNode} [datatype]
*/

/**
* Experimental RDF emulation on top of a {@link MutableData}
* @hideconstructor
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
  /**
   * Sets ID for graph store
   * @param {String} id ID representing current in-memory graph store.
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const rdf = await mData.emulateAs('RDF');
   *     const id = rdf.sym("safe://pluto.astronomy");
   *     rdf.setId(id.uri);
   *     console.log(rdf.id);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  setId(id) {
    this.id = id;
  }

  /**
   * Fetch the RDF data stored in the underlying MutableData on the network
   * and load it in memory to allow manipulating triples before commit them again.
   *
   * @param {Array<String>} ids list of RDF graph IDs to use as a filter for fetching
   * graphs, e.g. ['safe://mywebid.mypubname', 'safe://mypubname']
   * @param {Boolean} [toDecrypt=false] flag to decrypt the data being fetched
   *
   * @throws {ERR_SERIALISING_DESERIALISING|MISSING_RDF_ID}
   * @returns {Promise<Array>}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   *
   * const ids = [];
   * const toEncrypt = false;
   * const toDecrypt = false;
   * const asyncFn = async () => {
   *     try {
   *         const rdf = await mData.emulateAs('RDF');
   *         const id = rdf.sym("safe://pluto.astronomy");
   *         const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *         const triples = [
   *             {
   *                 predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *                 object : DBP('Pluto')
   *             },
   *             {
   *                 predicate : rdf.sym("http://dbpedia.org/property/atmosphereComposition"),
   *                 object : DBP("Methane")
   *             },
   *             {
   *                 predicate : rdf.vocabs.RDF('type'),
   *                 object : DBP("Dwarf_planet")
   *             },
   *             {
   *                 predicate : rdf.sym("http://dbpedia.org/ontology/discovered"),
   *                 object : literalNode
   *             }
   *         ];
   *         // The subject of each triple is the same in this example
   *         triples.forEach( triple => rdf.add(id, triple.predicate, triple.object) );
   *         const nameAndTag = await rdf.commit(toEncrypt);
   *         const entryGraphArray = await rdf.nowOrWhenFetched(ids, toDecrypt);
   *     } catch(err) {
   *         throw err;
   *     }
   * };
   */
  async nowOrWhenFetched(ids, toDecrypt = false) {
    let entriesList = [];
    let entries;

    if (ids && ids.length > 0) {
      const graphsToFetch = (!Array.isArray(ids)) ? [ids] : ids;
      // TODO: support a list of more than one id
      // Promise.all(ids.map(async (e) => {
      const serialisedGraph = await this.mData.get(graphsToFetch[0]);
      entriesList.push({ key: graphsToFetch[0], value: serialisedGraph });
      // }));
    } else {
      entries = await this.mData.getEntries();
      entriesList = await entries.listEntries();
    }

    if (entriesList.length === 0) return;

    let id;
    const validGraphs = await entriesList.reduce(async (graphs, entry) => {
      const reducedGraphs = await graphs;
      let keyStr = entry.key.toString();
      let valueStr = entry.value.buf.toString();
      if (toDecrypt && valueStr.length > 0) {
        try {
          const decryptedKey = await this.mData.decrypt(entry.key);
          keyStr = decryptedKey.toString();
          const decryptedValue = await this.mData.decrypt(entry.value.buf);
          valueStr = decryptedValue.toString();
        } catch (error) {
          if (error.code !== errConst.ERR_SERIALISING_DESERIALISING.code) {
            console.warn('Error decrypting MutableData entry in rdf.nowOrWhenFetched()');
          }
          // ok, let's then assume the entry is not encrypted
          // this maybe temporary, just for backward compatibility,
          // but in the future we should always expect them to be encrpyted
        }
      }

      // If the entry was soft-deleted skip it, or if it's not
      // an RDF graph entry also ignore it
      if (valueStr.length === 0 || !keyStr.startsWith('safe://')) {
        return reducedGraphs;
      }

      if (!id) {
        // FIXME: we need to know which is the main graph in a deterministic way
        // perhaps when we have XOR-URLs we will be able to check a match between
        // this MD's location and the @id value which will be set to the XOR-URL.
        id = JSON.parse(valueStr)[RDF_GRAPH_ID];
      }

      reducedGraphs.push(valueStr);
      return reducedGraphs;
    }, Promise.resolve([]));

    const entriesGraphs = await Promise.all(validGraphs);

    if (!id) {
      // This simply means that none of the existing entries are RDF graphs.
      // We throw the error and it's up to the caller to decide
      // what to do in such an scenario
      throw makeError(errConst.MISSING_RDF_ID.code, errConst.MISSING_RDF_ID.msg);
    }

    return Promise.all(entriesGraphs.map((graph) => this.parse(graph, JSON_LD_MIME_TYPE, id)));
  }

  /**
   * Creates resource namespace prefix and returns function to create {@link NamedNode}.
   * @param {String} uri Absolute namespace URI
   * @returns {function(string): NamedNode}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const rdf = await mData.emulateAs('RDF');
   *     const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *     const dwarfPlanetNodeResource = DBP("Dwarf_planet");
   *     const formerPlanetNodeResource = DBP("Former_planet");
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  namespace(uri) { // eslint-disable-line class-methods-use-this
    return rdflib.Namespace(uri);
  }

  /**
   * @param {String|Number} value Literal value
   * @param {String} languageOrDatatype Either i18n language tag or XSD URI data type
   * @returns {LiteralNode}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const rdf = await mData.emulateAs('RDF');
   *     const discoveryDate = new Date("18 Feb 1930");
   *     const dateTimeDataType = "http://www.w3.org/2001/XMLSchema#dateTime";
   *     let literalNode = rdf.literal(discoveryDate.toISOString(), dateTimeDataType);
   *     console.log( JSON.stringify(literalNode) );
   *
   *     // Alternatively
   *     literalNode = rdf.literal("Aardvark", "en-US");
   *     console.log( JSON.stringify(literalNode) );
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  literal(value, languageOrDatatype) { // eslint-disable-line class-methods-use-this
    return rdflib.literal(value, languageOrDatatype);
  }

  collection(nodes) { // eslint-disable-line class-methods-use-this
    return new rdflib.Collection(nodes);
  }

  /**
   * @returns {BlankNode}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const rdf = await mData.emulateAs('RDF');
   *     const blankNode = rdf.bnode();
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  bnode() { // eslint-disable-line class-methods-use-this
    return rdflib.blankNode();
  }

  /**
   * Creates an RDF resource identified by a URI
   * @returns {NamedNode}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const rdf = await mData.emulateAs('RDF');
   *     const predicateUri = "http://dbpedia.org/ontology/discovered";
   *     const predicateResource = rdf.sym(predicateUri);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  sym(uri) { // eslint-disable-line class-methods-use-this
    return rdflib.sym(uri);
  }

  /**
   * Retrieves one node, the first to match any combination of subject, predicate, or object.
   * A null value is a wildcard.
   * @param {NamedNode|BlankNode|null} [subject] https://www.w3.org/TR/rdf-schema/#ch_subject
   * @param {NamedNode|null} [predicate] https://www.w3.org/TR/rdf-schema/#ch_predicate
   * @param {LiteralNode|NamedNode|null} [object] https://www.w3.org/TR/rdf-schema/#ch_object
   * @param {NamedNode} [provenance] https://www.w3.org/TR/2014/REC-n-quads-20140225/#sec-intro
   * @returns {LiteralNode|BlankNode|NamedNode} Single node resource
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triples = [
   *           {
   *               predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *               object : DBP('Pluto')
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/property/atmosphereComposition"),
   *               object : DBP("Methane")
   *           },
   *           {
   *               predicate : rdf.vocabs.RDF('type'),
   *               object : DBP("Dwarf_planet")
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/ontology/discovered"),
   *               object : literalNode
   *           }
   *       ];
   *       // The subject of each triple is the same in this example
   *       triples.forEach( triple => rdf.add(id, triple.predicate, triple.object) );
   *       const result = rdf.any(subject, predicate, object);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  any(subject, predicate, object, provenance) {
    return this.graphStore.any(subject, predicate, object, provenance);
  }

  /**
   * Retrieves all nodes matching any combination of subject, predicate, or object.
   * A null value is a wildcard.
   * @param {NamedNode|BlankNode|null} [subject] https://www.w3.org/TR/rdf-schema/#ch_subject
   * @param {NamedNode|null} [predicate] https://www.w3.org/TR/rdf-schema/#ch_predicate
   * @param {LiteralNode|NamedNode|null} [object] https://www.w3.org/TR/rdf-schema/#ch_object
   * @param {NamedNode} [provenance] https://www.w3.org/TR/2014/REC-n-quads-20140225/#sec-intro
   * @returns {Array} Turtle document
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triples = [
   *           {
   *               predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *               object : DBP('Pluto')
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/property/atmosphereComposition"),
   *               object : DBP("Methane")
   *           },
   *           {
   *               predicate : rdf.vocabs.RDF('type'),
   *               object : DBP("Dwarf_planet")
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/ontology/discovered"),
   *               object : literalNode
   *           }
   *       ];
   *       // The subject of each triple is the same in this example
   *       triples.forEach( triple => rdf.add(id, triple.predicate, triple.object) );
   *       const result = rdf.each(subject, predicate, object);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  each(subject, predicate, object, provenance) {
    return this.graphStore.each(subject, predicate, object, provenance);
  }

  /**
   * Retrieves all statements matching any combination of subject, predicate, or object.
   * A null value is a wildcard.
   * @param {NamedNode|BlankNode|null} [subject] https://www.w3.org/TR/rdf-schema/#ch_subject
   * @param {NamedNode|null} [predicate] https://www.w3.org/TR/rdf-schema/#ch_predicate
   * @param {LiteralNode|NamedNode|null} [object] https://www.w3.org/TR/rdf-schema/#ch_object
   * @param {NamedNode} [provenance] https://www.w3.org/TR/2014/REC-n-quads-20140225/#sec-intro
   * @returns {Array}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triples = [
   *           {
   *               predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *               object : DBP('Pluto')
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/property/atmosphereComposition"),
   *               object : DBP("Methane")
   *           },
   *           {
   *               predicate : rdf.vocabs.RDF('type'),
   *               object : DBP("Dwarf_planet")
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/ontology/discovered"),
   *               object : literalNode
   *           }
   *       ];
   *       // The subject of each triple is the same in this example
   *       triples.forEach( triple => rdf.add(id, triple.predicate, triple.object) );
   *       const result = rdf.statementsMatching(subject, predicate, object);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  statementsMatching(subject, predicate, object, provenance) {
    return this.graphStore.statementsMatching(subject, predicate, object, provenance);
  }

  /**
   * Remove all statements matching any combination of subject, predicate or object
   * @param {NamedNode|BlankNode|null} [subject] https://www.w3.org/TR/rdf-schema/#ch_subject
   * @param {NamedNode|null} [predicate] https://www.w3.org/TR/rdf-schema/#ch_predicate
   * @param {LiteralNode|NamedNode|null} [object] https://www.w3.org/TR/rdf-schema/#ch_object
   * @param {NamedNode} [provenance] https://www.w3.org/TR/2014/REC-n-quads-20140225/#sec-intro
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triples = [
   *           {
   *               predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *               object : DBP('Pluto')
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/property/atmosphereComposition"),
   *               object : DBP("Methane")
   *           },
   *           {
   *               predicate : rdf.vocabs.RDF('type'),
   *               object : DBP("Dwarf_planet")
   *           },
   *           {
   *               predicate : rdf.sym("http://dbpedia.org/ontology/discovered"),
   *               object : literalNode
   *           }
   *       ];
   *       // The subject of each triple is the same in this example
   *       triples.forEach( triple => rdf.add(id, triple.predicate, triple.object) );
   *       rdf.removeMany(subject, predicate, object);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  removeMany(subject, predicate, object, provenance) {
    return this.graphStore.removeMany(subject, predicate, object, provenance);
  }

  /**
   * Parse serialised RDF data and place into graph store
   * @param {String} data Serialised RDF
   * @param {String} mimeType
   * @param {String} id Arbitrary absolute URI to identify graph
   * @returns {Promise<String>} RDF document according to mime type
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   *   const mimeType = "text/turtle";
   *   const asyncFn = async () => {
   *       try {
   *           const rdf = await mData.emulateAs('RDF');
   *           const id = rdf.sym("safe://pluto.astronomy");
   *           const serialised = `
   *           @prefix : <#>.
   *           @prefix ont: <http://dbpedia.org/ontology/>.
   *           @prefix XML: <http://www.w3.org/2001/XMLSchema#>.
   *           @prefix pro: <http://dbpedia.org/property/>.
   *           @prefix res: <http://dbpedia.org/resource/>.
   *           @prefix n0: <http://www.w3.org/1999/02/22-this-syntax-ns#>.
   *           @prefix thi: <http://www.w3.org/2000/01/this-schema#>.
   *
   *           <>
   *               ont:discovered "1930-02-18T08:00:00.000Z"^^XML:dateTime;
   *               pro:atmosphereComposition res:Methane;
   *               n0:isDefinedBy res:Pluto;
   *               thi:type res:Dwarf_planet.
   *           `;
   *           var parsedData = await rdf.parse(serialised, mimeType, id);
   *       } catch(err) {
   *           throw err;
   *       }
   *       console.log(parsedData);
   *   };
   */
  parse(data, mimeType, id) {
    return new Promise((resolve, reject) => {
      const cb = (err, parsed) => {
        if (err) {
          return reject(err);
        }
        this.setId(id);
        resolve(parsed);
      };

      // since we provide a callback then parse becomes async
      rdflib.parse(data, this.graphStore, id, mimeType, cb);
    });
  }

  /**
   * Adds RDF statement to graph
   * @param {NamedNode|BlankNode|null} [subject] https://www.w3.org/TR/rdf-schema/#ch_subject
   * @param {NamedNode|null} [predicate] https://www.w3.org/TR/rdf-schema/#ch_predicate
   * @param {LiteralNode|NamedNode|null} [object] https://www.w3.org/TR/rdf-schema/#ch_object
   * @param {NamedNode} [provenance] https://www.w3.org/TR/2014/REC-n-quads-20140225/#sec-intro
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triple = {
   *           predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *           object : DBP('Pluto')
   *       };
   *       rdf.add(id, triple.predicate, triple.object)
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  add(subject, predicate, object, provenance) {
    this.graphStore.add(subject, predicate, object, provenance);
  }

  /**
   * Serialise RDF data
   * @param {String} mimeType
   * @returns {Promise<String>} RDF document according to mime type
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const mimeType = "text/turtle";
   * const asyncFn = async () => {
   *     try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triple = {
   *           predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *           object : DBP('Pluto')
   *       };
   *       rdf.add(id, triple.predicate, triple.object)
   *       const serialised = await rdf.serialise(mimeType);
   *     } catch(err) {
   *         throw err;
   *     }
   *     console.log(serialised);
   * };
   */
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
   *
   * @param {Boolean} [toEncrypt=false] flag to encrypt the data to be committed
   * @throws {ERR_SERIALISING_DESERIALISING}
   * @returns {Promise<NameAndTag>}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const toEncrypt = false;
   * const asyncFn = async () => {
   *     try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triple = {
   *           predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *           object : DBP('Pluto')
   *       };
   *       rdf.add(id, triple.predicate, triple.object)
   *       const nameAndTag = await rdf.commit(toEncrypt);
   *     } catch(err) {
   *         throw err;
   *     }
   * };
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
      // remaining entries (not readded via rdf) as they have been
      // removed from this graph.
      await Promise.all(entriesList.map(async (entry, i) => {
        if (!entry || !entry.key || match) return;

        let keyToCheck = entry.key.toString();

        if (toEncrypt) {
          try {
            const decryptedKey = await mData.decrypt(entry.key);
            keyToCheck = decryptedKey.toString();
          } catch (error) {
            if (error.code !== errConst.ERR_SERIALISING_DESERIALISING.code) {
              console.warn('Error decrypting MutableData entry in rdf.commit():', error);
            }
            // ok, let's then assume the entry is not encrypted
            // this maybe temporary, just for backward compatibility,
            // but in the future we should always expect them to be encrpyted
          }
        }

        if (unencryptedKey === keyToCheck) {
          delete entriesList[i];
          match = entry;
        }
      }));

      let stringifiedGraph = JSON.stringify(graph);
      if (toEncrypt) {
        key = await mData.encryptKey(key);
        stringifiedGraph = await mData.encryptValue(stringifiedGraph);
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
        let keyToCheck = entry.key.toString();

        if (toEncrypt) {
          try {
            const decryptedKey = await mData.decrypt(entry.key);
            keyToCheck = decryptedKey.toString();
          } catch (error) {
            if (error.code !== errConst.ERR_SERIALISING_DESERIALISING.code) {
              console.warn('Error decrypting MutableData entry in rdf.commit():', error);
            }
            // ok, let's then assume the entry is not encrypted
            // this maybe temporary, just for backward compatibility,
            // but in the future we should always expect them to be encrpyted
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
  * @returns {Promise<NameAndTag>}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const toEncrypt = false;
   * const asyncFn = async () => {
   *     try {
   *       const rdf = await mData.emulateAs('RDF');
   *       const id = rdf.sym("safe://pluto.astronomy");
   *       const subject = id;
   *       const predicate = null;
   *       const object = null;
   *       const DBP = rdf.namespace( 'http://dbpedia.org/resource/' );
   *       const triple = {
   *           predicate : rdf.vocabs.RDFS('isDefinedBy'),
   *           object : DBP('Pluto')
   *       };
   *       rdf.add(id, triple.predicate, triple.object)
   *       let nameAndTag = await rdf.commit(toEncrypt);
   *       rdf.add(id, triple.predicate, triple.object)
   *       const newTriple = {
   *           predicate : rdf.vocabs.RDF('type'),
   *           object : DBP("Dwarf_planet")
   *       };
   *       rdf.add(id, newTriple.predicate, newTriple.object)
   *       nameAndTag = await rdf.append();
   *     } catch(err) {
   *         throw err;
   *     }
   * };
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
    return EXPOSE_AS_EXPERIMENTAL_API.call(mData.app, function RDF_Emulation() {
      return new RDF(mData);
    });
  }
}

module.exports = rdfEmulationFactory;

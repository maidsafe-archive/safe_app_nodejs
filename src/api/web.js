const lib = require('../native/lib');
const nativeH = require('../native/helpers');
const errConst = require('../error_const');
const consts = require('../consts');
const makeError = require('../native/_error.js');

const { parse: parseUrl } = require('url');


const RDF_TYPE_TAG = 15639;


/**
* Interact with RDF Data of the Network through this Interface.
*
* Access it through your {SAFEApp} instance under `app.immutableData`
*/
class WebInterface {
  /**
  * @private
  * @param {SAFEApp} app
  */
  constructor(app) {
    this.app = app;
  }

  getVocabs(rdf) {
    return {
      LDP: rdf.namespace('http://www.w3.org/ns/ldp#'),
      RDF: rdf.namespace('http://www.w3.org/2000/01/rdf-schema#'),
      RDFS: rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
      FOAF: rdf.namespace('http://xmlns.com/foaf/0.1/'),
      OWL: rdf.namespace('http://www.w3.org/2002/07/owl#'),
      DCTERMS: rdf.namespace('http://purl.org/dc/terms/'),
      SAFETERMS: rdf.namespace('http://safenetwork.org/safevocab/')
    };
  }

  async createPublicName( publicName, subdomainsRdfLocation) {
    if( typeof subdomainsRdfLocation !== 'object' ||
        !subdomainsRdfLocation.name || !subdomainsRdfLocation.typeTag )
    {

      throw makeError(errConst.INVALID_RDF_LOCATION.code, errConst.INVALID_RDF_LOCATION.msg )
    }

    if( typeof publicName !== 'string' ) throw makeError(errConst.INVALID_URL.code, errConst.INVALID_URL.msg )

    const app = this.app;

    const publicNamesContainer = await app.auth.getContainer('_publicNames');
    const publicNamesRdf = publicNamesContainer.emulateAs('rdf');

    const vocabs = this.getVocabs(publicNamesRdf);

    const graphName = 'safe://_publicNames'; // TODO: this graph name is not a valid URI on the SAFE network
    const id = publicNamesRdf.sym(graphName);
    publicNamesRdf.setId(graphName);
    const graphNameWithHashTag = publicNamesRdf.sym(`${graphName}#it`);
    const newResourceName = publicNamesRdf.sym(`${graphName}#${publicName}`);

    publicNamesRdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
    publicNamesRdf.add(id, vocabs.LDP('membershipResource'), graphNameWithHashTag);
    publicNamesRdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasPublicName'));
    publicNamesRdf.add(id, vocabs.DCTERMS('title'), publicNamesRdf.literal('_publicNames default container'));
    publicNamesRdf.add(id, vocabs.DCTERMS('description'), publicNamesRdf.literal('Container to keep track of public names owned by the account'));
    publicNamesRdf.add(id, vocabs.LDP('contains'), newResourceName);

    publicNamesRdf.add(graphNameWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('PublicNames'));
    publicNamesRdf.add(graphNameWithHashTag, vocabs.DCTERMS('title'), publicNamesRdf.literal('Public names owned by an account'));
    publicNamesRdf.add(graphNameWithHashTag, vocabs.SAFETERMS('hasPublicName'), newResourceName);

    publicNamesRdf.add(newResourceName, vocabs.RDFS('type'), vocabs.SAFETERMS('PublicName'));
    publicNamesRdf.add(newResourceName, vocabs.DCTERMS('title'), publicNamesRdf.literal(`'${publicName}' public name`));
    publicNamesRdf.add(newResourceName, vocabs.SAFETERMS('xorName'), publicNamesRdf.literal(subdomainsRdfLocation.name.toString()));
    publicNamesRdf.add(newResourceName, vocabs.SAFETERMS('typeTag'), publicNamesRdf.literal(subdomainsRdfLocation.typeTag.toString()));


    await publicNamesRdf.commit();
  }

  /**
   * Return an Array of publicNames
   * @return {Promise} Returns <Array> of PublicNames
   */
  async getPublicNames() {
    const pubNamesCntr = await this.app.auth.getContainer('_publicNames');

    const entries = await pubNamesCntr.getEntries();
    const entriesList = await entries.listEntries();

    const publicNamesArray = [];
    // TODO: Encrypt/Decrypting.
    entriesList.forEach((entry) => {
      const key = entry.key.toString();
      const value = entry.value.buf.toString();
      console.log('Key: ', key);
      console.log('Value: ', value);
      publicNamesArray.push(key);
    });

    return publicNamesArray;
  }

}


module.exports = WebInterface;

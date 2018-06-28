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

  /**
   * Retrieve vocab for RDF/SAFE Implementation of DNS (publicNames/subDomains/services)
   * @param  {RDF} rdf RDF object to utilise for namespace func
   * @return {Object}  object containing keys with RDF namespace values.
   */
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

  /**
   * Add entry to _publicNames container, linking to a specific RDF/MD
   * object for subdomain discovery/service resolution.catch
   * @param  {String}  publicName            string, valid URL
   * @param  {Object}  subdomainsRdfLocation MutableData name/typeTag
   * @return {Promise}                       resolves upon commit of data to _publicNames
   */
  async createPublicName(publicName, subdomainsRdfLocation) {
    if (typeof subdomainsRdfLocation !== 'object' ||
        !subdomainsRdfLocation.name || !subdomainsRdfLocation.typeTag) {
      throw makeError(errConst.INVALID_RDF_LOCATION.code, errConst.INVALID_RDF_LOCATION.msg);
    }

    if (typeof publicName !== 'string') throw makeError(errConst.INVALID_URL.code, errConst.INVALID_URL.msg);

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

  async addServiceToSubdomain(subdomain, publicName, serviceLocation) {

    if (typeof subdomain !== 'string') throw makeError(errConst.INVALID_SUBDOMAIN.code, errConst.INVALID_SUBDOMAIN.msg);
    if (typeof publicName !== 'string') throw makeError(errConst.INVALID_URL.code, errConst.INVALID_URL.msg);

    if (typeof serviceLocation !== 'object' ||
        !serviceLocation.name || !serviceLocation.typeTag) {
      throw makeError(errConst.INVALID_RDF_LOCATION.code, errConst.INVALID_RDF_LOCATION.msg);
    }


    const app = this.app;
    const subdomainLocation = await app.crypto.sha3Hash(publicName);
    const subdomainsContainer =
      await app.mutableData.newPublic(subdomainLocation, consts.TAG_TYPE_DNS);

    try {
      await subdomainsContainer.quickSetup();
    } catch (err) {
      // If the subdomain container already exists we are then ok
      if (err.code !== errConst.ERR_DATA_GIVEN_ALREADY_EXISTS.code) {
        throw err;
      }
    }

    const subdomainsRdf = subdomainsContainer.emulateAs('rdf');
    const vocabs = this.getVocabs(subdomainsRdf);

    // add to or create subdomain container.
    const fullUri = `safe://${publicName}`;
    // TODO: parse the uri to extract the subdomain

    const id = subdomainsRdf.sym(fullUri);
    subdomainsRdf.setId(fullUri);
    const uriWithHashTag = subdomainsRdf.sym(`${fullUri}#it`);
    const serviceResource = subdomainsRdf.sym(`safe://${subdomain}.${publicName}`);

    subdomainsRdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
    subdomainsRdf.add(id, vocabs.LDP('membershipResource'), uriWithHashTag);
    subdomainsRdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasService'));
    subdomainsRdf.add(id, vocabs.DCTERMS('title'), subdomainsRdf.literal(`Services Container for subdomain: '${publicName}'`));
    subdomainsRdf.add(id, vocabs.DCTERMS('description'), subdomainsRdf.literal('List of public services exposed by a particular subdomain'));
    subdomainsRdf.add(id, vocabs.LDP('contains'), serviceResource);

    subdomainsRdf.add(uriWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('Services'));
    subdomainsRdf.add(uriWithHashTag, vocabs.DCTERMS('title'), subdomainsRdf.literal(`Services available for subdomain: '${publicName}'`));
    subdomainsRdf.add(uriWithHashTag, vocabs.SAFETERMS('hasService'), serviceResource);

    subdomainsRdf.add(serviceResource, vocabs.RDFS('type'), vocabs.SAFETERMS('Service'));
    subdomainsRdf.add(serviceResource, vocabs.DCTERMS('title'), subdomainsRdf.literal(`'${subdomain}' service`));
    subdomainsRdf.add(serviceResource, vocabs.SAFETERMS('xorName'), subdomainsRdf.literal(serviceLocation.name.toString()));
    subdomainsRdf.add(serviceResource, vocabs.SAFETERMS('typeTag'), subdomainsRdf.literal(serviceLocation.typeTag.toString()));

    const location = subdomainsRdf.commit();

    return location;
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

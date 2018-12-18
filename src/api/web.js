const errConst = require('../error_const');
const consts = require('../consts');
const makeError = require('../native/_error.js');
const { parse: parseUrl } = require('url');

const PUBLIC_NAMES_CONTAINER = '_publicNames';
const PUBLIC_CONTAINER = '_public';

const cleanRdfValue = (value) => {
  let cleanValue = value;

  if (Array.isArray(value) && value.length === 1) {
    cleanValue = value[0];
  }

  if (cleanValue['@value']) {
    cleanValue = cleanValue['@value'];
  }

  return cleanValue;
};

// make this usefullll..... so, purposefully pull out useful, but ignore RDF....
const flattenWebId = (theData, rootTerm) => {
  const newObject = {
    '@id': rootTerm
  };

  theData.forEach((graph) => {
    const graphId = graph['@id'];
    if (graphId === rootTerm) {
      newObject['@type'] = cleanRdfValue(graph['@type']);
      return;
    }

    // split.pop maybe unneeded...
    const strippedGraphID = graphId.replace(rootTerm, '').split('/').pop();

    newObject[strippedGraphID] = {};

    Object.keys(graph).forEach((key) => {
      const cleanKey = key.split('/').pop();
      const cleanValue = cleanRdfValue(graph[key]);
      newObject[strippedGraphID][cleanKey] = cleanValue;
    });
  });
  return newObject;
};

/**
* Manage Web RDF Data
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
   * @example
   * const rdf = mData.emulateAs('RDF');
   * const vocabs = app.web.getVocabs(rdf);
   */
  getVocabs(rdf) { // eslint-disable-line class-methods-use-this
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
   * object for subName discovery/service resolution
   * @param  {String} publicName public name string, valid URL
   * @param  {NameAndTag} subNamesRdfLocation MutableData name/typeTag object
   * @throws {INVALID_RDF_LOCATION|INVALID_URL}
   * @return {Promise} resolves upon commit of data to _publicNames
   * @example
   * const asyncFn = async () => {
   *     try {
   *         const networkResource = await app.fetch('safe://hyfktce85xaif4kdamgnd16uho3w5z7peeb5zeho836uoi48tgkgbc55bco:30303');
   *         const nameAndTag = await networkResource.content.getNameAndTag();
   *         const publicName = 'safedev';
   *         const subNamesRdfLocation = nameAndTag;
   *         await app.web.addPublicNameToDirectory(publicName, subNamesRdfLocation);
   *     } catch(err) {
   *         throw err;
   *     }
   * };
   */
  async addPublicNameToDirectory(publicName, subNamesRdfLocation) {
    if (typeof subNamesRdfLocation !== 'object' ||
        !subNamesRdfLocation.name || !subNamesRdfLocation.typeTag) {
      throw makeError(errConst.INVALID_RDF_LOCATION.code, errConst.INVALID_RDF_LOCATION.msg);
    }

    if (typeof publicName !== 'string') throw makeError(errConst.INVALID_URL.code, errConst.INVALID_URL.msg);

    const app = this.app;

    const publicNamesContainer = await app.auth.getContainer(PUBLIC_NAMES_CONTAINER);
    const publicNamesRdf = publicNamesContainer.emulateAs('rdf');

    // Here we do basic container setup for RDF entries.
    // Doesn't matter if already existing, will just write same entries.
    const graphName = `safe://${PUBLIC_NAMES_CONTAINER}`; // TODO: this graph name is not a valid URI on the SAFE network
    const id = publicNamesRdf.sym(graphName);
    const graphNameWithHashTag = publicNamesRdf.sym(`${graphName}#it`);
    const newResourceName = publicNamesRdf.sym(`${graphName}#${publicName}`);

    publicNamesRdf.setId(graphName);
    try {
      const toDecrypt = true;
      await publicNamesRdf.nowOrWhenFetched(null, toDecrypt);
    } catch (e) {
      // ignore no ID set in case nothing has been added yet
      if (e.code !== errConst.MISSING_RDF_ID.code) {
        throw new Error({ code: e.code, message: e.message });
      }
    }

    const vocabs = this.getVocabs(publicNamesRdf);
    publicNamesRdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
    publicNamesRdf.add(id, vocabs.LDP('membershipResource'), graphNameWithHashTag);
    publicNamesRdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasPublicName'));
    publicNamesRdf.add(id, vocabs.DCTERMS('title'), publicNamesRdf.literal(`${PUBLIC_NAMES_CONTAINER} default container`));
    publicNamesRdf.add(id, vocabs.DCTERMS('description'), publicNamesRdf.literal('Container to keep track of public names owned by the account'));
    publicNamesRdf.add(id, vocabs.LDP('contains'), newResourceName);

    publicNamesRdf.add(graphNameWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('PublicNames'));
    publicNamesRdf.add(graphNameWithHashTag, vocabs.DCTERMS('title'), publicNamesRdf.literal('Public names owned by an account'));
    publicNamesRdf.add(graphNameWithHashTag, vocabs.SAFETERMS('hasPublicName'), newResourceName);

    // and adding the actual name.
    publicNamesRdf.add(newResourceName, vocabs.RDFS('type'), vocabs.SAFETERMS('PublicName'));
    publicNamesRdf.add(newResourceName, vocabs.DCTERMS('title'), publicNamesRdf.literal(`'${publicName}' public name`));
    publicNamesRdf.add(newResourceName, vocabs.SAFETERMS('xorName'), publicNamesRdf.literal(subNamesRdfLocation.name.toString()));
    publicNamesRdf.add(newResourceName, vocabs.SAFETERMS('typeTag'), publicNamesRdf.literal(subNamesRdfLocation.typeTag.toString()));

    const encryptThis = true;
    await publicNamesRdf.commit(encryptThis);
  }

  /**
   * Links a service/resource to a publicName, with a provided subName
   * @param {String} subName
   * @param {String} publicName
   * @param {NameAndTag} serviceLocation
   *
   * @throws {INVALID_SUBNAME|INVALID_PUBNAME|INVALID_RDF_LOCATION|ERR_DATA_GIVEN_ALREADY_EXISTS}
   * @return {Promise<Object>} Resolves to an object with xorname and
   * typeTag of the publicName RDF location
   */
  async linkServiceToSubname(subName, publicName, serviceLocation) {
    if (typeof subName !== 'string') throw makeError(errConst.INVALID_SUBNAME.code, errConst.INVALID_SUBNAME.msg);
    if (typeof publicName !== 'string') throw makeError(errConst.INVALID_PUBNAME.code, errConst.INVALID_PUBNAME.msg);

    if (typeof serviceLocation !== 'object' ||
        !serviceLocation.name || !serviceLocation.typeTag) {
      throw makeError(errConst.INVALID_RDF_LOCATION.code, errConst.INVALID_RDF_LOCATION.msg);
    }

    const app = this.app;
    const subNamesContLocation = await app.crypto.sha3Hash(publicName);
    const subNamesContainer =
      await app.mutableData.newPublic(subNamesContLocation, consts.TAG_TYPE_DNS);

    let makeContainerStructure = false;
    const subNamesRdf = subNamesContainer.emulateAs('rdf');

    try {
      await subNamesContainer.quickSetup();
    } catch (err) {
      // If the subNames container already exists we are then ok
      if (err.code !== errConst.ERR_DATA_GIVEN_ALREADY_EXISTS.code) {
        throw err;
      }
      // We need to only add a service rather than populating it
      // with the whole LDP Container structure.
      // TODO: This first version we assume that it contains the
      // LDP Container definitions if the container exists, but
      // this is not good enough in the future
      makeContainerStructure = true;
      await subNamesRdf.nowOrWhenFetched();
    }

    const vocabs = this.getVocabs(subNamesRdf);
    const fullUri = `safe://${publicName}`;

    const id = subNamesRdf.sym(fullUri);
    subNamesRdf.setId(fullUri);
    const uriWithHashTag = subNamesRdf.sym(`${fullUri}#it`);
    const serviceResource = subNamesRdf.sym(`safe://${subName}.${publicName}`);

    if (makeContainerStructure) {
      // Add the triples which define the LDP Container first.
      subNamesRdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
      subNamesRdf.add(id, vocabs.LDP('membershipResource'), uriWithHashTag);
      subNamesRdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasService'));
      subNamesRdf.add(id, vocabs.DCTERMS('title'), subNamesRdf.literal(`Services Container for subName: '${publicName}'`));
      subNamesRdf.add(id, vocabs.DCTERMS('description'), subNamesRdf.literal('List of public services exposed by a particular subName'));

      subNamesRdf.add(uriWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('Services'));
      subNamesRdf.add(uriWithHashTag, vocabs.DCTERMS('title'), subNamesRdf.literal(`Services available for subName: '${publicName}'`));
    }

    // Now add the triples specific for the new service
    subNamesRdf.add(id, vocabs.LDP('contains'), serviceResource);

    subNamesRdf.add(uriWithHashTag, vocabs.SAFETERMS('hasService'), serviceResource);

    subNamesRdf.add(serviceResource, vocabs.RDFS('type'), vocabs.SAFETERMS('Service'));
    subNamesRdf.add(serviceResource, vocabs.DCTERMS('title'), subNamesRdf.literal(`'${subName}' service`));
    subNamesRdf.add(serviceResource, vocabs.SAFETERMS('xorName'), subNamesRdf.literal(serviceLocation.name.toString()));
    subNamesRdf.add(serviceResource, vocabs.SAFETERMS('typeTag'), subNamesRdf.literal(serviceLocation.typeTag.toString()));

    const location = await subNamesRdf.commit();

    return location;
  }

  /**
   * Return an Array of publicNames
   * @return {Promise<Array>} Returns array of PublicNames
   */
  async getPublicNames() {
    const pubNamesCntr = await this.app.auth.getContainer(PUBLIC_NAMES_CONTAINER);

    const entries = await pubNamesCntr.getEntries();
    const entriesList = await entries.listEntries();

    const publicNamesArray = [];
    await Promise.all(entriesList.map(async (entry) => {
      const key = await pubNamesCntr.decrypt(entry.key);
      const keyString = await key.toString();

      if (!keyString.startsWith(`safe://${PUBLIC_NAMES_CONTAINER}`)) return;

      publicNamesArray.push(keyString);
    }));

    return publicNamesArray;
  }

  /**
   * Adds a WebID to the '_public' container, using
   * @param  {String}  webIdUri name/typetag object from SAFE MD.
   * @param  {String}  displayName   optional displayName which will be used when listing webIds.
   * @throws {INVALID_URL|MISSING_RDF_ID}
   */
  async addWebIdToDirectory(webIdUri, displayName) {
    if (typeof webIdUri !== 'string') {
      throw makeError(errConst.INVALID_URL.code, errConst.INVALID_URL.msg);
    }

    const directory = await this.app.auth.getContainer(PUBLIC_CONTAINER);
    const directoryRDF = directory.emulateAs('rdf');
    const vocabs = this.getVocabs(directoryRDF);
    const graphName = `safe://${PUBLIC_CONTAINER}/webId`; // TODO: this graph name is not a valid URI on the SAFE network
    const id = directoryRDF.sym(graphName);
    directoryRDF.setId(graphName);

    try {
      await directoryRDF.nowOrWhenFetched();
    } catch (e) {
      // ignore no ID set in case nothing has been added yet
      if (e.code !== errConst.MISSING_RDF_ID.code) {
        throw new Error({ code: e.code, message: e.message });
      }
    }

    directoryRDF.add(id, vocabs.DCTERMS('title'), directoryRDF.literal(`${PUBLIC_CONTAINER} default container`));
    directoryRDF.add(id, vocabs.DCTERMS('description'), directoryRDF.literal('Container to keep track of public data for the account'));

    const hostname = parseUrl(webIdUri).hostname;
    const newResourceName = directoryRDF.sym(`${graphName}/${hostname}`);

    directoryRDF.add(newResourceName, vocabs.DCTERMS('identifier'), vocabs.FOAF(`safe://${PUBLIC_CONTAINER}/webId/${hostname}`));
    directoryRDF.add(newResourceName, vocabs.RDFS('type'), vocabs.FOAF('PersonalProfileDocument'));
    directoryRDF.add(newResourceName, vocabs.DCTERMS('title'), directoryRDF.literal(`${displayName || ''}`));
    directoryRDF.add(newResourceName, vocabs.SAFETERMS('uri'), directoryRDF.literal(webIdUri));
    directoryRDF.add(newResourceName, vocabs.SAFETERMS('typeTag'), directoryRDF.literal(webIdUri));

    await directoryRDF.commit();
  }

  /**
   * Retrieve all webIds. Currently as array of JSON objects...
   *
   * @return {Promise<Array>} Resolves to array of webIds objects.
   */
  async getWebIds() {
    const directory = await this.app.auth.getContainer(PUBLIC_CONTAINER);
    const entries = await directory.getEntries();
    const entriesList = await entries.listEntries();

    const webIds = await entriesList.filter((entry) => {
      const key = entry.key.toString();
      const value = entry.value.buf.toString();

      return key.includes('/webId/') && value.length;
    }).map(async (entry) => {
      const value = entry.value.buf.toString();
      // parsing to get something to work with as RDF is not that helpful...
      // perhaps sparql is needed to get it all...
      // perhaps this is what we should be doing.. parsing out to being helpful?
      // probably can be simplified via jsonLD compact encoding etc.
      const json = JSON.parse(value);
      const uri = json['http://safenetwork.org/safevocab/uri'][0]['@value'];

      try {
        const response = await this.app.webFetch(uri, { accept: 'application/ld+json' });
        const data = JSON.parse(response.body);
        const initialId = data[0]['@id'];
        const flatVersion = flattenWebId(data, initialId);
        return flatVersion;
      } catch (e) {
        // WebID not found at specified URI
        return null;
      }
    });

    const list = await Promise.all(webIds);
    return list.filter((entry) => (entry !== null));
  }
}

module.exports = WebInterface;

const lib = require('../native/lib');
const nativeH = require('../native/helpers');
// const types = require('../native/types');
// const { useMockByDefault } = require('../helpers');
// // const { validateShareMDataPermissions } = require('../helpers');
const errConst = require('../error_const');
const consts = require('../consts');
const makeError = require('../native/_error.js');

const { parse: parseUrl } = require('url');

// const makeAppInfo = nativeH.makeAppInfo;
// const makePermissions = nativeH.makePermissions;
// const makeShareMDataPermissions = nativeH.makeShareMDataPermissions;



// Helper for recording public names in the _publicNames container as an RDF resource
const recordInPublicNames = async (rdf, vocabs, servicesLocation, publicName) => {
  const graphName = 'safe://_publicNames'; // TODO: this graph name is not a valid URI on the SAFE network
  const id = rdf.sym(graphName);
  rdf.setId(graphName);
  const graphNameWithHashTag = rdf.sym(`${graphName}#it`);
  const newResourceName = rdf.sym(`${graphName}#${publicName}`);

  rdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
  rdf.add(id, vocabs.LDP('membershipResource'), graphNameWithHashTag);
  rdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasPublicName'));
  rdf.add(id, vocabs.DCTERMS('title'), rdf.literal('_publicNames default container'));
  rdf.add(id, vocabs.DCTERMS('description'), rdf.literal('Container to keep track of public names owned by the account'));
  rdf.add(id, vocabs.LDP('contains'), newResourceName);

  rdf.add(graphNameWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('PublicNames'));
  rdf.add(graphNameWithHashTag, vocabs.DCTERMS('title'), rdf.literal('Public names owned by an account'));
  rdf.add(graphNameWithHashTag, vocabs.SAFETERMS('hasPublicName'), newResourceName);

  rdf.add(newResourceName, vocabs.RDFS('type'), vocabs.SAFETERMS('PublicName'));
  rdf.add(newResourceName, vocabs.DCTERMS('title'), rdf.literal(`'${publicName}' public name`));
  rdf.add(newResourceName, vocabs.SAFETERMS('xorName'), rdf.literal(servicesLocation.name.toString()));
  rdf.add(newResourceName, vocabs.SAFETERMS('typeTag'), rdf.literal(servicesLocation.typeTag.toString()));

  console.log('done recodring in public')
  //const serialised = await rdf.serialise('text/turtle');
  //const serialised = await rdf.serialise('application/ld+json');
  //console.log("PUBLIC NAMES:", serialised)
}



// Helper for creating a Public ID container as an RDF resource
const createPublicId = async (rdf, vocabs, servicesLocation, publicName, serviceName) => {
  const publicIdUri = `safe://${publicName}`; // TODO: parse the uri to extract the public ID

  const id = rdf.sym(publicIdUri);
  rdf.setId(publicIdUri);
  const publicIdWithHashTag = rdf.sym(`${publicIdUri}#it`);
  const serviceResource = rdf.sym(`safe://${serviceName}.${publicName}`);

  rdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
  rdf.add(id, vocabs.LDP('membershipResource'), publicIdWithHashTag);
  rdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasService'));
  rdf.add(id, vocabs.DCTERMS('title'), rdf.literal(`Services Container for public ID '${publicName}'`));
  rdf.add(id, vocabs.DCTERMS('description'), rdf.literal('List of public services exposed by a particular public ID'));
  rdf.add(id, vocabs.LDP('contains'), serviceResource);

  rdf.add(publicIdWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('Services'));
  rdf.add(publicIdWithHashTag, vocabs.DCTERMS('title'), rdf.literal(`Services available for public ID '${publicName}'`));
  rdf.add(publicIdWithHashTag, vocabs.SAFETERMS('hasService'), serviceResource);

  rdf.add(serviceResource, vocabs.RDFS('type'), vocabs.SAFETERMS('Service'));
  rdf.add(serviceResource, vocabs.DCTERMS('title'), rdf.literal(`'${serviceName}' service`));
  rdf.add(serviceResource, vocabs.SAFETERMS('xorName'), rdf.literal(servicesLocation.name.toString()));
  rdf.add(serviceResource, vocabs.SAFETERMS('typeTag'), rdf.literal(servicesLocation.typeTag.toString()));
  //const serialised = await rdf.serialise('text/turtle');
  //const serialised = await rdf.serialise('application/ld+json');
  //console.log("PUBLIC ID STORED:", serialised)
}

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

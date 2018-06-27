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

const consts = require('../../consts');
const errConst = require('../../error_const');
const { parse: parseUrl } = require('url');

// TODO: perhaps we want a set of functions which are LDPC helpers,
// so we can have them provide us all it's needed if in the future
// we want to expose an LDP RESTFul API in the webFetch.
// postRDF(contentType, data, slug?, linkHeader?, parentLDPC?)
// putRDF(contentType, data, slug?, linkHeader?, parentLDPC?)
// deleteRDF(contentType, data, slug?, linkHeader?, parentLDPC?)
//
// where linkHeader can be:
// to create an LDP-BC: <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"
// to create an LDP-RS: <http://www.w3.org/ns/ldp#Resource>; rel="type"
// to create an LDP-DC: <http://www.w3.org/ns/ldp#DirectContainer>; rel="type"
// to create an LDP-IC: <http://www.w3.org/ns/ldp#IndirectContainer>; rel="type"
//
// and where contentType can be RDF format or something else:
// if it's RDF we use RDF emulation
// it it's something else we store it as ImmutableData
//
// and "eTag"/"If-Match" headers might be needed and generated
// from a hash of the MD's version


// Helper for creating a WebID profile document RDF resource
const createWebIdProfileDoc = async (rdf, vocabs, profile) => {
  const id = rdf.sym(profile.uri);
  rdf.setId(profile.uri);
  const webIdWithHashTag = rdf.sym(`${profile.uri}#me`);

  rdf.add(id, vocabs.RDFS('type'), vocabs.FOAF('PersonalProfileDocument'));
  rdf.add(id, vocabs.DCTERMS('title'), rdf.literal(`${profile.name}'s profile document`));
  rdf.add(id, vocabs.FOAF('maker'), webIdWithHashTag);
  rdf.add(id, vocabs.FOAF('primaryTopic'), webIdWithHashTag);

  rdf.add(webIdWithHashTag, vocabs.RDFS('type'), vocabs.FOAF('Person'));
  rdf.add(webIdWithHashTag, vocabs.FOAF('name'), rdf.literal(profile.name));
  rdf.add(webIdWithHashTag, vocabs.FOAF('nick'), rdf.literal(profile.nickname));
  rdf.add(webIdWithHashTag, vocabs.FOAF('image'), rdf.literal(profile.avatar)); // TODO: this needs to be created as an LDP-NR
  rdf.add(webIdWithHashTag, vocabs.FOAF('website'), rdf.literal(profile.website));

  const location = await rdf.commit();

  return location;
  // const serialised = await rdf.serialise('text/turtle');
  // const serialised = await rdf.serialise('application/ld+json');
  // console.log("PROFILE:", serialised)
};

// Helper for creating a Public ID container as an RDF resource
const addServiceAndSubdomain = async (app, vocabs, service, publicName, subdomain) => {
  const subdomainLocation = await app.crypto.sha3Hash(publicName);

  const subdomainsContainer = await app.mutableData.newPublic(subdomainLocation, consts.TAG_TYPE_DNS);
  try {
    await subdomainsContainer.quickSetup();
  } catch (err) {
    // If the subdomain container already exists we are then ok
    if (err.code !== errConst.ERR_DATA_GIVEN_ALREADY_EXISTS.code) {
      throw err;
    }
  }
  const subdomainsRdf = subdomainsContainer.emulateAs('rdf');


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
  subdomainsRdf.add(serviceResource, vocabs.SAFETERMS('xorName'), subdomainsRdf.literal(service.name.toString()));
  subdomainsRdf.add(serviceResource, vocabs.SAFETERMS('typeTag'), subdomainsRdf.literal(service.typeTag.toString()));

  const location = subdomainsRdf.commit();

  return location;
  // const serialised = await rdf.serialise('text/turtle');
  // const serialised = await rdf.serialise('application/ld+json');
  // console.log("PUBLIC ID STORED:", serialised)
};

// Helper for recording public names in the _publicNames container as an RDF resource
const addToPublicNames = async (app, vocabs, subdomainsRdfLocation, publicName) => {
  const publicNamesContainer = await app.auth.getContainer('_publicNames');
  const publicNamesRdf = publicNamesContainer.emulateAs('rdf');


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

  // const serialised = await rdf.serialise('text/turtle');
  // const serialised = await rdf.serialise('application/ld+json');
  // console.log("PUBLIC NAMES:", serialised)
};

/**
* WebID Emulation on top of a MutableData using RDF emulation
*/
class WebID {
  /**
  * @private
  * Instantiate the WebID emulation layer wrapping a MutableData instance,
  * while making use of the RDF emulation to manipulate the MD entries
  *
  * @param {MutableData} mData - the MutableData to wrap around
  */
  constructor(mData) {
    this.mData = mData;
    this.rdf = this.mData.emulateAs('rdf');
    this.vocabs = {
      LDP: this.rdf.namespace('http://www.w3.org/ns/ldp#'),
      RDF: this.rdf.namespace('http://www.w3.org/2000/01/rdf-schema#'),
      RDFS: this.rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
      FOAF: this.rdf.namespace('http://xmlns.com/foaf/0.1/'),
      OWL: this.rdf.namespace('http://www.w3.org/2002/07/owl#'),
      DCTERMS: this.rdf.namespace('http://purl.org/dc/terms/'),
      SAFETERMS: this.rdf.namespace('http://safenetwork.org/safevocab/')
    };
  }

  async fetchContent() {
    await this.rdf.nowOrWhenFetched();
  }

  async create(profile) {
    const app = this.mData.app;

    // TODO: support for URIs containing a path, e.g. safe://mywebid.gabriel/card
    // We may need to create an NFS container to reference it?
    const parsedUrl = parseUrl(profile.uri);
    const hostParts = parsedUrl.hostname.split('.');
    const publicName = hostParts.pop(); // last one is 'domain'
    const subdomain = hostParts.join('.'); // all others are 'service'

    // TODO: Do we create the md in here? Is it needed quicksetup outside?
    const webIdLocation = await createWebIdProfileDoc(this.rdf, this.vocabs, profile);

    const subdomainsRdfLocation = await addServiceAndSubdomain(app, this.vocabs, webIdLocation, publicName, subdomain);

    await addToPublicNames(app, this.vocabs, subdomainsRdfLocation, publicName);
  }

  async update(profile) {
    this.rdf.removeMany(undefined, undefined, undefined);
    await createWebIdProfileDoc(this.rdf, this.vocabs, profile);
    const webIdLocation = await this.rdf.commit();
  }

  async serialise(mimeType) {
    const serialised = await this.rdf.serialise(mimeType);
    return serialised;
  }
}

module.exports = WebID;

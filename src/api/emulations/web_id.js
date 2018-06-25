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
const createProfileDoc = async (rdf, vocabs, profile) => {
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

  const serialised = await rdf.serialise('text/turtle');
  //const serialised = await rdf.serialise('application/ld+json');
  console.log("PROFILE:", serialised)
}

// Helper for creating a Public ID container as an RDF resource
const createPublicId = async (rdf, vocabs, webIdLocation, publicName, serviceName) => {
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
  rdf.add(serviceResource, vocabs.SAFETERMS('xorName'), rdf.literal(webIdLocation.name.toString()));
  rdf.add(serviceResource, vocabs.SAFETERMS('typeTag'), rdf.literal(webIdLocation.typeTag.toString()));

  const serialised = await rdf.serialise('text/turtle');
  //const serialised = await rdf.serialise('application/ld+json');
  console.log("PUBLIC ID:", serialised)
}

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

  const serialised = await rdf.serialise('text/turtle');
  //const serialised = await rdf.serialise('application/ld+json');
  console.log("PUBLIC NAMES:", serialised)
}

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
      OWL: this.rdf.namespace("http://www.w3.org/2002/07/owl#"),
      DCTERMS: this.rdf.namespace('http://purl.org/dc/terms/'),
      SAFETERMS: this.rdf.namespace("http://safenetwork.org/safevocab/")
    }
  }

  async fetchContent() {
    await this.rdf.nowOrWhenFetched();
  }

  async create(profile) {
    // TODO: support for URIs containing a path, e.g. safe://mywebid.gabriel/card
    // We may need to create an NFS container to reference it?
    const parsedUrl = parseUrl(profile.uri);
    const hostParts = parsedUrl.hostname.split('.');
    const publicName = hostParts.pop(); // last one is 'domain'
    const serviceName = hostParts.join('.'); // all others are 'service'
    const publicId = await this.mData.app.crypto.sha3Hash(publicName);
    await createProfileDoc(this.rdf, this.vocabs, profile);
    const webIdLocation = await this.rdf.commit();

    const servicesContainer = await this.mData.app.mutableData.newPublic(publicId, consts.TAG_TYPE_DNS);
    await servicesContainer.quickSetup();
    const servicesRdf = servicesContainer.emulateAs('rdf');
    await createPublicId(servicesRdf, this.vocabs, webIdLocation, publicName, serviceName);
    const servicesLocation = await servicesRdf.commit();

    const publicNamesContainer = await this.mData.app.auth.getContainer('_publicNames');
    const publicNamesRdf = publicNamesContainer.emulateAs('rdf');
    await recordInPublicNames(publicNamesRdf, this.vocabs, servicesLocation, publicName);
    await publicNamesRdf.commit();
  }

  async update(profile) {
    this.rdf.removeMany(undefined, undefined, undefined);
    await createProfileDoc(this.rdf, this.vocabs, profile);
    const webIdLocation = await this.rdf.commit();
  }

  async serialise(mimeType) {
    const serialised = await this.rdf.serialise(mimeType);
    return serialised;
  }
}

module.exports = WebID;

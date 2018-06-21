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

/**
* WebID Emulation on top of a MutableData
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
  // and where contentType can be RDF format or somethin else:
  // if it's RDF we use RDF emulation
  // it it's something else we store it as ImmutableData
  //
  // and "eTag"/"If-Match" headers might be needed and generated from a hash of the MD's version

  async createProfileDoc(rdf, vocabs, profile) {
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
    rdf.add(webIdWithHashTag, vocabs.FOAF('image'), rdf.literal(profile.avatar)); // TODO: this needs to be created as an LDPNR
    //rdf.add(rdf.literal('#me'), vocabs.FOAF('website'), rdf.literal(profile.website));

    const serialised = await rdf.serialise('text/turtle');
    //const serialised = await rdf.serialise('application/ld+json');
    console.log("PROFILE:", serialised)
  }

  async createPublicId(rdf, vocabs, uri, webIdLocation) {
    const publicId = 'safe://gabriel'; // TODO: parse the uri to extract the public ID
    const serviceName = 'mywebid'; // TODO: parse the uri to extract the service name

    const id = rdf.sym(publicId);
    rdf.setId(publicId);
    const publicIdWithHashTag = rdf.sym(`${publicId}#it`);

    rdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
    rdf.add(id, vocabs.LDP('membershipResource'), publicIdWithHashTag);
    rdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasWebService'));
    rdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasWebIdService'));
    rdf.add(id, vocabs.DCTERMS('title'), rdf.literal(`Services Container for public ID 'gabriel'`));
    rdf.add(id, vocabs.DCTERMS('description'), rdf.literal('List of public services exposed by a particular public ID'));
    rdf.add(id, vocabs.LDP('contains'), rdf.sym(uri)); // TODO: link to the services container
    //rdf.add(id, vocabs.LDP('contains'), rdf.sym('safe://mywebid.gabriel'));
    //rdf.add(id, vocabs.LDP('contains'), rdf.sym('safe://mywebsite.gabriel'));

    rdf.add(publicIdWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('Services'));
    rdf.add(publicIdWithHashTag, vocabs.DCTERMS('title'), rdf.literal(`Services available for public ID 'gabriel'`));
    rdf.add(publicIdWithHashTag, vocabs.SAFETERMS('hasWebIdService'), rdf.sym(uri)); // TODO: link to the services container
    rdf.add(publicIdWithHashTag, vocabs.SAFETERMS('xorName'), rdf.literal(webIdLocation.name.toString()));
    rdf.add(publicIdWithHashTag, vocabs.SAFETERMS('typeTag'), rdf.literal(webIdLocation.typeTag.toString()));
    //rdf.add(publicIdWithHashTag, vocabs.SAFETERMS('hasWebIdService'), rdf.sym('safe://mywebid.gabriel'));
    //rdf.add(publicIdWithHashTag, vocabs.SAFETERMS('hasWebService'), rdf.sym('safe://mywebsite.gabriel'));

    const serialised = await rdf.serialise('text/turtle');
    //const serialised = await rdf.serialise('application/ld+json');
    console.log("PUBLIC ID:", serialised)
  }

  async recordInPublicNames(rdf, vocabs, uri, servicesLocation) {
    const id = rdf.sym('safe://_publicNames');
    rdf.setId('_publicNames');
    const publicNameWithHashTag = rdf.sym('safe://_publicNames#it');

    rdf.add(id, vocabs.RDFS('type'), vocabs.LDP('DirectContainer'));
    rdf.add(id, vocabs.LDP('membershipResource'), publicNameWithHashTag);
    rdf.add(id, vocabs.LDP('hasMemberRelation'), vocabs.SAFETERMS('hasPublicName'));
    rdf.add(id, vocabs.DCTERMS('title'), rdf.literal('_publicNames default container'));
    rdf.add(id, vocabs.DCTERMS('description'), rdf.literal('Container to keep track of public names owned by the account'));
    rdf.add(id, vocabs.LDP('contains'), rdf.sym(uri)); // TODO: link to the services container
    //rdf.add(id, vocabs.LDP('contains'), rdf.sym('safe://gabriel'));
    //rdf.add(id, vocabs.LDP('contains'), rdf.sym('safe://otherpublic'));

    rdf.add(publicNameWithHashTag, vocabs.RDFS('type'), vocabs.SAFETERMS('PublicNames'));
    rdf.add(publicNameWithHashTag, vocabs.DCTERMS('title'), rdf.literal('Public names owned by an account'));
    rdf.add(publicNameWithHashTag, vocabs.SAFETERMS('hasPublicName'), rdf.sym(uri)); // TODO: link to the services container
    rdf.add(publicNameWithHashTag, vocabs.SAFETERMS('xorName'), rdf.literal(servicesLocation.name.toString()));
    rdf.add(publicNameWithHashTag, vocabs.SAFETERMS('typeTag'), rdf.literal(servicesLocation.typeTag.toString()));
    //rdf.add(publicNameWithHashTag, vocabs.SAFETERMS('hasPublicName'), rdf.sym('safe://gabriel'));
    //rdf.add(publicNameWithHashTag, vocabs.SAFETERMS('hasPublicName'), rdf.sym('safe://otherpublic'));

    const serialised = await rdf.serialise('text/turtle');
    //const serialised = await rdf.serialise('application/ld+json');
    console.log("PUBLIC NAMES:", serialised)
  }

  async create(profile) {
    await this.createProfileDoc(this.rdf, this.vocabs, profile);
  }

  async commit(uri) {
    const webIdLocation = await this.rdf.commit();

    // TODO: move the uri parser to a helper as it's used by webFetch too
    const parsedUrl = parseUrl(uri);
    const hostParts = parsedUrl.hostname.split('.');
    const publicName = hostParts.pop(); // last one is 'domain'
    const serviceName = hostParts.join('.'); // all others are 'service'
    const publicId = await this.mData.app.crypto.sha3Hash(publicName);

    const servicesContainer = await this.mData.app.mutableData.newPublic(publicId, consts.TAG_TYPE_DNS);
    await servicesContainer.quickSetup();
    const servicesRdf = servicesContainer.emulateAs('rdf');
    await this.createPublicId(servicesRdf, this.vocabs, uri, webIdLocation);
    const servicesLocation = await servicesRdf.commit();

    const publicNamesContainer = await this.mData.app.auth.getContainer('_publicNames');
    const publicNamesRdf = publicNamesContainer.emulateAs('rdf');
    await this.recordInPublicNames(publicNamesRdf, this.vocabs, uri, servicesLocation);
    await publicNamesRdf.commit();
  }
}

module.exports = WebID;

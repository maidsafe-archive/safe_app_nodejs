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
const createWebIdProfileDoc = async (rdf, vocabs, profile, postsLocation) => {
  const id = rdf.sym(profile.uri);
  rdf.setId(profile.uri);
  const webIdWithHashTag = rdf.sym(`${profile.uri}#me`);
  const webIdPosts = rdf.sym(`${profile.uri}/posts`);

  rdf.add(id, vocabs.RDFS('type'), vocabs.FOAF('PersonalProfileDocument'));
  rdf.add(id, vocabs.DCTERMS('title'), rdf.literal(`${profile.name}'s profile document`));
  rdf.add(id, vocabs.FOAF('maker'), webIdWithHashTag);
  rdf.add(id, vocabs.FOAF('primaryTopic'), webIdWithHashTag);

  rdf.add(webIdWithHashTag, vocabs.RDFS('type'), vocabs.FOAF('Person'));
  rdf.add(webIdWithHashTag, vocabs.FOAF('name'), rdf.literal(profile.name));
  rdf.add(webIdWithHashTag, vocabs.FOAF('nick'), rdf.literal(profile.nickname));
  rdf.add(webIdWithHashTag, vocabs.FOAF('image'), rdf.literal(profile.avatar)); // TODO: this needs to be created as an LDP-NR
  rdf.add(webIdWithHashTag, vocabs.FOAF('website'), rdf.literal(profile.website));

  rdf.add(webIdPosts, vocabs.RDFS('type'), vocabs.SAFETERMS('Posts'));
  rdf.add(webIdPosts, vocabs.DCTERMS('title'), rdf.literal('Container for social apps posts'));
  rdf.add(webIdPosts, vocabs.SAFETERMS('xorName'), rdf.literal(postsLocation.name.toString()));
  rdf.add(webIdPosts, vocabs.SAFETERMS('typeTag'), rdf.literal(postsLocation.typeTag.toString()));

  const location = await rdf.commit();

  return location;
  // const serialised = await rdf.serialise('text/turtle');
  // const serialised = await rdf.serialise('application/ld+json');
  // console.log("PROFILE:", serialised)
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

  // TODO: displayname = nickname?
  async create(profile, displayName) {
    const app = this.mData.app;

    // TODO: support for URIs containing a path, e.g. safe://mywebid.gabriel/card
    // We may need to create an NFS container to reference it?
    const parsedUrl = parseUrl(profile.uri);
    const hostParts = parsedUrl.hostname.split('.');
    const publicName = hostParts.pop(); // last one is 'domain'
    const subdomain = hostParts.join('.'); // all others are 'service'

    // Create inbox container for posts
    const postsMd = await app.mutableData.newRandomPublic(303030);
    const perms = await app.mutableData.newPermissions();
    const appKey = await app.crypto.getAppPubSignKey();
    const pmSet = ['Insert', 'Update', 'Delete', 'ManagePermissions'];
    await perms.insertPermissionSet(appKey, pmSet);
    await perms.insertPermissionSet(consts.pubConsts.USER_ANYONE, ['Insert']);
    await postsMd.put(perms);
    const postsLocation = await postsMd.getNameAndTag();

    // TODO: Do we create the md in here? Is it needed quicksetup outside?
    const webIdLocation = await createWebIdProfileDoc(this.rdf, this.vocabs, profile, postsLocation);

    // const webIdLocation = webIdProfileObject.location;
    // const webIdRdf = webIdProfileObject.rdf;

    // TODO: grab name and add displayName here...
    await app.web.addWebIdToDirectory(webIdLocation, displayName);

    const subdomainsRdfLocation =
      await app.web.addServiceToSubdomain(subdomain, publicName, webIdLocation);

    await app.web.createPublicName(publicName, subdomainsRdfLocation);

    // return webIdProfileObject;
  }

  async update(profile) {
    // FIXME: we nee to keep the posts graph unless that's been also updated, which shouldn't be expected really
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

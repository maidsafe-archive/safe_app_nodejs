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
const { EXPOSE_AS_EXPERIMENTAL_API_SYNC } = require('../../helpers');

// Helper for creating a WebID profile document RDF resource
const createWebIdProfileDoc = async (rdf, vocabs, profile, postsLocation) => {
  // TODO: Webid URI validation: https://github.com/joshuef/webIdManager/issues/2
  const id = rdf.sym(profile.uri);
  rdf.setId(profile.uri);
  const hasMeAlready = profile.uri.includes('#me');
  const webIdWithHashTag = hasMeAlready ? rdf.sym(profile.uri) : rdf.sym(`${profile.uri}#me`);
  const webIdPosts = rdf.sym(`${profile.uri}/posts`);

  // TODO: we are overwritting the entire RDF when updating, we could make it
  // more efficient and only add the new triples when updating.
  rdf.add(id, vocabs.RDFS('type'), vocabs.FOAF('PersonalProfileDocument'));
  rdf.add(id, vocabs.DCTERMS('title'), rdf.literal(`${profile.name}'s profile document`));
  rdf.add(id, vocabs.FOAF('maker'), webIdWithHashTag);
  rdf.add(id, vocabs.FOAF('primaryTopic'), webIdWithHashTag);

  rdf.add(webIdWithHashTag, vocabs.RDFS('type'), vocabs.FOAF('Person'));
  rdf.add(webIdWithHashTag, vocabs.FOAF('name'), rdf.literal(profile.name));
  rdf.add(webIdWithHashTag, vocabs.FOAF('nick'), rdf.literal(profile.nick));

  if (profile.image) { rdf.add(webIdWithHashTag, vocabs.FOAF('image'), rdf.literal(profile.image)); } // TODO: this needs to be linked with a XOR-URLs

  if (profile.website) { rdf.add(webIdWithHashTag, vocabs.FOAF('website'), rdf.literal(profile.website)); }

  if (postsLocation) {
    rdf.add(webIdPosts, vocabs.RDFS('type'), vocabs.SAFETERMS('Posts'));
    rdf.add(webIdPosts, vocabs.DCTERMS('title'), rdf.literal('Container for social apps posts'));
    rdf.add(webIdPosts, vocabs.SAFETERMS('xorName'), rdf.literal(postsLocation.name.toString()));
    rdf.add(webIdPosts, vocabs.SAFETERMS('typeTag'), rdf.literal(postsLocation.typeTag.toString()));
  }

  const location = await rdf.commit();
  return location;
};


/**
* Experimental WebID Emulation on top of a MutableData internally using RDF emulation
*
* Instantiate the WebID emulation layer wrapping a MutableData instance,
* while making use of the RDF emulation to manipulate the MD entries
*
* @param {MutableData} mData the MutableData to wrap around
*/
class WebID {
  constructor(mData) {
    this.mData = mData;
  }

  async init() {
    if (this.rdf) return; // it was already initialised

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
    await this.init();
    await this.rdf.nowOrWhenFetched();
  }

  async create(profile, displayName) {
    await this.init();
    const app = this.mData.app;

    // TODO: support for URIs containing a path, e.g. safe://mywebid.gabriel/card
    // We may need to create an NFS container to reference it?
    const parsedUrl = parseUrl(profile.uri);
    const hostParts = parsedUrl.hostname.split('.');
    const publicName = hostParts.pop(); // last one is 'publicName'
    const subName = hostParts.join('.'); // all others are 'subNames'

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
    const webIdLocation =
      await createWebIdProfileDoc(this.rdf, this.vocabs, profile, postsLocation);

    await app.web.addWebIdToDirectory(profile.uri, displayName || profile.nick);

    const subdomainsRdfLocation =
      await app.web.linkServiceToSubname(subName, publicName, webIdLocation);

    await app.web.addPublicNameToDirectory(publicName, subdomainsRdfLocation);
  }

  async update(profile) {
    await this.init();

    // We should look for better ways of supporting the update as this is inefficient.
    this.rdf.removeMany(undefined, undefined, undefined);
    // FIXME: we need to keep the posts graph only if that's not been updated,
    // which shouldn't be expected really.
    await this.rdf.nowOrWhenFetched([`${profile.uri}/posts`]);
    await createWebIdProfileDoc(this.rdf, this.vocabs, profile);
  }

  async serialise(mimeType) {
    await this.init();
    const serialised = await this.rdf.serialise(mimeType);
    return serialised;
  }
}

class WebIdEmulationFactory {
  /**
  * @private
  * Instantiate the WebID emulation layer wrapping a MutableData instance,
  * hiding the whole WebID emulation class behind the experimental API flag
  *
  * @param {MutableData} mData the MutableData to wrap around
  */
  constructor(mData) {
    /* eslint-disable camelcase, prefer-arrow-callback */
    return EXPOSE_AS_EXPERIMENTAL_API_SYNC.call(mData.app, function WebID_Emulation() {
      return new WebID(mData);
    });
  }
}

module.exports = WebIdEmulationFactory;

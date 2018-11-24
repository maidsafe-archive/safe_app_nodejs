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
const { EXPOSE_AS_EXPERIMENTAL_API } = require('../../helpers');

const POSTS_MD_TYPE_TAG = 30303;

// Helper for creating a WebID profile document RDF resource
const createWebIdProfileDoc = async (rdf, vocabs, profile, inboxXorUrl) => {
  // TODO: Webid URI validation: https://github.com/joshuef/webIdManager/issues/2
  const id = rdf.sym(profile.uri);
  rdf.setId(profile.uri);
  const hasMeAlready = profile.uri.includes('#me');
  const webIdWithHashTag = hasMeAlready ? rdf.sym(profile.uri) : rdf.sym(`${profile.uri}#me`);

  // TODO: we are overwritting the entire RDF when updating, we could make it
  // more efficient and only add the new triples when updating.
  rdf.add(id, vocabs.RDFS('type'), vocabs.FOAF('PersonalProfileDocument'));

  rdf.removeMany(id, vocabs.DCTERMS('title'), null);
  rdf.add(id, vocabs.DCTERMS('title'), rdf.literal(`${profile.name}'s profile document`));
  rdf.add(id, vocabs.FOAF('maker'), webIdWithHashTag);
  rdf.add(id, vocabs.FOAF('primaryTopic'), webIdWithHashTag);

  rdf.add(webIdWithHashTag, vocabs.RDFS('type'), vocabs.FOAF('Person'));
  rdf.removeMany(webIdWithHashTag, vocabs.FOAF('name'), null);
  rdf.add(webIdWithHashTag, vocabs.FOAF('name'), rdf.literal(profile.name));
  rdf.removeMany(webIdWithHashTag, vocabs.FOAF('nick'), null);
  rdf.add(webIdWithHashTag, vocabs.FOAF('nick'), rdf.literal(profile.nick));

  rdf.removeMany(webIdWithHashTag, vocabs.FOAF('image'), null);
  if (profile.image) { rdf.add(webIdWithHashTag, vocabs.FOAF('image'), rdf.sym(profile.image)); }

  rdf.removeMany(webIdWithHashTag, vocabs.FOAF('website'), null);
  if (profile.website) { rdf.add(webIdWithHashTag, vocabs.FOAF('website'), rdf.sym(profile.website)); }

  const ACTIVITYSTREAMS = rdf.namespace('https://www.w3.org/ns/activitystreams/');
  rdf.removeMany(webIdWithHashTag, ACTIVITYSTREAMS('inbox'), null);
  const inboxLink = inboxXorUrl || profile.inbox;
  if (inboxLink) { rdf.add(webIdWithHashTag, ACTIVITYSTREAMS('inbox'), rdf.sym(inboxLink)); }

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
    const postsMd = await app.mutableData.newRandomPublic(POSTS_MD_TYPE_TAG);
    const perms = await app.mutableData.newPermissions();
    const appKey = await app.crypto.getAppPubSignKey();
    const pmSet = ['Insert', 'Update', 'Delete', 'ManagePermissions'];
    await perms.insertPermissionSet(appKey, pmSet);
    await perms.insertPermissionSet(consts.pubConsts.USER_ANYONE, ['Insert']);
    await postsMd.put(perms);
    const { xorUrl } = await postsMd.getNameAndTag();

    const webIdLocation =
      await createWebIdProfileDoc(this.rdf, this.vocabs, profile, xorUrl);

    await app.web.addWebIdToDirectory(profile.uri, displayName || profile.nick);

    const subdomainsRdfLocation =
      await app.web.linkServiceToSubname(subName, publicName, webIdLocation);

    await app.web.addPublicNameToDirectory(publicName, subdomainsRdfLocation);
  }

  async update(profile) {
    await this.init();
    let inboxXorUrl;
    if (!profile.inbox) {
      // For backward compatibility let's check if the link to posts
      // is in the old format which is a named graph. If so, let's
      // convert it to be an 'inbox' XOR-URL link
      try {
        const postsGraph = `${profile.uri}/posts`;
        await this.rdf.nowOrWhenFetched(postsGraph);
        const postsSym = this.rdf.sym(postsGraph);
        const typeTagMatch = this.rdf.statementsMatching(postsSym, this.rdf.vocabs.SAFETERMS('typeTag'), null);
        const typeTag = typeTagMatch[0] && parseInt(typeTagMatch[0].object.value, 10);
        const xorNameMatch = this.rdf.statementsMatching(postsSym, this.rdf.vocabs.SAFETERMS('xorName'), null);
        const xorName = xorNameMatch[0] && xorNameMatch[0].object.value.split(',');
        // let's now get rid of the old format graph for posts
        await this.rdf.removeMany(this.rdf.sym(postsGraph), null, null);
        if (xorName && typeTag) {
          const postsMd = await this.mData.app.mutableData.newPublic(xorName, typeTag);
          const { xorUrl } = await postsMd.getNameAndTag();
          inboxXorUrl = xorUrl;
        }
      } catch (err) {
        // if the old link to posts is not found or invalid we just ignore it
      }
    }

    await createWebIdProfileDoc(this.rdf, this.vocabs, profile, inboxXorUrl);
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
    return EXPOSE_AS_EXPERIMENTAL_API.call(mData.app, function WebID_Emulation() {
      return new WebID(mData);
    });
  }
}

module.exports = WebIdEmulationFactory;

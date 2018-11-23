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

const should = require('should');
const h = require('../helpers');
const errConst = require('../../src/error_const');

describe('Experimental WebID emulation', () => {
  let app;
  let md;
  let xorname;

  const TYPE_TAG = 15639;
  const JSON_LD_MIME_TYPE = 'application/ld+json';
  const TURTLE_MIME_TYPE = 'text/turtle';

  beforeEach(async () => {
    app = await h.publicNamesTestApp();
    xorname = h.createRandomXorName();
    md = await app.mutableData.newPublic(xorname, TYPE_TAG);
    await md.quickSetup({});
  });

  it('fail if experimental apis flag is not set', async () => {
    let error;
    const safeApp = await h.createUnregisteredTestApp({ enableExperimentalApis: false });
    try {
      const name = h.createRandomXorName();
      const mdata = await safeApp.mutableData.newPublic(name, TYPE_TAG);
      await mdata.quickSetup({});
      mdata.emulateAs('webid');
    } catch (err) {
      error = err;
    }
    return should(error.message).equal(errConst.EXPERIMENTAL_API_DISABLED.msg('WebID Emulation'));
  });

  it('create WebID emulation from MD', async () => {
    const webId = md.emulateAs('WebID');
    return should(webId).not.be.undefined();
  });

  it('create WebID from basic profile info and update', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName,
      website: `safe://mywebsite.${randomName}`,
      image: `safe://mywebsite.${randomName}/images/myavatar`,
    };

    const webId = md.emulateAs('WebID');
    await webId.create(profile);

    const firstId = await webId.rdf.serialise(JSON_LD_MIME_TYPE);
    const firstPosts = JSON.parse(firstId)[2];

    profile.name = 'Name Updated';
    profile.image = 'safe://new-image';
    await webId.update(profile);
    const secondId = await webId.rdf.serialise(JSON_LD_MIME_TYPE);
    const secondPosts = JSON.parse(secondId)[2];

    should(secondId).match(/Name Updated/);
    should(secondId).match(/safe:\/\/new-image/);
    return should(secondPosts).deepEqual(firstPosts);
  });

  it('create WebID from basic profile without image or website', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName
    };
    const webId = md.emulateAs('WebID');
    return should(webId.create(profile)).be.fulfilledWith();
  });

  it('create WebID and check the posts container can be fetched', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName
    };
    const webId = md.emulateAs('WebID');
    await webId.create(profile);
    const serialised = await webId.serialise(JSON_LD_MIME_TYPE);
    const jsonld = JSON.parse(serialised);
    const postsLink = jsonld[1]['http://xmlns.com/foaf/0.1/posts'][0]['@id'];
    const safeApp = await h.createUnregisteredTestApp({ enableExperimentalApis: true });
    return should(safeApp.webFetch(postsLink)).be.fulfilled();
  });

  it('fetch existing WebID', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName,
      website: `safe://mywebsite.${randomName}`,
      image: `safe://mywebsite.${randomName}/images/myavatar`,
    };

    const webId = md.emulateAs('WebID');
    await webId.create(profile);

    const newMd = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const fetchedWebId = newMd.emulateAs('WebID');
    await fetchedWebId.fetchContent();
    const serialised = await fetchedWebId.serialise(TURTLE_MIME_TYPE);
    return should(serialised.length).be.above(0);
  });

  // this functionality is temporary just to provide backward compatibility
  it('fetch existing WebID with old format', async () => {
    const nameAndTag = await md.getNameAndTag();
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const oldWebIdFormat = `\
      @prefix n0: <http://xmlns.com/foaf/0.1/>.\
      @prefix terms: <http://purl.org/dc/terms/>.\
      @prefix s: <http://safenetwork.org/safevocab/>.\
      <>\
          a n0:PersonalProfileDocument;\
          terms:title "${randomName}'s profile document";\
          n0:maker <#me>;\
          n0:primaryTopic <#me>.\
      <safe://mywebid.${randomName}/posts>\
          a s:Posts;\
          terms:title "Container for social apps posts";\
          s:typeTag "${nameAndTag.typeTag.toString()}";\
          s:xorName "${nameAndTag.name.toString()}".\
      <safe://mywebid.${randomName}/other>\
          a s:Other;\
          terms:title "Generated by any other app".\
      <#me>\
          a n0:Person;\
          n0:image <safe://mywebsite.${randomName}/images/myavatar>;\
          n0:name "${randomName}";\
          n0:nick "${randomName}";\
          n0:website <safe://mywebsite.${randomName}>.`;

    // let's first write a WebID with old format
    const rdf = md.emulateAs('RDF');
    await rdf.parse(oldWebIdFormat, TURTLE_MIME_TYPE, `safe://mywebid.${randomName}`);
    await rdf.commit();

    // let's now update the WebID profile document
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: `updated-${randomName}`,
      nick: `updated-${randomName}`,
      website: `safe://mywebsite.updated-${randomName}`,
      image: `safe://mywebsite.updated-${randomName}/images/myavatar`,
    };
    const webId = md.emulateAs('WebID');
    await webId.fetchContent();
    await webId.update(profile);

    // let's check the profile document was now written with new format,
    // i.e. using XOR-URLs for the image, website and posts links
    // n0:posts <safe://${nameAndTag.xorUrl}>
    const serialisedUpdated = await webId.serialise(JSON_LD_MIME_TYPE);
    const jsonld = JSON.parse(serialisedUpdated);
    const postsVocab = rdf.vocabs.FOAF('posts').value;
    const postsLink = jsonld.find((graph) => graph[postsVocab]);
    return should(postsLink[postsVocab][0]['@id']).be.equal(nameAndTag.xorUrl);
  });

  it('retrieving WebID object from URI as Turtle', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName,
      website: `safe://mywebsite.${randomName}`,
      image: `safe://mywebsite.${randomName}/images/myavatar`,
    };

    const webId = md.emulateAs('WebID');
    await webId.create(profile);
    const serialised = await webId.serialise(TURTLE_MIME_TYPE);

    // Turtle is the default format for RDFs returned by webFetch
    const webIdResponse = await app.webFetch(profile.uri);
    should(webIdResponse.headers['Content-Type']).be.equal(TURTLE_MIME_TYPE);
    return should(serialised).be.equal(webIdResponse.body);
  });

  it('retrieving WebID object from URI as JSON-LD', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName,
      website: `safe://mywebsite.${randomName}`,
      image: `safe://mywebsite.${randomName}/images/myavatar`,
    };

    const webId = md.emulateAs('WebID');
    await webId.create(profile);

    const options = { accept: JSON_LD_MIME_TYPE };
    const serialised = await webId.serialise(options.accept);
    const webIdResponse = await app.webFetch(profile.uri, options);
    should(webIdResponse.headers['Content-Type']).be.equal(options.accept);
    return should(serialised).be.equal(webIdResponse.body);
  });

  it('verify _publicNames is populated for creating several WebIDs', async () => {
    const numOfWebIds = 3;
    const pubNamesApp = await h.publicNamesTestApp();
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < numOfWebIds; i += 1) {
      const randomName = `test_${Math.round(Math.random() * 100000)}`;
      const profile = {
        uri: `safe://mywebid.${randomName}`,
        name: randomName,
        nick: randomName,
        website: `safe://mywebsite.${randomName}`,
        image: `safe://mywebsite.${randomName}/images/myavatar`,
      };

      const newXorname = h.createRandomXorName();
      const newMd = await pubNamesApp.mutableData.newPublic(newXorname, TYPE_TAG);
      await newMd.quickSetup();
      const newWebId = newMd.emulateAs('WebID');
      await newWebId.create(profile);
    }
    /* eslint-enable no-await-in-loop */

    const pubNameMd = await pubNamesApp.auth.getContainer('_publicNames');
    const entries = await pubNameMd.getEntries();
    const entriesLength = await entries.len();
    // one graph per WebID is created in _publicNames, plus two for LDP
    return should(entriesLength).be.equal(numOfWebIds + 2);
  });

  it('fetch existing WebID via webId directory', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName,
      website: `safe://mywebsite.${randomName}`,
      image: `safe://mywebsite.${randomName}/images/myavatar`,
    };

    const webId = md.emulateAs('WebID');
    await webId.create(profile);

    const webIds = await app.web.getWebIds();
    return should(webIds).be.a.Array();
  });
});

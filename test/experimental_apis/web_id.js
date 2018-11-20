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

    const firstId = await webId.rdf.serialise('application/ld+json');
    const firstPosts = JSON.parse(firstId)[2];

    profile.name = 'Name Updated';
    profile.image = 'New Image';
    await webId.update(profile);
    const secondId = await webId.rdf.serialise('application/ld+json');
    const secondPosts = JSON.parse(secondId)[2];

    should(secondId).match(/Name Updated/);
    should(secondId).match(/New Image/);
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
    const serialised = await fetchedWebId.serialise('text/turtle');
    return should(serialised.length).be.above(0);
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

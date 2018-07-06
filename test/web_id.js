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
const h = require('./helpers');

describe.only('WebID emulation', () => {
  let app,
    md,
    xorname;
  const TYPE_TAG = 15639;

  beforeEach(async () => {
    app = await h.publicNamesTestApp;
    xorname = h.createRandomXorName();
    md = await app.mutableData.newPublic(xorname, TYPE_TAG);
  });

  it('create WebID emulation from MD', async () => {
    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    return should(webId).not.be.undefined();
  });

  it('create WebID from basic profile info and update', async () => {
    const profile = {
      uri: 'safe://mywebid.gabriel',
      name: 'Gabriel Viganotti',
      nick: 'bochaco',
      website: 'safe://mywebsite.gabriel',
      image: 'safe://mywebsite.gabriel/images/myavatar',
    };

    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create(profile);

    profile.name = 'Gabriel Updated';
    await webId.update(profile);
  });

  it('fetch existing WebID', async () => {
    const profile = {
      uri: 'safe://mywebid.gabriel',
      name: 'Gabriel Viganotti',
      nick: 'bochaco',
      website: 'safe://mywebsite.gabriel',
      image: 'safe://mywebsite.gabriel/images/myavatar',
    };

    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create(profile);

    const newMd = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const fetchedWebId = await newMd.emulateAs('WebID');
    await fetchedWebId.fetchContent();
    const serialised = await fetchedWebId.serialise('text/turtle');
    // const serialised = await fetchedWebId.serialise('application/ld+json');
    console.log('FETCHED WebID:', serialised);
  });

  it('fetch existing WebID via webId directory', async () => {
    const profile = {
      uri: 'safe://mywebid.gabriel',
      name: 'Gabriel Viganotti',
      nick: 'bochaco',
      website: 'safe://mywebsite.gabriel',
      image: 'safe://mywebsite.gabriel/images/myavatar',
    };

    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create(profile);

    const webIds = await app.web.getWebIds();
    should(webIds).be.a.Array();

  });
});

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
  let app, md, xorname;
  const TYPE_TAG = 15639;
  const myUri = 'safe://webid.manu';
  //const myAvatar = require('./avatar.base64');

  beforeEach(async () => {
    app = await h.createAuthenticatedTestApp();
    xorname = h.createRandomXorName();
    md = await app.mutableData.newPublic(xorname, TYPE_TAG);
  });

  it('create WebID emulation from MD', async () => {
    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    return should(webId).not.be.undefined();
  });

  it.only('create WebID from basic profile info', async () => {
    const profile = {
      uri: myUri,
      name: 'Manu Sporny',
      nickname: 'Manu',
      //website: "{ xorname: 'fdgdfgdgdfdffdgdf'}",
      //avatar: myAvatar,
    }

    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.createProfileDoc(profile);
    //await webId.createPublicId(profile.uri);
  });
});

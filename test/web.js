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
const App = require('../src/app');
const errConst = require('../src/error_const');

const createTestApp = h.createTestApp;
const appInfo = h.appInfo;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const { autoref } = require('../src/helpers');

const containersPermissions = { _publicNames: ['Insert', 'Update', 'Delete'] };

/* eslint-disable no-shadow */
describe('getPublicNames', () => {
  let app;
  let xorname;
  // let authedPublicNamesApp;
  const TYPE_TAG = 15639;

  let authedPublicNamesApp;


  before( async() => {

    authedPublicNamesApp = await createAuthenticatedTestApp(null, containersPermissions);
    xorname = h.createRandomXorName();
  });


  it('should throw when app perms are not given for _publicNames',
    async () => {
      app = await createAuthenticatedTestApp();
      try {
        await app.web.getPublicNames();
      } catch (e) {
        should(e.message).match(/_publicNames/);
      }
    });

  it('should return empty array of getPublicNames when none set', async () => {
    const containersPermissions = { _publicNames: ['Insert', 'Update', 'Delete'] };

    // console.log(authedPublicNamesApp);
    const authedApp = authedPublicNamesApp;


    console.log('it is contained....');
    let names;
    names = await authedApp.web.getPublicNames();

    should(names).be.a.Array();
    should(names).have.length(0);
  });


  it('should return the array of getPublicNames', async () => {
    // const containersPermissions = { _publicNames: ['Insert', 'Update', 'Delete'] };
    const authedApp = authedPublicNamesApp;
    const profile = {
      uri: 'safe://mywebid.gabriel',
      name: 'Gabriel Viganotti',
      nickname: 'bochaco',
      website: 'safe://mywebsite.gabriel',
      avatar: 'safe://mywebsite.gabriel/images/myavatar',
    };


    const md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create(profile);

    let names;
    names = await authedApp.web.getPublicNames();

    should(names).be.a.Array();

    should(names).have.length(3);
  });



});

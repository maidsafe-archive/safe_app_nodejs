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
const errConst = require('../src/error_const');

const TYPE_TAG = 15689;

/* eslint-disable no-shadow */
describe('getPublicNames', () => {
  let app;
  let xorname;
  const TYPE_TAG = 15639;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
    xorname = h.createRandomXorName();
  });


  it('should throw when app perms are not given for _publicNames',
    async () => {
      try {
        await app.web.getPublicNames();
      } catch (e) {
        should(e.message).match(/_publicNames/);
      }
    });

  it('should return empty array of getPublicNames when none set', async () => {
    const authedApp = await h.publicNamesTestApp;

    let names;
    names = await authedApp.web.getPublicNames();

    should(names).be.a.Array();
    should(names).have.length(0);
  });


  it('should return the array of getPublicNames', async () => {

    const authedApp = await h.publicNamesTestApp;
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

    const names = await authedApp.web.getPublicNames();

    should(names).be.a.Array();

    should(names).have.length(3);
  });

});


/* eslint-disable no-shadow */
describe.only('createPublicName', () => {
  let app;
  let authedApp;
  let md;
  let fakeSubdomainRDF;
  before(async () => {
    authedApp = await h.publicNamesTestApp;
    app = await h.createAuthenticatedTestApp();
    const xorname = h.createRandomXorName();
    md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    fakeSubdomainRDF = await md.getNameAndTag()

  });

  it('should throw when a non string URL is passed',
  async () => {
    try {
      await authedApp.web.createPublicName({}, fakeSubdomainRDF);
    } catch (e) {
      should(e.message).match(errConst.INVALID_URL.msg);
      should(e.code).match(errConst.INVALID_URL.code);
    }
  });

it('should throw when no RDF location is provided',
  async () => {
    try {
      await authedApp.web.createPublicName('llll', {});
    } catch (e) {
      should(e.message).match(errConst.INVALID_RDF_LOCATION.msg);
      should(e.code).match(errConst.INVALID_RDF_LOCATION.code);
    }
  });

it('should throw when authedApp perms are not given for _publicNames',
  async () => {
    try {
      await app.web.createPublicName('llll', fakeSubdomainRDF);
    } catch (e) {
      should(e.message).match(/_publicNames/);
    }
  });

  it('should create a publicName', async () => {

    await authedApp.web.createPublicName('thisIsATestDomain', fakeSubdomainRDF )
    const names = await authedApp.web.getPublicNames();

    should(names).be.a.Array();

    // TODO: Will the array always be 3?
    should(names[2]).equal('safe://_publicNames#thisIsATestDomain');
    should(names).have.length(3);
  });

});

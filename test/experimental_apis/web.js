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

const TYPE_TAG = 15689;

describe('Experimental Web API', () => {
  describe('getPublicNames', () => {
    let app;
    let xorname;
    let profile;

    before(async () => {
      app = await h.createAuthenticatedTestApp(null, null, null, { enableExperimentalApis: true });
      xorname = h.createRandomXorName();
      const randomName = `test_${Math.round(Math.random() * 100000)}`;
      profile = {
        uri: `safe://mywebid.${randomName}`,
        name: randomName,
        nick: randomName,
        website: `safe://mywebsite.${randomName}`,
        image: `safe://mywebsite.${randomName}/images/myavatar`,
      };
    });

    it('fail if experimental apis flag is not set', async () => {
      let error;
      const safeApp = await h.createUnregisteredTestApp({ enableExperimentalApis: false });
      try {
        await safeApp.web.getPublicNames();
      } catch (err) {
        error = err;
      }
      return should(error.message).equal(errConst.EXPERIMENTAL_API_DISABLED.msg('getPublicNames'));
    });

    it('should throw when app perms are not given for _publicNames', async () => {
      let error;
      try {
        await app.web.getPublicNames();
      } catch (e) {
        error = e;
      }
      return should(error.message).match(/'_publicNames' not found in the access container/);
    });

    it('should return empty array of getPublicNames when none set', async () => {
      const authedApp = await h.publicNamesTestApp();
      const webIds = await authedApp.web.getPublicNames();
      should(webIds).be.a.Array();
      should(webIds).have.length(0);
    });

    it('should return the array of getPublicNames (a length greater than 0)', async () => {
      const authedApp = await h.publicNamesTestApp();
      const md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
      await md.quickSetup({});
      const webId = md.emulateAs('WebID');
      await webId.create(profile);

      const webIds = await authedApp.web.getPublicNames();
      should(webIds).be.a.Array();
      return should(webIds).have.length(3);
    });
  });

  describe('addPublicNameToDirectory', () => {
    let app;
    let authedApp;
    let md;
    let fakeSubdomainRDF;
    before(async () => {
      authedApp = await h.publicNamesTestApp();
      app = await h.createAuthenticatedTestApp(null, null, null, { enableExperimentalApis: true });
      const xorname = h.createRandomXorName();
      md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
      fakeSubdomainRDF = await md.getNameAndTag();
    });

    it('should throw when a non string URL is passed', async () => {
      let error;
      try {
        await authedApp.web.addPublicNameToDirectory({}, fakeSubdomainRDF);
      } catch (e) {
        error = e;
      }
      should(error.message).match(errConst.INVALID_URL.msg);
      return should(error.code).match(errConst.INVALID_URL.code);
    });

    it('should throw when no RDF location is provided', async () => {
      let error;
      try {
        await authedApp.web.addPublicNameToDirectory('publicname', {});
      } catch (e) {
        error = e;
      }
      should(error.message).match(errConst.INVALID_RDF_LOCATION.msg);
      return should(error.code).match(errConst.INVALID_RDF_LOCATION.code);
    });

    it('should throw when authedApp perms are not given for _publicNames', async () => {
      let error;
      try {
        await app.web.addPublicNameToDirectory('publicname', fakeSubdomainRDF);
      } catch (e) {
        error = e;
      }
      return should(error.message).match(/'_publicNames' not found in the access container/);
    });

    it('should create a publicName', async () => {
      await authedApp.web.addPublicNameToDirectory('thisIsATestDomain', fakeSubdomainRDF);
      const publicNames = await authedApp.web.getPublicNames();
      should(publicNames).be.a.Array();
      return should(publicNames).containDeep(['safe://_publicNames#thisIsATestDomain']);
    });

    it('should add publicName even on top of container old data format', async () => {
      const pubNamesCont = await authedApp.auth.getContainer('_publicNames');
      const mut = await authedApp.mutableData.newMutation();
      const encKey = await pubNamesCont.encryptKey('key');
      const encValue = await pubNamesCont.encryptValue('value');
      await mut.insert(encKey, encValue);
      await pubNamesCont.applyEntriesMutation(mut);
      await authedApp.web.addPublicNameToDirectory('thisIsATestDomain', fakeSubdomainRDF);
      const publicNames = await authedApp.web.getPublicNames();
      should(publicNames).be.a.Array();
      return should(publicNames).containDeep(['safe://_publicNames#thisIsATestDomain']);
    });

    it('should create two publicNames', async () => {
      await authedApp.web.addPublicNameToDirectory('thisIsATestDomain', fakeSubdomainRDF);
      await authedApp.web.addPublicNameToDirectory('thisIsASecondTestDomain', fakeSubdomainRDF);
      const publicNames = await authedApp.web.getPublicNames();
      should(publicNames).be.a.Array();
      should(publicNames).containDeep(['safe://_publicNames#thisIsATestDomain']);
      return should(publicNames).containDeep(['safe://_publicNames#thisIsASecondTestDomain']);
    });
  });

  describe('linkServiceToSubname', () => {
    let authedApp;
    let md;
    let fakeServiceRDF;
    before(async () => {
      authedApp = await h.publicNamesTestApp();
      const xorname = h.createRandomXorName();
      md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
      fakeServiceRDF = await md.getNameAndTag();
    });

    it('should throw when a non string pubName is passed', async () => {
      let error;
      try {
        await authedApp.web.linkServiceToSubname('subname', {}, {});
      } catch (e) {
        error = e;
      }
      should(error.message).match(errConst.INVALID_PUBNAME.msg);
      return should(error.code).match(errConst.INVALID_PUBNAME.code);
    });

    it('should throw when a non string subName is passed', async () => {
      let error;
      try {
        await authedApp.web.linkServiceToSubname({}, 'publicname', {});
      } catch (e) {
        error = e;
      }
      should(error.message).match(errConst.INVALID_SUBNAME.msg);
      return should(error.code).match(errConst.INVALID_SUBNAME.code);
    });

    it('should throw when no RDF location is provided', async () => {
      let error;
      try {
        await authedApp.web.linkServiceToSubname('subname', 'publicname', {});
      } catch (e) {
        error = e;
      }
      should(error.message).match(errConst.INVALID_RDF_LOCATION.msg);
      return should(error.code).match(errConst.INVALID_RDF_LOCATION.code);
    });

    it('should return a service MD location', async () => {
      const randomPubName = `test_${Math.round(Math.random() * 100000)}`;
      const location = await authedApp.web.linkServiceToSubname('thisIsATestSubName', randomPubName, fakeServiceRDF);
      should(location).be.a.Object();
      should(location).have.property('typeTag');
      return should(location).have.property('name');
    });

    it('should add subName to existing subNames container', async () => {
      const randomPubName = `test_${Math.round(Math.random() * 100000)}`;
      await authedApp.web.linkServiceToSubname('thisIsATestSubName', randomPubName, fakeServiceRDF);
      const location = await authedApp.web.linkServiceToSubname('thisIsASecondTestSubName', randomPubName, fakeServiceRDF);
      should(location).be.a.Object();
      should(location).have.property('typeTag');
      return should(location).have.property('name');
    });
  });

  describe('getWebIds', () => {
    let app;
    let xorname;
    let profile;
    before(async () => {
      app = await h.createAuthenticatedTestApp(null, null, null, { enableExperimentalApis: true });
      xorname = h.createRandomXorName();
      const randomName = `test_${Math.round(Math.random() * 100000)}`;
      profile = {
        uri: `safe://mywebid.${randomName}`,
        name: randomName,
        nick: randomName,
        website: `safe://mywebsite.${randomName}`,
        image: `safe://mywebsite.${randomName}/images/myavatar`,
      };
    });

    it('should throw when app perms are not given for _public', async () => {
      let error;
      try {
        await app.web.getWebIds();
      } catch (e) {
        error = e;
      }
      return should(error.message).match(/'_public' not found/);
    });

    it('should return empty array of _public when none set', async () => {
      const authedApp = await h.publicNamesTestApp();
      const webIds = await authedApp.web.getWebIds();
      should(webIds).be.a.Array();
      should(webIds).have.length(0);
    });

    it('filter from _public container not found linked WebIDs', async () => {
      const authedApp = await h.publicNamesTestApp();
      const publicMd = await authedApp.auth.getContainer('_public');
      const mut = await authedApp.mutableData.newMutation();
      const brokenWebIdLink = {
        'http://safenetwork.org/safevocab/uri': [
          { '@value': 'safe://webid-not-found' }
        ]
      };
      await mut.insert('fake/webId/', JSON.stringify(brokenWebIdLink));
      await publicMd.applyEntriesMutation(mut);
      const webIds = await authedApp.web.getWebIds();
      should(webIds).be.a.Array();
      should(webIds).have.length(0);
    });

    it('should return an array representing webIds in the _public directory', async () => {
      const authedApp = await h.publicNamesTestApp();
      const md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
      await md.quickSetup({});
      const webId = md.emulateAs('WebID');
      await webId.create(profile, 'searchName');

      const webIds = await authedApp.web.getWebIds();
      should(webIds).be.a.Array();
      should(webIds.length).be.greaterThan(0);

      should(webIds[0]).be.a.Object();
      // first el of webId statement array, in the array...
      should(webIds[0]['@type']).equal('http://xmlns.com/foaf/0.1/PersonalProfileDocument');
      should(webIds[0]['#me']).not.be.undefined();
      should(webIds[0]['#me']).be.a.Object();
      should(webIds[0]['#me'].inbox).be.a.Object();
    });
  });


  describe('addWebIdToDirectory', () => {
    let app;
    let authedApp;
    let md;
    let xorname;
    let webId;
    let profile;
    beforeEach(async () => {
      authedApp = await h.publicNamesTestApp();
      app = await h.createAuthenticatedTestApp(null, null, null, { enableExperimentalApis: true });
      xorname = h.createRandomXorName();
      md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
      await md.quickSetup({});
      webId = md.emulateAs('WebID');
      const randomName = `test_${Math.round(Math.random() * 100000)}`;
      profile = {
        uri: `safe://mywebid.${randomName}`,
        name: randomName,
        nick: randomName,
        website: `safe://mywebsite.${randomName}`,
        image: `safe://mywebsite.${randomName}/images/myavatar`,
      };
    });

    it('should throw when no uri is provided', async () => {
      let error;
      try {
        await authedApp.web.addWebIdToDirectory({});
      } catch (e) {
        error = e;
      }
      should(error.message).match(errConst.INVALID_URL.msg);
      return should(error.code).match(errConst.INVALID_URL.code);
    });

    it('should throw when authedApp perms are not given for _public', async () => {
      let error;
      try {
        await app.web.addWebIdToDirectory('aaa.fakeWebIdUri');
      } catch (e) {
        error = e;
      }
      return should(error.message).match(/'_public' not found/);
    });

    it('should create a directory listing for the webId', async () => {
      const randomPubName = `test_${Math.round(Math.random() * 100000)}`;
      const name1 = 'dirCreated';
      await webId.create(Object.assign(profile, { uri: `safe://aaaa.${randomPubName}` }), name1);

      const directory = await authedApp.auth.getContainer('_public');
      const directoryRDF = directory.emulateAs('rdf');
      await directoryRDF.nowOrWhenFetched();

      const serlialised = await directoryRDF.serialise('application/ld+json');
      const parsed = JSON.parse(serlialised);

      should(directoryRDF).be.a.Object();
      should(parsed).be.a.Object();
      return should(parsed[0]['@id']).match(/_public\/webId/);
    });

    it('should create and store multiple webIds', async () => {
      const xorname1 = h.createRandomXorName();
      const md1 = await authedApp.mutableData.newPublic(xorname1, TYPE_TAG);
      await md1.quickSetup({});
      const webId1 = md1.emulateAs('WebID');
      const randomPubName1 = `test_${Math.round(Math.random() * 100000)}`;
      const name1 = 'displayName';
      await webId1.create(Object.assign(profile, { uri: `safe://bbba.${randomPubName1}` }), name1);

      const xorname2 = h.createRandomXorName();
      const md2 = await authedApp.mutableData.newPublic(xorname2, TYPE_TAG);
      await md2.quickSetup({});
      const webId2 = md2.emulateAs('WebID');
      const randomPubName2 = `test_${Math.round(Math.random() * 100000)}`;
      const name2 = 'displayName2...';
      await webId2.create(Object.assign(profile, { uri: `safe://accc.${randomPubName2}` }), name2);

      const directory = await authedApp.auth.getContainer('_public');
      const entries = await directory.getEntries();
      const entriesList = await entries.listEntries();

      const webIds = await entriesList.reduce((ids, entry) => {
        const key = entry.key.toString();
        const value = entry.value.buf.toString();
        if (key.includes('/webId/') && value.length) {
          ids.push({ [key]: value });
        }
        return ids;
      }, []);

      should(webIds).be.a.Array();
      should(webIds.length).be.equal(2);
      const jsonString = JSON.stringify(webIds);

      const reg1 = new RegExp(name1);
      const reg2 = new RegExp(name2);

      should(jsonString).match(reg1);
      return should(jsonString).match(reg2);
    });
  });
});

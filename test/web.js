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

const profile = {
  uri: 'safe://mywebid.gabriel',
  name: 'Gabriel Viganotti',
  nick: 'bochaco',
  website: 'safe://mywebsite.gabriel',
  image: 'safe://mywebsite.gabriel/images/myavatar',
};

describe('getPublicNames', () => {
  let app;
  let xorname;

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


  it('should return the array of getPublicNames (a length greater than 0)', async () => {
    const authedApp = await h.publicNamesTestApp;

    const md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create(profile);

    const webIds = await authedApp.web.getPublicNames();

    should(webIds).be.a.Array();
    should(webIds.length).be.greaterThan(0);
  });
});


describe('createPublicName', () => {
  let app;
  let authedApp;
  let md;
  let fakeSubdomainRDF;
  before(async () => {
    authedApp = await h.publicNamesTestApp;
    app = await h.createAuthenticatedTestApp();
    const xorname = h.createRandomXorName();
    md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    fakeSubdomainRDF = await md.getNameAndTag();
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
    await authedApp.web.createPublicName('thisIsATestDomain', fakeSubdomainRDF);
    const publicNames = await authedApp.web.getPublicNames();

    should(publicNames).be.a.Array();
    should(publicNames).containDeep(['safe://_publicNames#thisIsATestDomain']);
  });

  it('should create two publicNames', async () => {
    await authedApp.web.createPublicName('thisIsATestDomain', fakeSubdomainRDF);
    await authedApp.web.createPublicName('thisIsASecondTestDomain', fakeSubdomainRDF);
    const publicNames = await authedApp.web.getPublicNames();

    should(publicNames).be.a.Array();
    should(publicNames).containDeep(['safe://_publicNames#thisIsATestDomain']);
    should(publicNames).containDeep(['safe://_publicNames#thisIsASecondTestDomain']);
  });
});


describe('addServiceToSubdomain', () => {
  let app;
  let authedApp;
  let md;
  let fakeServiceRDF;
  before(async () => {
    authedApp = await h.publicNamesTestApp;
    app = await h.createAuthenticatedTestApp();
    const xorname = h.createRandomXorName();
    md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    fakeServiceRDF = await md.getNameAndTag();
  });

  it('should throw when a non string subdomain is passed',
  async () => {
    try {
      await authedApp.web.addServiceToSubdomain({}, 'sss', {});
    } catch (e) {
      should(e.message).match(errConst.INVALID_SUBDOMAIN.msg);
      should(e.code).match(errConst.INVALID_SUBDOMAIN.code);
    }
  });

  it('should throw when no RDF location is provided',
  async () => {
    try {
      await authedApp.web.addServiceToSubdomain('llll', 'aaaaa', {});
    } catch (e) {
      should(e.message).match(errConst.INVALID_RDF_LOCATION.msg);
      should(e.code).match(errConst.INVALID_RDF_LOCATION.code);
    }
  });

  it('should throw when authedApp perms are not given for _publicNames',
  async () => {
    try {
      await app.web.addServiceToSubdomain('llll', 'laaaa', fakeServiceRDF);
    } catch (e) {
      should(e.message).match(/_publicNames/);
    }
  });

  it('should return a subdomain MD location', async () => {
    const location = await authedApp.web.addServiceToSubdomain('thisIsATestDomain', 'domaiin', fakeServiceRDF);

    should(location).be.a.Object();
    should(location).have.property('typeTag');
    should(location).have.property('name');
  });
});


describe('getWebIds', () => {
  let app;
  let xorname;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
    xorname = h.createRandomXorName();
  });


  it('should throw when app perms are not given for _public',
    async () => {
      try {
        await app.web.getWebIds();
      } catch (e) {
        should(e.message).match(/'_public' not found/);
      }
    });

  // not guaranteed none set.
  // it('should return empty array of _public when none set', async () => {
  //   const authedApp = await h.publicNamesTestApp;
  //   const webIds = await authedApp.web.getWebIds();
  //
  //   should(webIds).be.a.Array();
  //   should(webIds).have.length(0);
  // });


  it('should return an array representing webIds in the _public directory', async () => {
    const authedApp = await h.publicNamesTestApp;

    const md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create({ ...profile, name: 'THISTEST' }, 'searchName');

    const webIds = await authedApp.web.getWebIds();

    should(webIds).be.a.Array();
    should(webIds.length).be.greaterThan(0);


    should(webIds[0]).be.a.Object();
    // first el of webId statement array, in the array...
    should(webIds[0]['@type']).equal('http://xmlns.com/foaf/0.1/PersonalProfileDocument');
    should(webIds[0]['#me']).not.be.undefined();
    should(webIds[0]['#me']).be.a.Object();
    should(webIds[0].posts).be.a.Object();
  });
});


describe('addWebIdToDirectory', () => {
  let app;
  let authedApp;
  let md;
  let xorname;
  let webId;

  beforeEach(async () => {
    authedApp = await h.publicNamesTestApp;
    app = await h.createAuthenticatedTestApp();
    xorname = h.createRandomXorName();
    md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    await md.quickSetup({});
    webId = await md.emulateAs('WebID');
  });


  it('should throw when no uri is provided',
  async () => {
    try {
      await authedApp.web.addWebIdToDirectory({});
    } catch (e) {
      should(e.message).match(errConst.INVALID_URL.msg);
      should(e.code).match(errConst.INVALID_URL.code);
    }
  });

  it('should throw when authedApp perms are not given for _public',
  async () => {
    try {
      await app.web.addWebIdToDirectory('aaa.fakeWebIdUri');
    } catch (e) {
      should(e.message).match(/'_public' not found/);
    }
  });

  it('should create a directory listing for the webId', async () => {
    const name1 = 'dirCreated';
    await webId.create({ ...profile, uri: 'safe://aaaa.fakeWebIdUri' }, name1);

    const directory = await authedApp.auth.getContainer('_public');
    const directoryRDF = await directory.emulateAs('rdf');

    await directoryRDF.nowOrWhenFetched();

    const serlialised = await directoryRDF.serialise('application/ld+json');

    const parsed = JSON.parse(serlialised);

    should(directoryRDF).be.a.Object();
    should(parsed).be.a.Object();
    should(parsed[0]['@id']).match(/_public\/webId/);
  });


  it('should create and store multiple webIds', async () => {
    const xorname1 = h.createRandomXorName();
    const md1 = await authedApp.mutableData.newPublic(xorname1, TYPE_TAG);
    await md1.quickSetup({});

    const webId1 = await md1.emulateAs('WebID');

    const name1 = 'displayName';
    await webId1.create({ ...profile, uri: 'safe://bbba.fakeWebIdUri1' }, name1);

    const xorname2 = h.createRandomXorName();
    const md2 = await authedApp.mutableData.newPublic(xorname2, TYPE_TAG);
    await md2.quickSetup({});
    const webId2 = await md2.emulateAs('WebID');

    const name2 = 'displayName2...';
    await webId2.create({ ...profile, uri: 'safe://accc.fakeWebIdUri2' }, name2);

    const directory = await authedApp.auth.getContainer('_public');
    const directoryRDF = directory.emulateAs('rdf');

    const graphName = 'safe://_public/webId';
    directoryRDF.setId(graphName);

    const entries = await directory.getEntries();
    const entriesList = await entries.listEntries();

      // TODO: Encrypt/Decrypting.
    const webIds = await entriesList.map((entry) => {
      const key = entry.key.toString();
      const value = entry.value.buf.toString();


      const theId = {};
      if (key.includes('/webId/') && value.length) {
        theId[key] = value;
      }
      return theId;
    });


      // todo. DO and check this in webId + tests.
      // const webIdsRdf = await authedApp.web.getWebIds();
      // const webIds = await authedApp.web.getWebIds();


      // const ourName = webIdsRdf.each(undefined, webIdsRdf.vocabs.SAFETERMS('xorName'));
      // // ourName.serialse();
      // // console.log('serial', await webIdsRdf.serialise('application/ld+json'))
      // ourName.forEach( name =>
      // {
      //   console.log('OURNAME', name)
      // });


      // const answer = webIdsRdf.graph.query()
      // should(webIdsRdf).be.a.Object();
      // TODO: We cannot get from the RDF a specific title AND it's xorName :|
    should(webIds).be.a.Array();
    should(webIds.length).be.above(2);
    const jsonString = JSON.stringify(webIds);

    const reg1 = new RegExp(name1);
    const reg2 = new RegExp(name2);
    // const reg3 = new RegExp(name3);

    should(jsonString).match(reg1);
    should(jsonString).match(reg2);
    // should(jsonString).match(reg3);

      // TODO this test properly....
      // should(webIds).containDeep([{ 'http://purl.org/dc/terms/title': [ {'@value':name1 } ] }]);
      // should(webIds).containDeep([{ 'http://purl.org/dc/terms/title': [ {'@value':name2 } ] }]);
      // should(webIds).containDeep([{ 'http://purl.org/dc/terms/title': [ {'@value':name3 } ] }]);


      // should(webIds).be.a.Array();
      // should(webIds).containDeep([`safe://_public/webId/${fakeWebIdRdf.name.toString()}`]);

      // should(location).be.a.Object();
      // should(location).have.property('typeTag');
      // should(location).have.property('name');
  });
});

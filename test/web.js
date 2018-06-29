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
  nickname: 'bochaco',
  website: 'safe://mywebsite.gabriel',
  avatar: 'safe://mywebsite.gabriel/images/myavatar',
};

describe.only('getPublicNames', () => {
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
    const webIds = await authedApp.web.getPublicNames();
    //
    // should(webIds).be.a.Array();
    // should(webIds).have.length(0);
  });


  it('should return the array of getPublicNames', async () => {
    const authedApp = await h.publicNamesTestApp;

    const md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create(profile);

    const webIds = await authedApp.web.getPublicNames();

    // should(webIds).be.a.Array();
    //
    // should(webIds).have.length(3);
  });
});


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
});


describe.only('addServiceToSubdomain', () => {
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



describe.only('getWebIds', () => {
  let app;
  let xorname;
  const TYPE_TAG = 15639;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
    xorname = h.createRandomXorName();
  });


  it('should throw when app perms are not given for _public',
    async () => {
      try {
        await app.web.getWebIds();
      } catch (e) {
        should(e.message).match(/\'_public\' not found/);
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

    // const webIdsRdf = await authedApp.web.getWebIds();
    const webIds = await authedApp.web.getWebIds();

    // const ourName = webIdsRdf.statementsMatching(undefined, webIdsRdf.vocabs.DCTERMS('title'), 'searchName');
    should(webIds).be.a.Array();
    should(webIds).have.length(1);
    should(webIds).containDeep([{title:'searchName'}]);

    // should(webIdsRdf).be.a.Object();
    // should(ourName).be.a.Array();
    // should(ourName).have.length(1);
  });
});


describe.only('addWebIdToDirectory', () => {
  let app;
  let authedApp;
  let md;
  let fakeWebIdRdf;

  before(async () => {
    authedApp = await h.publicNamesTestApp;
    app = await h.createAuthenticatedTestApp();
    const xorname = h.createRandomXorName();
    md = await authedApp.mutableData.newPublic(xorname, TYPE_TAG);
    fakeWebIdRdf = await md.getNameAndTag();
  });


  it('should throw when no RDF location is provided',
  async () => {
    try {
      await authedApp.web.addWebIdToDirectory({});
    } catch (e) {
      should(e.message).match(errConst.INVALID_RDF_LOCATION.msg);
      should(e.code).match(errConst.INVALID_RDF_LOCATION.code);
    }
  });

  it('should throw when authedApp perms are not given for _public',
  async () => {
    try {
      await app.web.addWebIdToDirectory(fakeWebIdRdf);
    } catch (e) {
      should(e.message).match(/\'_public\' not found/);
    }
  });

  it('should create a directory listing for the webId', async () => {
    await authedApp.web.addWebIdToDirectory(fakeWebIdRdf, 'displayName...');

    // todo. DO and check this in webId + tests.
    // const webIdsRdf = await authedApp.web.getWebIds();
    const webIds = await authedApp.web.getWebIds();


    // const ourName = webIdsRdf.each(undefined, webIdsRdf.vocabs.SAFETERMS('xorName'));
    // // ourName.serialse();
    // // console.log('serial', await webIdsRdf.serialise('application/ld+json'))
    // ourName.forEach( name =>
    // {
    //   console.log('OURNAME', name)
    // });


    // const answer = webIdsRdf.graph.query()
    // should(webIdsRdf).be.a.Object();
    should(webIds).be.a.Array();
    should(webIds).have.length(1);

    // TODO: We cannot get from the RDF a specific title AND it's xorName :|


    // should(webIds).be.a.Array();
    // should(webIds).containDeep([`safe://_public/webId/${fakeWebIdRdf.name.toString()}`]);

    // should(location).be.a.Object();
    // should(location).have.property('typeTag');
    // should(location).have.property('name');
  });
});

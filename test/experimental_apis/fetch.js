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
const helpers = require('../helpers');
const errConst = require('../../src/error_const');
const { pubConsts: CONSTANTS } = require('../../src/consts');

const createAuthenticatedTestApp = helpers.createAuthenticatedTestApp;
const createUnregisteredTestApp = helpers.createUnregisteredTestApp;
const createRandomDomain = helpers.createRandomDomain;

const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };

describe('Experimental fetch function', () => {
  let app;
  let unregisteredApp;
  before(async () => {
    app = await createAuthenticatedTestApp({ scope: '_test_scope' },
                                            containersPermissions, null,
                                            { enableExperimentalApis: true });
    // we enable the experimental APIs for this set of tests
    unregisteredApp = await createUnregisteredTestApp({ enableExperimentalApis: true });
  });

  it('fail if experimental apis not enabled', async () => {
    let error;
    const safeApp = await createUnregisteredTestApp({ enableExperimentalApis: false });
    try {
      await safeApp.fetch();
    } catch (err) {
      error = err;
    }
    return should(error.message).equal(errConst.EXPERIMENTAL_API_DISABLED.msg('fetch'));
  });

  it('fetch an NFS resource', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const filePath = '/yumyum.html';
    const { domain } = await createRandomDomain(content, filePath, '', app);
    const url = `safe://${domain}${filePath}#me`;

    const networkResource = await unregisteredApp.fetch(url);
    should(networkResource.resourceType).equal('NFS');
    should(networkResource.parsedPath).equal(filePath);
    const nfs = networkResource.content.emulateAs('nfs');
    const retrievedFile = await nfs.fetch(filePath);
    const file = await nfs.open(retrievedFile, CONSTANTS.NFS_FILE_MODE_READ);
    const data = await file.read(CONSTANTS.NFS_FILE_START, CONSTANTS.NFS_FILE_END);
    return should(data.toString()).be.equal(content);
  });

  it('fetch a MutableData resource', async () => {
    const key = 'some key string';
    const value = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const md = await app.mutableData.newRandomPublic(16839);
    await md.quickSetup({ [key]: value });
    const info = await md.getNameAndTag();
    should(info.xorUrl).not.be.undefined();

    const networkResource = await unregisteredApp.fetch(info.xorUrl);
    should(networkResource.resourceType).equal('MD');
    should(networkResource.parsedPath).equal('');
    const data = await networkResource.content.get(key);
    return should(data.buf.toString()).be.equal(value);
  });

  it('fetch an ImmutableData resource', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(content);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const getXorUrl = true;
    const immDataAddr = await idWriter.close(cipherOpt, getXorUrl);
    should(immDataAddr.xorUrl).not.be.undefined();

    const networkResource = await unregisteredApp.fetch(immDataAddr.xorUrl);
    const data = await networkResource.content.read();
    should(networkResource.resourceType).equal('IMMD');
    should(networkResource.parsedPath).equal('');
    return should(data.toString()).be.equal(content);
  });

  it('fetch an RDF resource', async () => {
    const randomName = `test_${Math.round(Math.random() * 100000)}`;
    const newApp = await helpers.publicNamesTestApp();
    const { serviceMd } = await createRandomDomain('', '', '', newApp);
    const info = await serviceMd.getNameAndTag();
    should(info.xorUrl).not.be.undefined();
    const profile = {
      uri: `safe://mywebid.${randomName}`,
      name: randomName,
      nick: randomName,
      website: `safe://mywebsite.${randomName}`,
      image: `safe://mywebsite.${randomName}/images/myavatar`,
    };
    const webId = serviceMd.emulateAs('WebID');
    await webId.create(profile);
    const serialisedWebID = await webId.serialise();

    const networkResource = await unregisteredApp.fetch(profile.uri);
    should(networkResource.resourceType).equal('RDF');
    should(networkResource.parsedPath).equal('');
    const rdf = networkResource.content.emulateAs('rdf');
    await rdf.nowOrWhenFetched();
    const serialised = await rdf.serialise();
    return should(serialised).be.equal(serialisedWebID);
  });
});

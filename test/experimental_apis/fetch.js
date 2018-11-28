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
    return should(networkResource.content.get(filePath)).be.fulfilled();
  });

  // not supported yet, it needs support for XOR-URL
  it.skip('fetch a MD resource', async () => {
  });

  // not supported yet, it needs support for XOR-URL
  it.skip('fetch an IMD resource', async () => {
  });
});

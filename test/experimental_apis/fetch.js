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
const consts = require('../../src/consts');
const errConst = require('../../src/error_const');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createUnregisteredTestApp = h.createUnregisteredTestApp;

const createRandomDomain = async (content, path, service, authedApp) => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = authedApp || await createAuthenticatedTestApp();
  return app.mutableData.newRandomPublic(consts.TAG_TYPE_WWW)
    .then((serviceMdata) => serviceMdata.quickSetup()
      .then(() => {
        const nfs = serviceMdata.emulateAs('NFS');
        // let's write the file
        return nfs.create(content)
          .then((file) => nfs.insert(path || '/index.html', file))
          .then(() => app.crypto.sha3Hash(domain)
            .then((dnsName) => app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS)
              .then((dnsData) => serviceMdata.getNameAndTag()
                  .then((res) => {
                    const payload = {};
                    payload[service || 'www'] = res.name;
                    return dnsData.quickSetup(payload);
                  }))));
      }))
    .then(() => domain);
};

const createRandomPrivateServiceDomain = async (content, path, service, authedApp) => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = authedApp || await createAuthenticatedTestApp();
  return app.mutableData.newRandomPrivate(consts.TAG_TYPE_WWW)
    .then((serviceMdata) => serviceMdata.quickSetup()
      .then(() => {
        const nfs = serviceMdata.emulateAs('NFS');
        // let's write the file
        return nfs.create(content)
          .then((file) => nfs.insert(path || '', file))
          .then(() => app.crypto.sha3Hash(domain)
            .then((dnsName) => app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS))
              .then((dnsData) => serviceMdata.serialise()
                  .then((serial) => {
                    const payload = {};
                    payload[service || ''] = serial;
                    return dnsData.quickSetup(payload);
                  })));
      }))
    .then(() => domain);
};

const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };

describe('Fetching native objects', () => {
  let app;
  let unregisteredApp;
  before(async () => {
    app = await createAuthenticatedTestApp({ scope: '_test_scope' }, containersPermissions);
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

  it('fetch content', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const domain = await createRandomDomain(content, '', '', app);
    const url = `safe://${domain}`;
    const data = await unregisteredApp.fetch(url);
    return should(data).equal(url);
  });

  it('fetch private content', async () => {
    const content = `hello private world, on ${Math.round(Math.random() * 100000)}`;
    const domain = await createRandomPrivateServiceDomain(content, '/yumyum.html', '', app);
    const url = `safe://${domain}/yumyum.html`;
    const data = await unregisteredApp.fetch(url);
    return should(data).equal(url);
  });
});

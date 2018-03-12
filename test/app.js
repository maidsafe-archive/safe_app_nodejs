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
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createTestAppWithNetworkCB = h.createTestAppWithNetworkCB;
const createTestAppWithOptions = h.createTestAppWithOptions;

describe('Smoke test', () => {
  it('can take a network state callback', async () => {
    const networkCb = (state) => `NETWORK STATE: ${state}`;
    const app = await createTestAppWithNetworkCB(
      null,
      networkCb
    );
    should.exist(app._networkStateCallBack); // eslint-disable-line no-underscore-dangle
  });

  it('can take an options object to configure logging and scheme registration', async () => {
    const optionsObject = {
      log: false,
      registerScheme: false,
      joinSchemes: ['proto'],
      configPath: '/home'
    };
    const app = await createTestAppWithOptions(
      null,
      optionsObject
    );

    const optionsObjectsEqual = Object.keys(app.options).every(
      (option) => app.options[option] === optionsObject[option]
    );
    should(optionsObjectsEqual).be.true();
  });

  it('is rejected if options object contains non-string configPath value', () => {
    const optionsObject = {
      log: true,
      registerScheme: false,
      joinSchemes: ['proto'],
      configPath: { path: '/home' } // this is expected to be a string
    };
    should(createTestAppWithOptions(
      null,
      optionsObject
    )).be.rejectedWith(errConst.CONFIG_PATH_ERROR.msg('TypeError: error setting argument 0 - "string" must be a string, Buffer, or ArrayBuffer'));
  });

  it('creates registered for testing', async () => {
    const app = await createAuthenticatedTestApp();
    should(app.auth.registered).be.true();
  }).timeout(20000);

  it('clears object cache invalidating objects', () => createAuthenticatedTestApp()
    .then((app) => app.mutableData.newMutation()
      .then((mut) => should(mut.insert('key1', 'value1')).be.fulfilled()
        .then(() => should(app.clearObjectCache()).be.fulfilled())
        .then(() => should(mut.insert('key2', 'value2')).be.rejectedWith('Invalid MutableData entry actions handle'))
      )
      .then(() => should(app.mutableData.newMutation()).be.fulfilled())
    )
  ).timeout(20000);

  it('validate is mock build', async () => {
    const app = await createTestApp();
    should(app.isMockBuild()).be.true();
  });

  it('should build an alternative if there is a scope', async () => {
    const firstApp = await createTestApp();
    return firstApp.auth.genAuthUri({ _public: ['Insert'] })
      .then(async (firstResp) => {
        const secondApp = await createTestApp('website');
        return secondApp.auth.genAuthUri({ _public: ['Insert'] })
            .then((secondResp) => should(secondResp.uri).startWith('safe-auth:').not.equal(firstResp.uri));
      });
  });

  it('should throw informative error, if App info is malformed', () => {
    should(App({
      info: {
        id: 'net.maidsafe.test.javascript.id',
        name: 'JS Test',
        vendor: 'MaidSafe Ltd.',
        scope: null
      }
    })).be.rejectedWith(errConst.MALFORMED_APP_INFO.msg);
  });

  it('should throw informative error, if App properties, excepting scope, are empty', () => {
    should(App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'JS Test',
      vendor: ' ',
      scope: null
    }))
    .be.rejectedWith(errConst.MALFORMED_APP_INFO.msg);
  });

  it('should return account information', async () => {
    const app = await createAuthenticatedTestApp();
    const accInfo = await app.getAccountInfo();
    should(accInfo).have.properties(['mutations_done', 'mutations_available']);
  }).timeout(10000);

  it('should return own container name', async () => {
    const app = await createAuthenticatedTestApp();
    const contName = await app.getOwnContainerName();
    should(contName).be.equal(`apps/${app.appInfo.id}`);
  }).timeout(10000);

  it('should increment/decrement mutation values', async () => {
    const app = await createAuthenticatedTestApp();
    const accInfoBefore = await app.getAccountInfo();
    const idWriter = await app.immutableData.create();
    const testString = `test-${Math.random()}`;
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    await idWriter.close(cipherOpt);
    const accInfoAfter = await app.getAccountInfo();
    should(accInfoAfter.mutations_done).be.equal(accInfoBefore.mutations_done + 1);
    should(accInfoAfter.mutations_available).be.equal(accInfoBefore.mutations_available - 1);
  }).timeout(20000);

  it('should throw error if getAccountInfo called on unregistered app', async () => {
    const app = await h.createTestApp();
    await app.auth.loginFromURI(h.authUris.unregisteredUri);
    return should(app.getAccountInfo()).be.rejected();
  });

  it('should throw error if no auth URI is present during login', async () => {
    const app = await h.createTestApp();
    const test = () => app.auth.loginFromURI();
    should(test).throw(errConst.MISSING_AUTH_URI.msg);
  });

  it('returns safe_client_libs log path', async () => {
    const app = await createAuthenticatedTestApp();
    return should(app.logPath()).be.fulfilled();
  }).timeout(10000);

  it('logs in to netowrk from existing authUri', async () => should(h.App.fromAuthUri(h.appInfo, h.authUris.registeredUri))
    .be.fulfilled());

  it('throws error if fromAuthUri missing authUri argument', async () => {
    should(h.App.fromAuthUri(h.appInfo))
      .be.rejectedWith(errConst.MISSING_AUTH_URI.msg);
  });

  it('throws error if fromAuthUri missing appInfo argument', async () => {
    should(h.App.fromAuthUri(h.authUris.registeredUri))
      .be.rejectedWith(errConst.MALFORMED_APP_INFO.msg);
  });

  it('returns boolean for network state', async () => {
    const app = await createAuthenticatedTestApp();
    should(app.isNetStateInit()).be.true();
    should(app.isNetStateConnected()).be.false();
    should(app.isNetStateDisconnected()).be.false();
    should(app.networkState).be.equal('Init');
  }).timeout(10000);

  it('network state upon network disconnection event', (done) => {
    const networkCb = (state) => {
      should(state).be.equal('Disconnected');
      should(app.isNetStateInit()).be.false();
      should(app.isNetStateConnected()).be.false();
      should(app.isNetStateDisconnected()).be.true();
      should(app.networkState).be.equal('Disconnected');
      done();
    };

    const app = createTestAppWithNetworkCB(null, networkCb);
    should(app.isNetStateInit()).be.true();
    should(app.isNetStateConnected()).be.false();
    should(app.isNetStateDisconnected()).be.false();
    should(app.networkState).be.equal('Init');

    app.auth.loginFromURI(h.authUris.registeredUri)
      .then(() => {
        should(app.isNetStateInit()).be.false();
        should(app.isNetStateConnected()).be.true();
        should(app.isNetStateDisconnected()).be.false();
        should(app.networkState).be.equal('Connected');
        app.auth.simulateNetworkDisconnect();
      });
  }).timeout(5000);
}).timeout(15000);

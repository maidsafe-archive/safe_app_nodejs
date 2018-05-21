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
const createTestAppNoInit = h.createTestAppNoInit;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createTestAppWithNetworkCB = h.createTestAppWithNetworkCB;
const createTestAppWithOptions = h.createTestAppWithOptions;
const { autoref } = require('../src/helpers');

describe('Smoke test', () => {
  it('should return undefined value if log option is true, however app logging is not initialised', async () => {
    const app = await createTestAppNoInit(null, { log: true });
    const logPath = await app.logPath();
    return should(logPath).be.undefined();
  });

  it('should return log path string if app logging is initialised and no filename provided', async () => {
    const app = await createTestAppWithOptions(null, { log: true });
    const logPath = await app.logPath();
    const filename = `${appInfo.name}.${appInfo.vendor}`.replace(/[^\w\d_\-.]/g, '_');
    return should(new RegExp(filename).test(logPath)).be.true();
  });

  it('should native resolve log path if filename provided', async () => {
    const app = await createTestApp();
    const filename = `${appInfo.name}.${appInfo.vendor}`.replace(/[^\w\d_\-.]/g, '_');
    return should(app.logPath(filename)).be.fulfilled()
      .then((res) => should(res).match(new RegExp(filename)));
  });

  it('can take a network state callback', async () => {
    const networkCb = (state) => `NETWORK STATE: ${state}`;
    const app = await createTestAppWithNetworkCB(
      null,
      networkCb
    );
    return should.exist(app._networkStateCallBack); // eslint-disable-line no-underscore-dangle
  });

  it('can take an options object to configure logging and scheme registration', async () => {
    const optionsObject = {
      log: false,
      registerScheme: false,
      joinSchemes: ['proto'],
      configPath: '/home',
      forceUseMock: false,
    };
    const app = await createTestAppWithOptions(null, optionsObject);

    const optionsObjectsEqual = Object.keys(app.options).every(
      (option) => app.options[option] === optionsObject[option]
    );
    return should(optionsObjectsEqual).be.true();
  });

  it('is rejected if options object contains non-string configPath value', () => {
    const optionsObject = {
      log: true,
      registerScheme: false,
      joinSchemes: ['proto'],
      configPath: { path: '/home' } // this is expected to be a string
    };
    return should(createTestAppWithOptions(
      null,
      optionsObject
    )).be.rejectedWith(errConst.CONFIG_PATH_ERROR.msg('TypeError: error setting argument 0 - "string" must be a string, Buffer, or ArrayBuffer'));
  });

  it('throw error if options object contains non-boolean forceUseMock value', () => {
    const test = () => autoref(new App(h.appInfo, null, {
      forceUseMock: 'true' // this is expected to be a boolean
    }));
    should(test).throw("The 'forceUseMock' option must be a boolean.");
  });

  it('creates registered for testing', async () => {
    const app = await createAuthenticatedTestApp();
    return should(app.auth.registered).be.true();
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
    return should(app.isMockBuild()).be.true();
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

  it('throws error if connection getter is called on unregistered app', () => {
    const app = new App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'NodeJS Test',
      vendor: 'MaidSafe.net Ltd'
    }, null, { log: false });
    const test = () => app.connection;
    return should(test).throw(errConst.SETUP_INCOMPLETE.msg);
  });

  it('should resolve reconnect operation for registered app', async () => {
    const app = await createAuthenticatedTestApp();
    return should(app.reconnect()).be.fulfilled();
  });

  it('should throw informative error, if App info is malformed', () => {
    const test = () => new App({
      info: {
        id: 'net.maidsafe.test.javascript.id',
        name: 'JS Test',
        vendor: 'MaidSafe Ltd.',
        scope: null
      }
    });
    return should(test).throw(errConst.MALFORMED_APP_INFO.msg);
  });

  it('should throw informative error, if App properties, excepting scope, are empty', () => {
    const test = () => new App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'JS Test',
      vendor: ' ',
      scope: null
    });
    return should(test).throw(errConst.MALFORMED_APP_INFO.msg);
  });

  it('should return account information', async () => {
    const app = await createAuthenticatedTestApp();
    const accInfo = await app.getAccountInfo();
    return should(accInfo).have.properties(['mutations_done', 'mutations_available']);
  }).timeout(10000);

  it('should return own container name', async () => {
    const app = await createAuthenticatedTestApp();
    const contName = await app.getOwnContainerName();
    return should(contName).be.equal(`apps/${app.appInfo.id}`);
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
    return should(accInfoAfter.mutations_available).be.equal(accInfoBefore.mutations_available - 1);
  }).timeout(20000);

  it('should throw error if getAccountInfo called on unregistered app', async () => {
    const app = await h.createTestApp();
    await app.auth.loginFromUri(h.authUris.unregisteredUri);
    return should(app.getAccountInfo()).be.rejected();
  });

  it('should throw error if no auth URI is present during login', async () => {
    const app = await h.createTestApp();
    const test = () => app.auth.loginFromUri();
    return should(test).throw(errConst.MISSING_AUTH_URI.msg);
  });

  it('returns safe_client_libs log path', async () => {
    const app = await createAuthenticatedTestApp();
    return should(app.logPath()).be.fulfilled();
  }).timeout(10000);

  it('logs in to network from existing authUri', async () => should(h.App.fromAuthUri(h.appInfo, h.authUris.registeredUri))
    .be.fulfilled());

  it('throws error if fromAuthUri missing authUri argument', () => should(h.App.fromAuthUri(h.appInfo))
      .be.rejectedWith(errConst.MISSING_AUTH_URI.msg));

  it('throws error if fromAuthUri missing appInfo argument', () => should(h.App.fromAuthUri(h.authUris.registeredUri))
      .be.rejectedWith(errConst.MALFORMED_APP_INFO.msg));

  it('returns boolean for network state', async () => {
    const app = await createAuthenticatedTestApp();
    should(app.isNetStateInit()).be.true();
    should(app.isNetStateConnected()).be.false();
    should(app.isNetStateDisconnected()).be.false();
    return should(app.networkState).be.equal('Init');
  }).timeout(10000);

  it('network state upon network connection event', (done) => {
    const networkCb = (state) => {
      should(state).be.equal('Connected');
      should(app.isNetStateInit()).be.false();
      should(app.isNetStateConnected()).be.true();
      should(app.isNetStateDisconnected()).be.false();
      should(app.networkState).be.equal('Connected');
      done();
    };

    const appConfig = new App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'NodeJS Test',
      vendor: 'MaidSafe.net Ltd'
    }, networkCb, { log: false });
    const app = autoref(appConfig);
    should(app.isNetStateInit()).be.true();
    should(app.isNetStateConnected()).be.false();
    should(app.isNetStateDisconnected()).be.false();
    should(app.networkState).be.equal('Init');

    app.auth.loginFromUri(h.authUris.registeredUri)
      .then(() => {
        should(app.isNetStateInit()).be.false();
        should(app.isNetStateConnected()).be.true();
        should(app.isNetStateDisconnected()).be.false();
        should(app.networkState).be.equal('Connected');
      });
  }).timeout(5000);

  it('network state upon network disconnection event', (done) => {
    let cbCount = 0;
    const networkCb = () => {
      if (cbCount === 1) {
        should(app.networkState).be.equal('Disconnected');
        done();
      }
      cbCount++; // eslint-disable-line
    };

    const appConfig = new App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'NodeJS Test',
      vendor: 'MaidSafe.net Ltd'
    }, networkCb, { log: false });
    const app = autoref(appConfig);

    app.auth.loginFromURI(h.authUris.registeredUri)
      .then(() => {
        should(app.networkState).be.equal('Connected');
        app.auth.simulateNetworkDisconnect();
      });
  }).timeout(5000);

  it('network state upon network reconnect event', (done) => {
    let cbCount = 0;
    const networkCb = () => {
      if (cbCount === 1) {
        should(app.networkState).be.equal('Disconnected');
      }

      if (cbCount === 2) {
        should(app.networkState).be.equal('Connected');
        done();
      }
      cbCount++; // eslint-disable-line
    };

    const appConfig = new App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'NodeJS Test',
      vendor: 'MaidSafe.net Ltd'
    }, networkCb, { log: false });
    const app = autoref(appConfig);

    app.auth.loginFromURI(h.authUris.registeredUri)
      .then(() => {
        should(app.networkState).be.equal('Connected');
        app.auth.simulateNetworkDisconnect()
          .then(() => setTimeout(() => app.reconnect(), 100));
      });
  }).timeout(5000);
}).timeout(15000);

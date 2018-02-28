const should = require('should');
const h = require('./helpers');
const App = require('../src/app');
const appHelpers = require('../src/helpers');
const errConst = require('../src/error_const');

const createTestApp = h.createTestApp;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createTestAppWithNetworkCB = h.createTestAppWithNetworkCB;
const createTestAppWithOptions = h.createTestAppWithOptions;

describe('Smoke test', () => {
  it('can take a network state callback', () => {
    const networkCb = (state) => `NETWORK STATE: ${state}`;
    const app = createTestAppWithNetworkCB(
      null,
      networkCb
    );
    return should.exist(app._networkStateCallBack); // eslint-disable-line no-underscore-dangle
  });

  it('can take an options object to configure logging and scheme registration', () => {
    const optionsObject = {
      log: false,
      registerScheme: false,
      joinSchemes: ['proto'],
      configPath: '/home'
    };
    const app = createTestAppWithOptions(
      null,
      optionsObject
    );

    const optionsObjectsEqual = Object.keys(app.options).every(
      (option) => app.options[option] === optionsObject[option]
    );
    return should(optionsObjectsEqual).be.true();
  });

  it('logs error if options object contains invalid configPath value', () => {
    const optionsObject = {
      log: true,
      registerScheme: false,
      joinSchemes: ['proto'],
      configPath: { path: '/home' }
    };
    createTestAppWithOptions(
      null,
      optionsObject
    );
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

  it('validate is mock build', () => {
    const app = createTestApp();
    return should(app.isMockBuild()).be.true();
  });

  it('should build an alternative if there is a scope', () => {
    const firstApp = createTestApp();
    return firstApp.auth.genAuthUri({ _public: ['Insert'] })
      .then((firstResp) => {
        const secondApp = createTestApp('website');
        return secondApp.auth.genAuthUri({ _public: ['Insert'] })
            .then((secondResp) => should(secondResp.uri).startWith('safe-auth:').not.equal(firstResp.uri));
      });
  });

  it('should throw informative error, if App info is malformed', () => {
    const test = () => appHelpers.autoref(new App({
      info: {
        id: 'net.maidsafe.test.javascript.id',
        name: 'JS Test',
        vendor: 'MaidSafe Ltd.',
        scope: null
      }
    }));
    return should(test).throw(errConst.MALFORMED_APP_INFO.msg);
  });

  it('should throw informative error, if App properties, excepting scope, are empty', () => {
    const test = () => appHelpers.autoref(new App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'JS Test',
      vendor: ' ',
      scope: null
    }));
    return should(test).throw(errConst.MALFORMED_APP_INFO.msg);
  });

  it('should return account information', async () => {
    const app = await createAuthenticatedTestApp();
    const accInfo = await app.getAccountInfo();
    return should(accInfo).have.properties(['mutations_done', 'mutations_available']);
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
    const app = h.createTestApp();
    await app.auth.loginFromURI(h.authUris.unregisteredUri);
    return should(app.getAccountInfo()).be.rejected();
  });

  it('should throw error if no auth URI is present during login', () => {
    const app = h.createTestApp();
    const test = () => app.auth.loginFromURI();
    return should(test).throw(errConst.MISSING_AUTH_URI.msg);
  });

  it('returns safe_client_libs log path', async () => {
    const app = await createAuthenticatedTestApp();
    return should(app.logPath()).be.fulfilled();
  }).timeout(10000);

  it('logs in to netowrk from existing authUri', async () => should(h.App.fromAuthUri(h.appInfo, h.authUris.registeredUri))
    .be.fulfilled());

  it('throws error if fromAuthUri missing authUri argument', async () => {
    const test = () => h.App.fromAuthUri(h.appInfo);
    return should(test).throw(errConst.MISSING_AUTH_URI.msg);
  });

  it('throws error if fromAuthUri missing appInfo argument', async () => {
    const test = () => h.App.fromAuthUri(h.authUris.registeredUri);
    return should(test).throw(errConst.MALFORMED_APP_INFO.msg);
  });

  it('returns boolean for network state', async () => {
    const app = await createAuthenticatedTestApp();
    should(app.isNetStateInit()).be.true();
    should(app.isNetStateConnected()).be.false();
    should(app.isNetStateDisconnected()).be.false();
    return should(app.networkState).be.equal('Init');
  }).timeout(10000);
}).timeout(15000);

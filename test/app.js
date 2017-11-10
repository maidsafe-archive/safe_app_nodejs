const should = require('should');
const h = require('./helpers');
const App = require('../src/app');
const appHelpers = require('../src/helpers');

const createTestApp = h.createTestApp;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createTestAppWithNetworkCB = h.createTestAppWithNetworkCB;
const createTestAppWithOptions = h.createTestAppWithOptions;

describe('Smoke test', function testContainer() { // eslint-disable-line prefer-arrow-callback
  this.timeout(15000);
  it('unauthorised connection', () => {
    const app = createTestApp();
    return app.auth.genConnUri()
      .then((resp) => {
        should(resp.uri).is.not.undefined();
        should(resp.uri).startWith('safe-auth:');
      });
  });

  it('should build some authentication uri', () => {
    const app = createTestApp();
    return app.auth.genAuthUri({ _public: ['Read'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('can take a network state callback', () => {
    const networkCb = (state) => `NETWORK STATE: ${state}`;
    const app = createTestAppWithNetworkCB(
      null,
      networkCb
    );
    should.exist(app._networkStateCallBack); // eslint-disable-line no-underscore-dangle
  });

  it('can take an options object to configure logging and scheme registration', () => {
    const optionsObject = {
      log: false,
      registerScheme: false,
      joinSchemes: ['proto']
    };
    const app = createTestAppWithOptions(
      null,
      optionsObject
    );

    const optionsObjectsEqual = Object.keys(app.options).every(
      (option) => app.options[option] === optionsObject[option]
    );
    should(optionsObjectsEqual).be.true();
  });

  it('should build some containers uri', () => {
    const app = createTestApp();
    return app.auth.genContainerAuthUri({ private: ['Insert'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should build some shared MD uri', () => {
    const app = createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ type_tag: 15001, name: sharedMdXorName, perms: ['Insert'] }];
    return app.auth.genShareMDataUri(perms)
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('creates registered for testing', function testingCreated() {
    this.timeout(20000);
    const app = createAuthenticatedTestApp();
    should(app.auth.registered).be.true();
  });

  it('clears object cache invalidating objects', function testingCreated() {
    this.timeout(20000);
    const app = createAuthenticatedTestApp();
    return app.mutableData.newMutation()
      .then((mut) => should(mut.insert('key1', 'value1')).be.fulfilled()
        .then(() => should(app.clearObjectCache()).be.fulfilled())
        .then(() => should(mut.insert('key2', 'value2')).be.rejectedWith('Invalid MutableData entry actions handle'))
      )
      .then(() => should(app.mutableData.newMutation()).be.fulfilled());
  });

  it('validate is mock build', () => {
    const app = createTestApp();
    should(app.isMockBuild()).be.true();
  });

  it('should build an alternative if there is a scope', () => {
    const firstApp = createTestApp();
    return firstApp.auth.genAuthUri({ _public: ['Insert'] })
      .then((firstResp) => {
        const secondApp = createTestApp('website');
        return secondApp.auth.genAuthUri({ _public: ['Insert'] })
            .then((secondResp) => {
              should(secondResp.uri).startWith('safe-auth:');
              should(secondResp.uri).not.equal(firstResp.uri);
            });
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

    should.throws(test);
  });

  it('should throw informative error, if App properties, excepting scope, are empty', () => {
    const test = () => appHelpers.autoref(new App({
      id: 'net.maidsafe.test.javascript.id',
      name: 'JS Test',
      vendor: ' ',
      scope: null
    }));

    should.throws(test);
  });

  it('should return account information', async function test() { // eslint-disable-line prefer-arrow-callback
    this.timeout(10000);
    const app = createAuthenticatedTestApp();
    const accInfo = await app.getAccountInfo();
    should(accInfo).have.properties(['mutations_done', 'mutations_available']);
  });

  it('should increment/decrement mutation values', async function test() { // eslint-disable-line prefer-arrow-callback
    this.timeout(10000);
    const app = createAuthenticatedTestApp();
    const accInfoBefore = await app.getAccountInfo();
    const idWriter = await app.immutableData.create();
    const testString = `test-${Math.random()}`;
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    await idWriter.close(cipherOpt);
    const accInfoAfter = await app.getAccountInfo();
    should(accInfoAfter.mutations_done).be.equal(accInfoBefore.mutations_done + 1);
    should(accInfoAfter.mutations_available).be.equal(accInfoBefore.mutations_available - 1);
  });

  it('should throw error if getAccountInfo called on unregistered app', async function test() {
    this.timeout(10000);
    const app = h.createTestApp();
    await app.auth.loginFromURI(h.authUris.unregisteredUri);
    should(app.getAccountInfo()).be.rejected();
  });

  it('exposes network state constants', () => {
    const app = createAuthenticatedTestApp();
    should(app.CONSTANTS).have.properties(['INIT', 'CONNECTED', 'DISCONNECTED', 'UNKNOWN']);
  });

  it('returns boolean for network state: INIT', () => {
    const app = createAuthenticatedTestApp();
    should.exist(app.isNetStateInit);
  });

  it('returns boolean for network state: CONNECTED', () => {
    const app = createAuthenticatedTestApp();
    should.exist(app.isNetStateConnected);
  });


  it('returns boolean for network state: DISCONNECTED', () => {
    const app = createAuthenticatedTestApp();
    should.exist(app.isNetStateDisconnected);
  });

  it('returns boolean for network state: UNKNOWN', () => {
    const app = createAuthenticatedTestApp();
    should.exist(app.isNetStateUnknown);
  });
});

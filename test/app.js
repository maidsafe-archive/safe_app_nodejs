const should = require('should');
const h = require('./helpers');

const createTestApp = h.createTestApp;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createTestAppWithNetworkCB = h.createTestAppWithNetworkCB;
const createTestAppWithOptions = h.createTestAppWithOptions;

describe('Smoke test', () => {
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
      registerScheme: false
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
});

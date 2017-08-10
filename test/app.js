const should = require('should');
const h = require('./helpers');
const App = require('../src/app');
const appHelpers = require('../src/helpers');

const createTestApp = h.createTestApp;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

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

  it('should build some containers uri', () => {
    const app = createTestApp();
    return app.auth.genContainerAuthUri({ private: ['Insert'] })
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
      vendor: '',
      scope: null
    }));

    should.throws(test);
  });
});

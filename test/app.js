const should = require('should');
const h = require('./helpers');
const createTestApp = h.createTestApp;
const createAuthenticatedTestApp= h.createAuthenticatedTestApp;

describe('Smoke test', () => {
  it('unauthorised connection', () => {
    const app = createTestApp();
    app.auth.connectUnregistered();
  });
  it('should build some authentication url', () => {
    const app = createTestApp();
    const url = app.auth.genAuthUri({ _public: ['Read'] });
    should(url).startWith('safe-auth:');
  });
  it('should build some containers url', () => {
    const app = createTestApp();
    const url = app.auth.genContainerAuthUri({ private: ['Insert'] });
    should(url).startWith('safe-auth:');
  });

  it('creates registered for testing', () => {
    const app = createAuthenticatedTestApp();
    should(app.auth.registerd).be.true;
  })

  xit('should build an alternative if there is a scope', () => {
    const firstApp = createTestApp();
    const firstUrl = firstApp.auth.genAuthUri({ _public: ['Insert'] });
    // FIXME: This currently segfaults
    const secondApp = createTestApp('website');
    const secondUrrl = secondApp.auth.genAuthUri({ _public: ['Insert'] });
    should(secondUrrl).startWith('safe-auth:');
    should(secondUrrl).not.equal(firstUrl);
  });
});

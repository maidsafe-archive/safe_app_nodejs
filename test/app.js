const App = require('../src/app');
const should = require('should');

const createTestApp = (scope) => new App({ id: 'net.maidsafe.test.javascript.id',
  name: 'JS Test',
  vendor: 'MaidSafe Ltd.',
  scope
});

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

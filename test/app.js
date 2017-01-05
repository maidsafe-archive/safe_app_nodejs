const App = require('../src/app');
const should = require('should');

const createTestApp = (scope) => new App({ id: 'net.maidsafe.test.javascript.id',
  name: 'JS Test',
  vendor: 'MaidSafe Ltd.',
  scope: scope
});

describe('Smoke test', () => {
  it('unauthorised connection', () => {
    const app = createTestApp();
    app.auth.connect_unregistered();
  });
  it('should build some authentication url', () => {
    const app = createTestApp();
    const url = app.auth.genAuthUri({ _public: ['Read'] });
    should(url).startWith('safe-auth:');
  });

  xit('should build an alternative if there is a scope', () => {

    const first_app = createTestApp();
    const first_url = first_app.auth.genAuthUri({ _public: ['Insert'] });
    // FIXME: This currently segfaults
    const second_app = createTestApp('website');
    const second_url = second_app.auth.genAuthUri({ _public: ['Insert'] });
    should(second_url).startWith('safe-auth:');
    should(second_url).not.equal(url);
  });
});

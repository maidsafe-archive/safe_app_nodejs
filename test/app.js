const App = require('../src/app');
const should = require('should');

const createTestApp = (scope) => new App({ id: 'net.maidsafe.test.javascript.id',
  name: 'JS Test',
  vendor: 'MaidSafe Ltd.',
  scope: scope
});

describe('Smoke test', () => {
  it('should build some authentication url', () => {
    const app = createTestApp();
    const url = app.auth.genAuthUri({ _public: ['Read'] });
    should(url).be.startWith('safe-auth:');
  });
});

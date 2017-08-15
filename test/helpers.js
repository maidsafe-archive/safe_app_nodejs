const crypto = require('crypto');
const App = require('../src/app');
const h = require('../src/helpers');

function createTestApp(scope) {
  return h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'JS Test',
    vendor: 'MaidSafe Ltd.',
    scope
  }, null, { log: false }));
}

function createAnonTestApp(scope) {
  const app = createTestApp(scope);
  return app.auth.loginForTest();
}

function createAuthenticatedTestApp(scope, access) {
  const app = createTestApp(scope);
  app.auth.loginForTest(access || {}); // Promise, but immediate
  return app;
}

const createRandomXorName = () => crypto.randomBytes(32);
const createRandomSecKey = () => crypto.randomBytes(32);
const createRandomNonce = () => crypto.randomBytes(32);

module.exports = {
  createTestApp,
  createAnonTestApp,
  createAuthenticatedTestApp,
  createRandomXorName,
  createRandomSecKey,
  createRandomNonce
};

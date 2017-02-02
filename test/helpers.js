/* eslint no-underscore-dangle: ["warn", { "allow": ["_connection", "_registered"] }]*/
const lib = require('../src/native/lib');
const App = require('../src/app');
const h = require('../src/helpers');

function createTestApp(scope){
  return h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'JS Test',
    vendor: 'MaidSafe Ltd.',
    scope
  }))
}

function createAnonTestApp(scope) {
  const app = createTestApp(scope);
  return app.auth.connectUnregistered()
}

function createAuthenticatedTestApp(scope) {
  const app = createTestApp(scope);
  app.connection = lib.gen_testing_app_with_access();
  app.auth._registered = true;
  return app;
}

module.exports = {
  createTestApp,
  createAnonTestApp,
  createAuthenticatedTestApp
};

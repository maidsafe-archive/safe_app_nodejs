/* eslint no-underscore-dangle: ["warn", { "allow": ["_connection", "_registered"] }]*/
const lib = require('../src/native/lib');
const nativeH = require('../src/native/helpers');
const App = require('../src/app');
const h = require('../src/helpers');

function createTestApp(scope) {
  return h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'JS Test',
    vendor: 'MaidSafe Ltd.',
    scope
  }));
}

function createAnonTestApp(scope) {
  const app = createTestApp(scope);
  return app.auth.connectUnregistered();
}

function createAuthenticatedTestApp(scope, access) {
  const app = createTestApp(scope);
  const permissions = nativeH.makePermissions(access || {});
  app.connection = lib.test_create_app_with_access(permissions);
  app.auth._registered = true;
  return app;
}

module.exports = {
  createTestApp,
  createAnonTestApp,
  createAuthenticatedTestApp
};

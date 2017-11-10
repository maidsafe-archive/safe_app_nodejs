const crypto = require('crypto');
const App = require('../src/app');
const h = require('../src/helpers');

const authUris = {
  registeredUri: 'safe-AQAAAAQdJS4AAAAAAAAAACAAAAAAAAAAZo2G3zY3q52OQL1_9In7M9jujAIavTKmMml_v7IQ0mAgAAAAAAAAAGJYu0R7JyyeobQoCoR3VVWIc_ciSYn9kPzj75hPuodUIAAAAAAAAAAOWz5mjD1eP0HdlT22CbBsEp2cLwkUwrS5QSUNAwex-EAAAAAAAAAAUGIEwjV6_CT-P_30nroGmXN_MinaOCFTXjII46_olOkOWz5mjD1eP0HdlT22CbBsEp2cLwkUwrS5QSUNAwex-CAAAAAAAAAAJkjqVVunp75YdSaeXGKZ2mMProFxrzo0GtXRWL7mlgogAAAAAAAAAFJWkWMDattkgwIygjD-f5n1y8S0der9LxD3uRFtrOIHAAAAAAAAAAAAAAAAAAAAAMLOsjjOSCqP8BXfhDQl52PCI_QZ2oiIz3r8uglu3aZsmDoAAAAAAAAYAAAAAAAAAPe6QVR0hjbwQmMinbmWLcfuNu2yBkIGuwEAAAAAAAAABwAAAAAAAABfcHVibGljjtxY0RVCujnnT1iy_YqKlAcwhusHiPgpH1RZAUX-YDCYOgAAAAAAAAAABQAAAAAAAAAAAAAAAQAAAAIAAAADAAAABAAAAA',
  unregisteredUri: 'safe-AQAAANdBP4gCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  containersUri: 'safe-AQAAANZtpGIBAAAAAAAAAA',
  sharedMdataUri: 'safe-'
};

const appInfo = {
  id: 'net.maidsafe.test.javascript.id',
  name: 'JS Test',
  vendor: 'MaidSafe Ltd.'
};

function createTestApp(scope) {
  return h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'NodeJS Test',
    vendor: 'MaidSafe.net Ltd',
    scope
  }, null, { log: false }));
}

function createTestAppWithNetworkCB(scope, networkCB) {
  return h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'NodeJS Test',
    vendor: 'MaidSafe.net Ltd',
    scope
  }, networkCB, { log: false }));
}

function createTestAppWithOptions(scope, options) {
  return h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'NodeJS Test',
    vendor: 'MaidSafe.net Ltd',
    scope
  }, null, options));
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
  App,
  appInfo,
  authUris,
  createTestApp,
  createAnonTestApp,
  createAuthenticatedTestApp,
  createRandomXorName,
  createRandomSecKey,
  createRandomNonce,
  createTestAppWithNetworkCB,
  createTestAppWithOptions
};

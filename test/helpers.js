const crypto = require('crypto');
const App = require('../src/app');
const h = require('../src/helpers');

const authUris = {
  registeredUri: 'safe-bmV0Lm1haWRzYWZlLnRlc3Qud2ViYXBwLmlk:AQAAAGSv7oQAAAAAAAAAACAAAAAAAAAAGQ1zYg9iFKof2TVkAPp0R2kjU9DDWmmR_uAXBYvaeIAgAAAAAAAAAKecZc5pOSeoU53v43RdoTscGQbuAO0hF6HA_4ou9GJnIAAAAAAAAADsycX-1RCaNJxnYf6ka1pLncSez4w4PmPIS5lau_IblkAAAAAAAAAAbZdkFJ6Ydhh_OwA7mfYcnta_95k2xRazJsDSeMFGj3vsycX-1RCaNJxnYf6ka1pLncSez4w4PmPIS5lau_IbliAAAAAAAAAAx559E774w-6AWnIXBSm0NWOBW2zr8TOPThmdIeEsoFEgAAAAAAAAAHRNdser-WDOLIBGsDfRbNI304vnYILXI1JZC96tiFvzAAAAAAAAAAAAAAAAAAAAAG7Di2O1ssjN0izb88iclOKj7WD5LtaVriMIrLBbVRHimDoAAAAAAAAYAAAAAAAAAH2p2f2I4yuQPLkSJE_u9-PtM1WD7E65ZA==',
  unregisteredUri: 'safe-dW5yZWdpc3RlcmVk:AQAAAMga9SYCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  containersUri: 'safe-bmV0Lm1haWRzYWZlLnRlc3Qud2ViYXBwLmlk:AQAAALDJZuUBAAAAAAAAAA==',
  sharedMdataUri: 'safe-bmV0Lm1haWRzYWZlLmV4YW1wbGVzLnRlc3QtYXBw:AQAAADvUUzgDAAAAAAAAAA=='
};

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
  authUris,
  createTestApp,
  createAnonTestApp,
  createAuthenticatedTestApp,
  createRandomXorName,
  createRandomSecKey,
  createRandomNonce
};

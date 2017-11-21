const crypto = require('crypto');
const App = require('../src/app');
const h = require('../src/helpers');

const authUris = {
  registeredUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:AQAAAPN-m2AAAAAAAAAAACAAAAAAAAAAMxWYyOUEdIA2VNGJTmAjKFvg9yCrceomf_dZC3AdguAgAAAAAAAAALXtHOU3NtIxjIfIX4hk-pTxOeDxMiQnrXxBOqF8sp70IAAAAAAAAACjjbSMVLfM6fKxHaUwOE9ToK0mKMCLNjpstT3TqZP9KkAAAAAAAAAAbAl79zGmd3Dq5vTSVusCT8JKtr_1yYu320p24viIDG2jjbSMVLfM6fKxHaUwOE9ToK0mKMCLNjpstT3TqZP9KiAAAAAAAAAA661BaoE9k13thtGd8MVVR9gLutkSM_NUq67dnmuGBEMgAAAAAAAAAFBM4tDw2fjP-O3PryNeEf2tu56-CA1LdTidE2GIMHKYAAAAAAAAAAAAAAAAAAAAAKtRs_fd7jF0mYyq8bNyDN86wCCiowPQRQi7Db3tfRpRmDoAAAAAAAAYAAAAAAAAACcJjCl2_amfKTMP53W_gMNUxq_YCzVH0wIAAAAAAAAAJwAAAAAAAABhcHBzL25ldC5tYWlkc2FmZS5leGFtcGxlcy5tYWlsdHV0b3JpYWxPDqh1LvjMfruqH92sGoOBa9pKbeoyCyQm8HElHtfbR5g6AAAAAAAAASAAAAAAAAAA_ZaHRjRZ9gfbqCd_ZKjNUYewymCf5sNybZKM5-cT0qgYAAAAAAAAAAn89-_PuZAMk57uoVXS1YNbHR6o3uv-RAAFAAAAAAAAAAAAAAABAAAAAgAAAAMAAAAEAAAADAAAAAAAAABfcHVibGljTmFtZXMjGtQ2VkRH4VMMsrpUChdxTK6U41KgA-FmGue5Z2-dMZg6AAAAAAAAASAAAAAAAAAAFuKBLte-nkyuuXV6ovGbsfaZRBr_OFf2CRLNZ2dyRrcYAAAAAAAAAGnXgCQRN9rBO-Eh8HNZ-SLeokyCPkBMegACAAAAAAAAAAAAAAABAAAA',
  unregisteredUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:AQAAANdBP4gCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  containersUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:AQAAANZtpGIBAAAAAAAAAA',
  sharedMdataUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlndlymhvc3rpbmdtyw5hz2vy:AQAAAKY8y-wAAAAAAAAAACAAAAAAAAAAA29bsGLigcpbfsj8A_P9zMQsHM2dYVC11aE2juQJYZwgAAAAAAAAAOPTk8r3ThVoccb1ZU15U-rz2JPoAltta1PedqiHe4S2IAAAAAAAAACso4SQFLF6Xirfi7boTHlotq8sfq1uCY3Wld4E8kWTMkAAAAAAAAAAkr308V8c7tHVpt5t65gaZRAovEdE4cibhK90DoNlgOGso4SQFLF6Xirfi7boTHlotq8sfq1uCY3Wld4E8kWTMiAAAAAAAAAARK483_DDk3kOCtEwtJ1Cloo4eQ3CT2sB5issPvQPDzMgAAAAAAAAAMh20SEvg5xcgQx_ggGvx7dv3AqYMVXAQ6OcElSH45hOAAAAAAAAAAAAAAAAAAAAAFNdSUU4ZlhwB9iCNiv_XfeeVR-q2uIn9OAvkV-o_9hWmDoAAAAAAAAYAAAAAAAAAJGRW8SSrLGexAiA6ETQkJpOhV3TLq_UYwIAAAAAAAAADAAAAAAAAABfcHVibGljTmFtZXNe_yEfW_EmRDrQorUu0zfxFyqQhbgNK874tdvOotyxL5g6AAAAAAAAASAAAAAAAAAAJrC0-PrKT3YR6AVuOENalm6JlhGarqATQZxULxvsVgYYAAAAAAAAAC8-2s-W-7f2D4y78bQuDLYr60lZnVyFlAAEAAAAAAAAAAAAAAABAAAAAgAAAAMAAAAHAAAAAAAAAF9wdWJsaWNU6gkC4SN-XmdPG8xGQNGvA6ALK7yFB2X586lwcVDKqJg6AAAAAAAAAAAEAAAAAAAAAAAAAAABAAAAAgAAAAMAAAA'
};

const createTestApp = (scope) =>
  h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'NodeJS Test',
    vendor: 'MaidSafe.net Ltd',
    scope
  }, null, { log: false }));

const createTestAppWithNetworkCB = (scope, networkCB) =>
  h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'NodeJS Test',
    vendor: 'MaidSafe.net Ltd',
    scope
  }, networkCB, { log: false }));

const createTestAppWithOptions = (scope, options) =>
  h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'NodeJS Test',
    vendor: 'MaidSafe.net Ltd',
    scope
  }, null, options));

const createAnonTestApp = (scope) => {
  const app = createTestApp(scope);
  return app.auth.loginForTest();
};

const createAuthenticatedTestApp = (scope, access) => {
  const app = createTestApp(scope);
  app.auth.loginForTest(access || {}); // Promise, but immediate
  return app;
};

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
  createRandomNonce,
  createTestAppWithNetworkCB,
  createTestAppWithOptions
};

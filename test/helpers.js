// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms.
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const crypto = require('crypto');
const App = require('../src/app');
const h = require('../src/helpers');

const authUris = {
  registeredUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:AQAAAPN-m2AAAAAAAAAAACAAAAAAAAAAMxWYyOUEdIA2VNGJTmAjKFvg9yCrceomf_dZC3AdguAgAAAAAAAAALXtHOU3NtIxjIfIX4hk-pTxOeDxMiQnrXxBOqF8sp70IAAAAAAAAACjjbSMVLfM6fKxHaUwOE9ToK0mKMCLNjpstT3TqZP9KkAAAAAAAAAAbAl79zGmd3Dq5vTSVusCT8JKtr_1yYu320p24viIDG2jjbSMVLfM6fKxHaUwOE9ToK0mKMCLNjpstT3TqZP9KiAAAAAAAAAA661BaoE9k13thtGd8MVVR9gLutkSM_NUq67dnmuGBEMgAAAAAAAAAFBM4tDw2fjP-O3PryNeEf2tu56-CA1LdTidE2GIMHKYAAAAAAAAAAAAAAAAAAAAAKtRs_fd7jF0mYyq8bNyDN86wCCiowPQRQi7Db3tfRpRmDoAAAAAAAAYAAAAAAAAACcJjCl2_amfKTMP53W_gMNUxq_YCzVH0wIAAAAAAAAAJwAAAAAAAABhcHBzL25ldC5tYWlkc2FmZS5leGFtcGxlcy5tYWlsdHV0b3JpYWxPDqh1LvjMfruqH92sGoOBa9pKbeoyCyQm8HElHtfbR5g6AAAAAAAAASAAAAAAAAAA_ZaHRjRZ9gfbqCd_ZKjNUYewymCf5sNybZKM5-cT0qgYAAAAAAAAAAn89-_PuZAMk57uoVXS1YNbHR6o3uv-RAAFAAAAAAAAAAAAAAABAAAAAgAAAAMAAAAEAAAADAAAAAAAAABfcHVibGljTmFtZXMjGtQ2VkRH4VMMsrpUChdxTK6U41KgA-FmGue5Z2-dMZg6AAAAAAAAASAAAAAAAAAAFuKBLte-nkyuuXV6ovGbsfaZRBr_OFf2CRLNZ2dyRrcYAAAAAAAAAGnXgCQRN9rBO-Eh8HNZ-SLeokyCPkBMegACAAAAAAAAAAAAAAABAAAA',
  registeredUriNoContsPerms: 'safe-bmv0lm1hawrzywzllnrlc3qud2viyxbwlmlk:AQAAABBk5B8AAAAAAAAAACAAAAAAAAAAreYR_H4wXm8D7CQIscPmHfYfA72hxMSXEIB5uI9Q97ogAAAAAAAAAI7dkrbeTR25ICN30ZYnC1vUswLNaJDyjh6kd9bi6pGvIAAAAAAAAAAQDmeVRswyYlhoDW-coW9wsmFealyb9Nhrs9Tt-IKw-0AAAAAAAAAAu0W5u213mhC9XwL6CLrsKPIcMU7eSVySUhMHsDI68h8QDmeVRswyYlhoDW-coW9wsmFealyb9Nhrs9Tt-IKw-yAAAAAAAAAA-A1E7LdA2bwoIqRm4bp3nrRiHHnJceIe-8WoibyfCVQgAAAAAAAAAKIBUFswoZMtxMQo6_JEUhLbFO7umAhCEPrG_mBkayKxAAAAAAAAAAAAAAAAAAAAAOuBDvnZsexQgJMED2umGn0PNtI7XFkTynC5xaeOuXyAmDoAAAAAAAAYAAAAAAAAAN-H0ImznNxEKsVhkLVNQSLcMmyAVFKVgQAAAAAAAAAA',
  unregisteredUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:AQAAANdBP4gCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  containersUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:AQAAANZtpGIBAAAAAAAAAA',
  sharedMdataUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:AQAAABgwSL8DAAAAAAAAAA'
};

const appInfo = {
  id: 'net.maidsafe.test.javascript.id',
  name: 'JS Test',
  vendor: 'MaidSafe Ltd.'
};

const createTestApp = (scope) =>
  h.autoref(new App({
    id: 'net.maidsafe.test.javascript.id',
    name: 'NodeJS Test',
    vendor: 'MaidSafe.net Ltd',
    scope
  }, null, { log: false }));

const createAltAuthTestApp = async (scope, access) => {
  const app = h.autoref(new App({
    id: 'alt-net.maidsafe.test.javascript.id',
    name: 'alt-NodeJS Test',
    vendor: 'alt-MaidSafe.net Ltd',
    scope
  }, null, { log: false }));
  return app.auth.loginForTest(access || {});
};

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

const createAuthenticatedTestApp = (scope, access, opts) => {
  const app = createTestApp(scope);
  return app.auth.loginForTest(access || {}, opts);
};

const createRandomXorName = () => crypto.randomBytes(32);
const createRandomSecKey = () => crypto.randomBytes(32);
const createRandomSignPubKey = () => crypto.randomBytes(32);
const createRandomSignSecKey = () => crypto.randomBytes(64);
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
  createRandomSignPubKey,
  createRandomSignSecKey,
  createRandomNonce,
  createTestAppWithNetworkCB,
  createTestAppWithOptions,
  createAltAuthTestApp
};

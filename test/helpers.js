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
const consts = require('../src/consts');

const authUris = {
  registeredUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:bAEAAAABFXMLAYAAAAAAAAAAAAAQAAAAAAAAAAAA3HDT6MW2I2ONLHINSHZ7TEVB5UFR5FTGLRDYHTHOZBLE4VOY4YEQAAAAAAAAAAAAUKVTAUCVAVRI62LYLDCED6247VDIRBKDKPOU5U7ACCHTBXW5QBMQAAAAAAAAAAABSR3MIOM7N7RPHMJ77TKJLBMXZEMUJ7NQENDIDR7FUUNRHCEXLUJAAAAAAAAAAAACMUEZ2VZGSW7PHOGXKAOJ2WMDQYO7MTDYCLB53EPMHQEV53GN72MZI5WEHGPW7YXTWE77ZVEVQWL4SGKE7WYCGRUBY7S2KGYTRCLV2EIAAAAAAAAAAAAHFMV3PPIJ3JRGRDFGQOTEEI3T4O6MDSUWWZD6M362LF32UERHHMIAAAAAAAAAAAB6BXTI7JPJ7YPUDLF3GJ46TIYE4ZO5PMEU67E4H7P2ZOTX7K25GYAAAAAAAAAAAAAAAAAAAAAAAAAGNKLO44TF4LNWEPNSFKM2MRO3UGACEFL4HEWU6NMLPKC4K5R54MGMDUAAAAAAAAAAYAAAAAAAAAAADQQ3KZOAG5NUIDYGYZOKTDMD5HBBBBMVWEG6MOIBAAAAAAAAAAAAMAAAAAAAAAAAF64DVMJWGSY2OMFWWK44TAC3W4XO3IWKE2BUI5Y5MFBEQNCMCORP7PPVLEUIEI2LU6S3IC6MDUAAAAAAAAAABEAAAAAAAAAAABS6M7TCINUPY7M3LGYYUTD2U6RAVJIFXHZQ3JB6RY6BHQ3KERGYJDAAAAAAAAAAAAT32X5YMSXEEZEYS43IWVHY4VF4PEA6QCFK7OA3QAAQAAAAAAAAAAAAAAAAAAEAAAABHAAAAAAAAAAAGC4DQOMXW4ZLUFZWWC2LEONQWMZJOMV4GC3LQNRSXGLTNMFUWY5DVORXXE2LBNS2Z3UNQDNYQEF6AN57ANLTJZHORXGZACTZLKSSCRR6HEV7BHAWTTGB2AAAAAAAAAAASAAAAAAAAAAAAFLWOZVEC4MW4KEPKPWUJJL6EDUMEEPDQS3RSWCYYF67N3WIDS5IRQAAAAAAAAAAAGC2JU2Q4WPHO23VKPDSQMZLMHUTVC4C46LZV4HIAAUAAAAAAAAAAAAAAAAAACAAAAABAAAAAAMAAAAAEAAAAAAI',
  registeredUriNoContsPerms: 'safe-bmv0lm1hawrzywzllmfwav9wbgf5z3jvdw5klndlymnsawvudc4xma:bAEAAAAACT6OKEAAAAAAAAAAAAAQAAAAAAAAAAAA3HDT6MW2I2ONLHINSHZ7TEVB5UFR5FTGLRDYHTHOZBLE4VOY4YEQAAAAAAAAAAABP22UUJZGCLWAINMDX2AY566YRCWNHNDFBLXKEYYJ5RROGMSZVNMQAAAAAAAAAAAH3GXPTLB56ZEZ73NTO66M7HXFJUHBEGPG7EMKX66AC4LRQMB6UINAAAAAAAAAAAAC5JH35FXNOCJTTVT6PU6HVU6TSC6SUGNWOUUIO7X5RNB6W5MUJJL5TLXZVQ67MSM75WZXPPGPT3SU2DQSDHTPSGFL7PABOFYYGA7KEGIAAAAAAAAAAAC52RYPP7Y5RPJSG4AUGGQR6GGN7VTCSLO6NFKVXQBNTMOSBIO2QAIAAAAAAAAAAAD4BSLCSRDYCSV4MPC47BLGNLP2U36OJWZDBGXX4RHY46ICCNHNAWAAAAAAAAAAAAAAAAAAAAAAAAAGNKLO44TF4LNWEPNSFKM2MRO3UGACEFL4HEWU6NMLPKC4K5R54MGMDUAAAAAAAAAAYAAAAAAAAAAADQQ3KZOAG5NUIDYGYZOKTDMD5HBBBBMVWEG6MOIAAAAAAAAAAAAAB',
  unregisteredUri: 'safe-bmv0lm1hawrzywzllnnhzmutynjvd3nlcg:bAEAAAAB4XAWWQAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC',
  containersUri: 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:bAEAAAAHRHBR6CAIAAAAAAAAAAAAQ',
  sharedMdataUri: 'safe-bmv0lm1hawrzywzllmfwav9wbgf5z3jvdw5klndlymnsawvudc4xma:bAEAAAAEA2OGBIAYAAAAAAAAAAAAQ'
};

const appInfo = {
  id: 'net.maidsafe.test.javascript.id',
  name: 'NodeJS Test',
  vendor: 'MaidSafe.net Ltd'
};

const createTestApp = async (partialAppInfo, networkCB, options, preventInit) => {
  const composedAppInfo = Object.assign(appInfo, partialAppInfo);
  const app = new App(composedAppInfo, networkCB, options);
  if (preventInit) {
    return h.autoref(app);
  }
  await app.init();
  return h.autoref(app);
};

const createAuthenticatedTestApp = async (partialAppInfo, access, opts, initOpts) => {
  const app = await createTestApp(partialAppInfo, null, initOpts);
  return app.auth.loginForTest(access || {}, opts);
};

const createUnregisteredTestApp = async (opts) => {
  const app = await createTestApp(null, null, opts);
  return app.auth.loginForTest();
};

const createRandomXorName = () => crypto.randomBytes(32);
const createRandomSecKey = () => crypto.randomBytes(32);
const createRandomSignPubKey = () => crypto.randomBytes(32);
const createRandomSignSecKey = () => crypto.randomBytes(64);
const createRandomNonce = () => crypto.randomBytes(24);
const createRandomInvalidSecKey = () => crypto.randomBytes(30);
const createRandomInvalidXor = () => crypto.randomBytes(30);
const createRandomInvalidNonce = () => crypto.randomBytes(30);

const createDomain = async (domain, content, path, service, authedApp) => {
  const app = authedApp || await createAuthenticatedTestApp();
  const serviceMd = await app.mutableData.newRandomPublic(consts.TAG_TYPE_WWW);
  await serviceMd.quickSetup();
  const nfs = serviceMd.emulateAs('NFS');
   // let's write the file
  const file = await nfs.create(content);
  await nfs.insert(path || '/index.html', file);
  const dnsName = await app.crypto.sha3Hash(domain);
  const dnsData = await app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS);
  const serviceMdInfo = await serviceMd.getNameAndTag();
  const payload = {};
  payload[service || 'www'] = serviceMdInfo.name;
  await dnsData.quickSetup(payload);
  return { serviceMd, domain };
};

const createRandomDomain = async (content, path, service, authedApp) => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  return createDomain(domain, content, path, service, authedApp);
};

const createRandomPrivateServiceDomain = async (content, path, service, authedApp) => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = authedApp || await createAuthenticatedTestApp();
  const serviceMd = await app.mutableData.newRandomPrivate(consts.TAG_TYPE_WWW);
  await serviceMd.quickSetup();
  const nfs = serviceMd.emulateAs('NFS');
   // let's write the file
  const file = await nfs.create(content);
  await nfs.insert(path || '', file);
  const dnsName = await app.crypto.sha3Hash(domain);
  const dnsData = await app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS);
  const serial = await serviceMd.serialise();
  const payload = {};
  payload[service || ''] = serial;
  await dnsData.quickSetup(payload);
  return { domain };
};

const publicNamesContainerPerms = {
  // _public is used for WebID directory for now...
  _public: ['Insert', 'Update', 'Delete'],
  _publicNames: ['Insert', 'Update', 'Delete'],
};

const publicNamesTestApp = () => createAuthenticatedTestApp(null,
                                            publicNamesContainerPerms, null,
                                            { enableExperimentalApis: true });

module.exports = {
  App,
  appInfo,
  authUris,
  createTestApp,
  createAuthenticatedTestApp,
  createUnregisteredTestApp,
  createRandomXorName,
  createRandomSecKey,
  createRandomSignPubKey,
  createRandomSignSecKey,
  createRandomNonce,
  createRandomInvalidSecKey,
  createRandomInvalidXor,
  createRandomInvalidNonce,
  createDomain,
  createRandomDomain,
  createRandomPrivateServiceDomain,
  publicNamesTestApp
};

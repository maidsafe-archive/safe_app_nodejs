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


const should = require('should');
const helpers = require('../helpers');
const errConst = require('../../src/error_const');

const containersPermissions = {
  _public: ['Read'],
  _publicNames: ['Read', 'Insert', 'ManagePermissions']
};

const createAuthenticatedTestApp = helpers.createAuthenticatedTestApp;
const createUnregisteredTestApp = helpers.createUnregisteredTestApp;
const createDomain = helpers.createDomain;
const createRandomDomain = helpers.createRandomDomain;
const expApisOpts = { enableExperimentalApis: true };

const decomposeXorUrl = (xorUrl) => {
  const parts = xorUrl.replace(/^safe:\/\//).split(':');
  return { cid: parts[0], typeTag: parts[1] };
};

describe('WebFetch with XOR URL', () => {
  const TYPE_TAG = 41000;
  let app;
  let unregisteredApp;

  before(async () => {
    app = await createAuthenticatedTestApp('_test_scope', containersPermissions,
                                            null, expApisOpts);
    unregisteredApp = await createUnregisteredTestApp(expApisOpts);
  });

  it('fail to fetch with XOR-URL if experimental apis flag is not set', async () => {
    let error;
    try {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const { serviceMd } = await createRandomDomain(content, 'index.html', '', app);
      const info = await serviceMd.getNameAndTag();
      should(info.xorUrl).not.be.undefined();
      const safeApp = await createUnregisteredTestApp({ enableExperimentalApis: false });
      await safeApp.webFetch(info.xorUrl);
    } catch (err) {
      error = err;
    }
    return should(error.message).equal(errConst.ERR_CONTENT_NOT_FOUND.msg);
  });

  it('undefined XOR-URL from MD if experimental apis flag is not set', async () => {
    const safeApp = await createUnregisteredTestApp({ enableExperimentalApis: false });
    const md = await safeApp.mutableData.newRandomPublic(TYPE_TAG);
    await md.quickSetup();
    const info = await md.getNameAndTag();
    return should(info.xorUrl).be.undefined();
  });

  it('fail to get XOR-URL from IMD if experimental apis flag is not set', async () => {
    let error;
    const safeApp = await createUnregisteredTestApp({ enableExperimentalApis: false });
    try {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const idWriter = await safeApp.immutableData.create();
      await idWriter.write(content);
      const cipherOpt = await safeApp.cipherOpt.newPlainText();
      const getXorUrl = true;
      await idWriter.close(cipherOpt, getXorUrl);
    } catch (err) {
      error = err;
    }
    return should(error.message).equal(errConst.EXPERIMENTAL_API_DISABLED.msg('XOR URLs'));
  });

  it('valid MD XOR-URL for non existing content, rejected', async () =>
    should(unregisteredApp.webFetch('safe://zb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA:15000')).be.rejectedWith(errConst.ERR_CONTENT_NOT_FOUND.msg)
  );

  it('valid ImmD XOR-URL for non existing content, rejected', async () =>
    should(unregisteredApp.webFetch('safe://zb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA')).be.rejectedWith(errConst.ERR_CONTENT_NOT_FOUND.msg)
  );

  it('invalid ImmD XOR-URL should default to public name lookup, rejected', async () =>
    should(unregisteredApp.webFetch('safe://xb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA')).be.rejectedWith(errConst.ERR_CONTENT_NOT_FOUND.msg)
  );

  it('invalid MD XOR-URL, rejected', async () =>
    should(unregisteredApp.webFetch('safe://xb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA:15000')).be.rejectedWith(errConst.ERR_CONTENT_NOT_FOUND.msg)
  );

  it('valid MD XOR-URL but invalid type tag, rejected', async () => {
    const md = await app.mutableData.newRandomPublic(TYPE_TAG);
    await md.quickSetup();
    const info = await md.getNameAndTag();
    const xorUrlParts = decomposeXorUrl(info.xorUrl);
    const fetchCall = unregisteredApp.webFetch(`safe://${xorUrlParts.cid}:${xorUrlParts.typeTag + 1}`);
    return should(fetchCall).be.rejectedWith(errConst.ERR_CONTENT_NOT_FOUND.msg);
  });

  it('valid MD XOR-URL same as published public name, invalid type tag, rejected', async () => {
    const md = await app.mutableData.newRandomPublic(TYPE_TAG);
    await md.quickSetup();
    const info = await md.getNameAndTag();
    should(info.xorUrl).not.be.undefined();
    const xorUrlParts = decomposeXorUrl(info.xorUrl);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    await createDomain(xorUrlParts.cid, content, '', '');
    const fetchCall = unregisteredApp.webFetch(`safe://${xorUrlParts.cid}:${xorUrlParts.typeTag + 1}`);
    return should(fetchCall).be.rejectedWith(errConst.ERR_CONTENT_NOT_FOUND.msg);
  });

  it('valid MD XOR-URL and type tag on NFS container', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const { serviceMd } = await createRandomDomain(content, 'index.html', '', app);
    const info = await serviceMd.getNameAndTag();
    const data = await unregisteredApp.webFetch(info.xorUrl);
    return should(data.body.toString()).equal(content);
  });

  it('valid MD XOR-URL and type tag on NFS container, invalid path, rejected', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const { serviceMd } = await createRandomDomain(content, '/index.html', '', app);
    const info = await serviceMd.getNameAndTag();
    should(info.xorUrl).not.be.undefined();
    const fetchCall = unregisteredApp.webFetch(`${info.xorUrl}/invalid-folder`);
    return should(fetchCall).be.rejectedWith(errConst.ERR_FILE_NOT_FOUND.msg);
  });

  it('valid MD XOR-URL and type tag on NFS container with path', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const { serviceMd } = await createRandomDomain(content, '/folder/index.html', '', app);
    const info = await serviceMd.getNameAndTag();
    should(info.xorUrl).not.be.undefined();
    const data = await unregisteredApp.webFetch(`${info.xorUrl}/folder`);
    return should(data.body.toString()).equal(content);
  });

  it('returns a MD explorer html page when no index.html found', async () => {
    const md = await app.mutableData.newRandomPublic(TYPE_TAG);
    await md.quickSetup({ key1: 'value' });
    const info = await md.getNameAndTag();
    const data = await unregisteredApp.webFetch(`${info.xorUrl.toUpperCase()}`);
    return should(data.headers).eql({ 'Content-Type': 'text/html' });
  });

  it('does not return a MD explorer if experimental apis is disabled', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const { domain } = await createRandomDomain(content, '/noindex.html', '', app);
    const safeApp = await createUnregisteredTestApp({ enableExperimentalApis: false });
    return should(safeApp.webFetch(`safe://${domain}`)).be.rejectedWith(errConst.ERR_FILE_NOT_FOUND.msg);
  });

  it('valid MD XOR-URL and type tag on non-NFS container with empty path', async () => {
    const md = await app.mutableData.newRandomPublic(TYPE_TAG);
    await md.quickSetup({ key1: 'value' });
    const info = await md.getNameAndTag();
    const data = await unregisteredApp.webFetch(`${info.xorUrl.toUpperCase()}/`);
    // it should return the mutableData viewer/explorer
    return should(data.headers).eql({ 'Content-Type': 'text/html' });
  });

  it('valid ImmD XOR-URL', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(content);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const getXorUrl = true;
    const immDataAddr = await idWriter.close(cipherOpt, getXorUrl);
    should(immDataAddr.xorUrl).not.be.undefined();
    const data = await unregisteredApp.webFetch(immDataAddr.xorUrl);
    should(data.body.toString()).equal(content);
    should(data.headers).eql({ 'Content-Type': 'application/octet-stream' });
  });

  it('valid ImmD XOR-URL with invalid codec code, rejected', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(content);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const getXorUrl = true;
    const closeCall = idWriter.close(cipherOpt, getXorUrl, 'invalid-codec');
    return should(closeCall).be.rejectedWith('Codec `mime/invalid-codec` not found');
  });

  it('valid ImmD XOR-URL with valid codec code', async () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(content);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const getXorUrl = true;
    const immDataAddr = await idWriter.close(cipherOpt, getXorUrl, 'image/png');
    const data = await unregisteredApp.webFetch(immDataAddr.xorUrl);
    should(data.body.toString()).equal(content);
    should(data.headers).eql({ 'Content-Type': 'image/png' });
  });

  it('valid ImmD XOR-URL equal to a published public name', async () => {
    const md = await app.mutableData.newRandomPublic(41000);
    await md.quickSetup();
    const info = await md.getNameAndTag();
    should(info.xorUrl).not.be.undefined();
    const { cid } = decomposeXorUrl(info.xorUrl);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    await createDomain(cid, content, '', '');
    const data = await unregisteredApp.webFetch(`safe://${cid}`);
    should(data.body.toString()).equal(content);
  });
});

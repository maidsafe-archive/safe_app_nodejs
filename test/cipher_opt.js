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
const h = require('./helpers');
const errConst = require('../src/error_const');

describe('CipherOpt', () => {
  let app;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
  });

  it('provides a plain text cipher opt to write immutable structure', async () => {
    const testString = 'information to be encrypted';
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const idAddress = await idWriter.close(cipherOpt);
    const idReader = await app.immutableData.fetch(idAddress);
    const idData = await idReader.read();
    return should(idData.toString()).equal(testString);
  });

  it('symmetrically encrypts data to be written to immutable structure', async () => {
    const testString = 'information to be encrypted';
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newSymmetric();
    const idAddress = await idWriter.close(cipherOpt);
    const idReader = await app.immutableData.fetch(idAddress);
    const idData = await idReader.read();
    return should(idData.toString()).equal(testString);
  });

  it('asymmetrically encrypts data to be written to immutable structure', async () => {
    const differentApp = await h.createAltAuthTestApp();
    const pubEncKey = await differentApp.crypto.getAppPubEncKey();
    const rawKey = await pubEncKey.getRaw();

    const pubKey = await app.crypto.pubEncKeyFromRaw(rawKey);
    const testString = 'information to be encrypted';
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newAsymmetric(pubKey);
    const idAddress = await idWriter.close(cipherOpt);

    const idReader = await differentApp.immutableData.fetch(idAddress);
    const idData = await idReader.read();
    return should(idData.toString()).equal(testString);
  }).timeout(10000);

  it('throws error if key is not provided to newAsymmetric', () => {
    const test = () => app.cipherOpt.newAsymmetric();
    return should(test).throw(errConst.MISSING_PUB_ENC_KEY.msg);
  });
});

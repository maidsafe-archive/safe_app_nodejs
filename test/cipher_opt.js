const should = require('should');
const h = require('./helpers');

describe('CipherOpt', function test() {
  this.timeout(15000);
  const app = h.createAuthenticatedTestApp();

  it('symmetrically encrypts data to be written to immutable structure', async () => {
    const testString = 'information to be encrypted';
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newSymmetric();
    const idAddress = await idWriter.close(cipherOpt);
    const idReader = await app.immutableData.fetch(idAddress);
    const idData = await idReader.read();
    should(idData.toString()).equal(testString);
  });

  it.only('asymmetrically encrypts data to be written to immutable structure', async () => {
    const keyPair = await app.crypto.generateEncKeyPair();
    const pubEncryptionKey = keyPair.pubEncKey;
    const testString = 'information to be encrypted';
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newAsymmetric(pubEncryptionKey);
    const idAddress = await idWriter.close(cipherOpt);
    const idReader = await app.immutableData.fetch(idAddress);
    // const idData = await idReader.read();
    // should(idData.toString()).equal(testString);
  });
});

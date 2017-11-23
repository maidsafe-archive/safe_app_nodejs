const should = require('should');
const h = require('./helpers');

describe('CipherOpt', () => {
  const app = h.createAuthenticatedTestApp();

  it('provides a plain text cipher opt to write immutable structure', async () => {
    const testString = 'information to be encrypted';
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const idAddress = await idWriter.close(cipherOpt);
    const idReader = await app.immutableData.fetch(idAddress);
    const idData = await idReader.read();
    should(idData.toString()).equal(testString);
  });

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

  it('asymmetrically encrypts data to be written to immutable structure', async () => {
    const differentApp = h.createAltAuthTestApp();
    const pubEncKey = await differentApp.crypto.getAppPubEncKey();
    const rawKey = await pubEncKey.getRaw();

    const pubKey = await app.crypto.pubEncKeyKeyFromRaw(rawKey);
    const testString = 'information to be encrypted';
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newAsymmetric(pubKey);
    const idAddress = await idWriter.close(cipherOpt);

    const idReader = await differentApp.immutableData.fetch(idAddress);
    const idData = await idReader.read();
    should(idData.toString()).equal(testString);
  });
}).timeout(15000);

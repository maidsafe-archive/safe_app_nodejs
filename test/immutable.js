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

describe('Immutable Data', () => {
  let app;
  const TYPE_TAG = 15639;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
  });

  it('returns Reader for corresponding operations', async () => {
    const testString = `test-${Math.random()}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const idAddress = await idWriter.close(cipherOpt);
    return should(app.immutableData.fetch(idAddress)).be.fulfilled();
  });

  it('returns Writer for corresponding operations', async () => {
    await app.immutableData.create().should.be.fulfilled();
  });

  describe('Reader', () => {
    it('reads content', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      const idData = await idReader.read();
      return should(idData.toString()).equal(testString);
    });

    it('reads content providing options', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      const idData = await idReader.read({ offset: 0, end: testString.length - 1 });
      return should(idData.toString()).equal(testString.slice(0, -1));
    });

    it('throws error if end option is greater than end of file byte length', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      return should(idReader.read({ offset: 0, end: testString.length + 1 }))
        .be.rejectedWith('Invalid offsets (from-position and length combination) provided for reading form SelfEncryptor. Would have probably caused an overflow.');
    });

    it('reads size of data', async () => {
      const testString = 'test-string';
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      return should(await idReader.size()).equal(11);
    });
  });

  describe('Writer', () => {
    it('writes data from string', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      return should(idWriter.write(testString)).be.fulfilled();
    });

    it('writes data from buffer', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      return should(idWriter.write(Buffer.from(testString))).be.fulfilled();
    });

    it('closes itself, writes Immutable Data to network, and returns network address', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      return should(idAddress.length).be.equal(32);
    });
  });

  it('takes immutable data address as parsed JSON object', async () => {
    const testString = `test-${Math.random()}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const idAddress = await idWriter.close(cipherOpt);
    const addressAsString = JSON.stringify(idAddress);
    const idReader = await app.immutableData.fetch(JSON.parse(addressAsString));
    const idData = await idReader.read();
    return should(idData.toString()).equal(testString);
  });

  it('throws error if immutable address is not 32 bytes', async () => {
    const testString = `test-${Math.random()}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const idAddress = await idWriter.close(cipherOpt);
    const addressAsString = idAddress.toString();
    return should(app.immutableData.fetch(addressAsString)).be.rejectedWith(Error, { message: 'Name _must be_ provided and 32 bytes long.' });
  });

  it('store address in a MD', () => {
    const testString = `test-${Math.random()}`;
    const testXorName = h.createRandomXorName();

    return app.immutableData.create()
      .then((w) => w.write(testString)
        .then(() => app.cipherOpt.newPlainText())
        .then((cipherOpt) => w.close(cipherOpt))
        .then((addr) => app.mutableData.newPublic(testXorName, TYPE_TAG)
          .then((md) => md.quickSetup({ key1: addr }))
        ))
      .then(() => app.mutableData.newPublic(testXorName, TYPE_TAG))
      .then((md) => md.get('key1'))
      .then((value) => app.immutableData.fetch(value.buf))
      .then((r) => r.read())
      .then((res) => should(res.toString()).equal(testString));
  });

  it('store address in a serialised/deserialised  MD', () => {
    const testString = `test-${Math.random()}`;
    const testXorName = h.createRandomXorName();

    return app.immutableData.create()
      .then((w) => w.write(testString)
        .then(() => app.cipherOpt.newPlainText())
        .then((cipherOpt) => w.close(cipherOpt))
        .then((addr) => app.mutableData.newPublic(testXorName, TYPE_TAG)
          .then((md) => md.quickSetup())
          .then((md) => md.serialise())
          .then((serial) => app.mutableData.fromSerial(serial))
          .then((md) => md.getEntries()
            .then((entries) => entries.mutate())
            .then((mut) => mut.insert('key1', addr)
              .then(() => md.applyEntriesMutation(mut))
            ))
          )
        )
      .then(() => app.mutableData.newPublic(testXorName, TYPE_TAG))
      .then((md) => md.getEntries())
      .then((entries) => entries.forEach((key, value) => {
        app.immutableData.fetch(value.buf)
        .then((r) => r.read())
        .then((res) => should(res.toString()).equal(testString));
      }));
  });
});

const should = require('should');
const h = require('./helpers');

describe('Immutable Data', () => {
  const app = h.createAuthenticatedTestApp();
  const TYPE_TAG = 15639;

  it('returns Reader for corresponding operations', async () => {
    const testString = `test-${Math.random()}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const idAddress = await idWriter.close(cipherOpt);
    await app.immutableData.fetch(idAddress).should.be.fulfilled();
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
      should(idData.toString()).equal(testString);
    });

    it('reads content providing options', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      const idData = await idReader.read({ offset: 0, size: testString.length });
      should(idData.toString()).equal(testString);
    });

    it('reads size of data', async () => {
      const testString = 'test-string';
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      should(await idReader.size()).equal(11);
    });

    it.skip('frees Reader object from memory', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      idReader.free();
      should(idReader.read()).be.rejected();
    });
  });

  describe('Writer', () => {
    it('writes data from string', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString).should.be.fulfilled();
    });

    it('writes data from buffer', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(Buffer.from(testString)).should.be.fulfilled();
    });

    it('closes itself, writes Immutable Data to network, and returns network address', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      should(idAddress.length).be.equal(32);
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
    should(idData.toString()).equal(testString);
  });

  it('throws error if immutable address is not 32 bytes', async () => {
    const testString = `test-${Math.random()}`;
    const idWriter = await app.immutableData.create();
    await idWriter.write(testString);
    const cipherOpt = await app.cipherOpt.newPlainText();
    const idAddress = await idWriter.close(cipherOpt);
    const addressAsString = idAddress.toString();
    should(app.immutableData.fetch(addressAsString)).be.rejectedWith(Error, { message: 'XOR Names _must be_ 32 bytes long.' });
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
      .then((res) => {
        should(res.toString()).equal(testString);
      });
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
        .then((res) => {
          should(res.toString()).equal(testString);
        });
      }));
  });
});

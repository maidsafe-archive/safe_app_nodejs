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

    it('reads size of data', async () => {
      const testString = 'test-string';
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString);
      const cipherOpt = await app.cipherOpt.newPlainText();
      const idAddress = await idWriter.close(cipherOpt);
      const idReader = await app.immutableData.fetch(idAddress);
      should(await idReader.size()).equal(11);
    });
  });

  describe('Writer', () => {
    it('writes data', async () => {
      const testString = `test-${Math.random()}`;
      const idWriter = await app.immutableData.create();
      await idWriter.write(testString).should.be.fulfilled();
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

const should = require('should');
const h = require('./helpers');

describe('Immutable Data', () => {
  const app = h.createAuthenticatedTestApp();
  const TYPE_TAG = 15639;

  it('write read simple ', () => {
    const testString = `test-${Math.random()}`;

    return app.immutableData.create()
      .then((w) => w.write(testString)
        .then(() => app.cipherOpt.newPlainText())
        .then((cipherOpt) => w.close(cipherOpt))
        .then((addr) => app.immutableData.fetch(addr)
           .then((r) => r.read())
           .then((res) => {
             should(res.toString()).equal(testString);
           })));
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

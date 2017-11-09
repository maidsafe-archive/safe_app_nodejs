
const crypto = require('crypto');
const should = require('should');
const h = require('../helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Applying EntryMutationTransaction', function testContainer() {
  this.timeout(30000);
  const app = createAuthenticatedTestApp();
  const TAG_TYPE = 15639;
  const TEST_ENTRIES = { key1: 'value1', key2: 'value2' };
  it('an insert mutation from existing entries', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.insert('newKey', 'newValue')
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('newKey'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('newValue');
                should(value.version).equal(0);
              })
          ))))
  );

  it('an insert mutation from existing entries on private MD', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.insert('newKey', 'newValue')
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('newKey'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('newValue');
                should(value.version).equal(0);
              })
          ))))
  );

  it('an update mutation from existing entries', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.update('key2', 'updatedValue', 1)
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('key2'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('updatedValue');
                should(value.version).equal(1);
              })
          ))))
  );

  it('an update mutation from existing entries on private MD', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.update('key2', 'updatedValue', 1)
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('key2'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('updatedValue');
                should(value.version).equal(1);
              })
          ))))
  );

  it('an update mutation from existing entries with buffer value', () => app.mutableData.newRandomPublic(TAG_TYPE)
    .then((m) => m.quickSetup(TEST_ENTRIES)
      .then(() => app.mutableData.newMutation()
        .then((mut) => {
          const newVal = crypto.randomBytes(36);
          return mut.update('key2', newVal, 1)
            .then(() => m.applyEntriesMutation(mut))
            .then(() => m.get('key2'))
            .then((value) => {
              should(value).not.be.undefined();
              should(Buffer.from(value.buf)).deepEqual(newVal);
              should(value.version).equal(1);
            });
        })))
  );

  it('a remove mutation from existing entries', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.remove('key2', 1)
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('key2'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('');
                should(value.version).equal(1);
              })
          ))))
  );

  it('a remove mutation from existing entries on private MD', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.remove('key2', 1)
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('key2'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('');
                should(value.version).equal(1);
              })
          ))))
  );

  it('a remove mutation on public MD', () => {
    const testXorName = h.createRandomXorName();
    return app.mutableData.newPublic(testXorName, TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES))
      .then(() => app.mutableData.newPublic(testXorName, TAG_TYPE))
      .then((md) => app.mutableData.newMutation()
        .then((mut) => mut.remove('key1', 1)
          .then(() => md.applyEntriesMutation(mut))
        ))
      .then(() => app.mutableData.newPublic(testXorName, TAG_TYPE))
      .then((md) => md.get('key1'))
      .then((value) => {
        should(value).not.be.undefined();
        should(value.buf.toString()).equal('');
        should(value.version).equal(1);
      });
  });

  it('a remove mutation on private MD', () => {
    const testXorName = h.createRandomXorName();
    return app.mutableData.newPrivate(testXorName, TAG_TYPE,
                                      h.createRandomSecKey(), h.createRandomNonce())
      .then((m) => m.quickSetup(TEST_ENTRIES))
      .then((md) => app.mutableData.newMutation()
        .then((mut) => mut.remove('key1', 1)
          .then(() => md.applyEntriesMutation(mut))
        )
        .then(() => md.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('');
          should(value.version).equal(1);
        })
      );
  });

  it('a remove mutation on a serialised private MD', () => {
    const testXorName = h.createRandomXorName();
    return app.mutableData.newPrivate(testXorName, TAG_TYPE,
                                        h.createRandomSecKey(), h.createRandomNonce())
      .then((m) => m.quickSetup(TEST_ENTRIES))
      .then((md) => md.serialise())
      .then((serial) => app.mutableData.fromSerial(serial))
      .then((privmd) => app.mutableData.newMutation()
        .then((mut) => mut.remove('key1', 1)
          .then(() => privmd.applyEntriesMutation(mut))
        )
        .then(() => privmd.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('');
          should(value.version).equal(1);
        })
      );
  });

  it('an insert mutation from new mutation obj', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newMutation()
          .then((mut) => mut.insert('newKey', 'newValue')
            .then(() => m.applyEntriesMutation(mut))
            .then(() => m.get('newKey'))
            .then((value) => {
              should(value).not.be.undefined();
              should(value.buf.toString()).equal('newValue');
              should(value.version).equal(0);
            })
          )))
  );

  it('an insert mutation on a private MD', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newMutation()
          .then((mut) => mut.insert('newKey', 'newValue')
            .then(() => m.applyEntriesMutation(mut))
          )
          .then(() => m.get('newKey'))
          .then((value) => {
            should(value).not.be.undefined();
            should(value.buf.toString()).equal('newValue');
            should(value.version).equal(0);
          })
        ))
  );

  it('an insert mutation on a private MD with encrypted entry', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newMutation()
          .then((mut) => m.encryptKey('newKey')
            .then((key) => m.encryptValue('newValue')
              .then((value) => mut.insert(key, value))
              .then(() => m.applyEntriesMutation(mut))
          ))
          .then(() => m.encryptKey('newKey').then((key) => m.get(key)))
          .then((value) => m.decrypt(value.buf))
          .then((d) => {
            should(d).not.be.undefined();
            should(d.toString()).equal('newValue');
          })
        ))
  );

  it('an update mutation from new mutation obj', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newMutation()
          .then((mut) => mut.update('key2', 'updatedValue', 1)
            .then(() => m.applyEntriesMutation(mut))
            .then(() => m.get('key2'))
            .then((value) => {
              should(value).not.be.undefined();
              should(value.buf.toString()).equal('updatedValue');
              should(value.version).equal(1);
            })
          )))
  );

  it('an update mutation on a private MD', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newMutation()
          .then((mut) => mut.update('key2', 'updatedValue', 1)
            .then(() => m.applyEntriesMutation(mut))
          )
          .then(() => m.get('key2'))
          .then((value) => {
            should(value).not.be.undefined();
            should(value.buf.toString()).equal('updatedValue');
            should(value.version).equal(1);
          })
        ))
  );

  it('a remove mutation from new mutation obj', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newMutation()
          .then((mut) => mut.remove('key2', 1)
            .then(() => m.applyEntriesMutation(mut))
            .then(() => m.get('key2'))
            .then((value) => {
              should(value).not.be.undefined();
              should(value.buf.toString()).equal('');
              should(value.version).equal(1);
            })
          )))
  );

  // this is currently not supported, a removed key is currently updated with an empty value
  it.skip('a removal followed by an insert with the same key', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.remove('key2', 1)
              .then(() => m.applyEntriesMutation(mut))
              .then(() => mut.insert('key2', 'newValue'))
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('key2'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('newValue');
                should(value.version).equal(2);
              })
          ))))
  );

  it('a removal & an update within the same mutation', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.remove('key2', 1)
              .then(() => mut.update('key1', 'updatedValue', 1))
              .then(() => m.applyEntriesMutation(mut))
              .then(() => m.get('key2'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('');
                should(value.version).equal(1);
              })
              .then(() => m.get('key1'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('updatedValue');
                should(value.version).equal(1);
              })
          ))))
  );
});

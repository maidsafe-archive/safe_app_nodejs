const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;


describe('Mutable Data', () => {
  const app = createAuthenticatedTestApp();
  const TAG_TYPE = 15639;
  const TAG_TYPE_RESERVED = 10000;
  const TAG_TYPE_INVALID = '_invalid_tag';
  const TEST_NAME_PRIVATE = 'test-name-private-01010101010101';
  const TEST_NAME_PUBLIC = 'test-name-public--01010101010101';
  const TEST_NAME_INVALID = 'name-shorter-than-32-bytes-long';
  const TEST_ENTRIES = { key1: 'value1', key2: 'value2' };

  describe('Create with invalid values', () => {
    it.skip('create random public with reserved tag type', () =>
      should(app.mutableData.newRandomPublic(TAG_TYPE_RESERVED)).be.rejected()
    );

    it.skip('create random private with reserved tag type', () =>
      should(app.mutableData.newRandomPrivate(TAG_TYPE_RESERVED)).be.rejected()
    );

    it.skip('create custom public with reserved tag type', () =>
      should(app.mutableData.newPublic(TEST_NAME_PUBLIC, TAG_TYPE_RESERVED)).be.rejected()
    );

    it.skip('create custom private with reserved tag type', () =>
      should(app.mutableData.newPrivate(TEST_NAME_PRIVATE, TAG_TYPE_RESERVED)).be.rejected()
    );

    it('create random public with invalid tag vaue', () =>
      should(app.mutableData.newRandomPublic(TAG_TYPE_INVALID)).be.rejected()
    );

    it('create random private with invalid tag value', () =>
      should(app.mutableData.newRandomPrivate(TAG_TYPE_INVALID)).be.rejected()
    );

    it('create custom public with invalid tag value', () =>
      should(app.mutableData.newPublic(TEST_NAME_PUBLIC, TAG_TYPE_INVALID)).be.rejected()
    );

    it('create custom private with invalid tag value', () =>
      should(app.mutableData.newPrivate(TEST_NAME_PRIVATE, TAG_TYPE_INVALID)).be.rejected()
    );

    it('create custom public with invalid name', () =>
      should(app.mutableData.newPublic(TEST_NAME_INVALID, TAG_TYPE)).be.rejected()
    );

    it('create custom private with invalid name', () =>
      should(app.mutableData.newPrivate(TEST_NAME_INVALID, TAG_TYPE)).be.rejected()
    );
  });

  describe('MutableData info', () => {
    it('create random public entry and read its name', () =>
        app.mutableData.newRandomPublic(TAG_TYPE)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create random private entry and read its name', () =>
        app.mutableData.newRandomPrivate(TAG_TYPE)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create custom public entry and read its name', () =>
        app.mutableData.newPublic(TEST_NAME_PUBLIC, TAG_TYPE)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              // test XOR_NAME generation algorithm applied to the name provided???
              should(r.name).have.length(TEST_NAME_PUBLIC.length);
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create custom private entry and read its name', () =>
        app.mutableData.newPrivate(TEST_NAME_PRIVATE, TAG_TYPE)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              // test XOR_NAME generation algorithm applied to the name provided???
              should(r.name).have.length(TEST_NAME_PUBLIC.length);
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('mdata version', () => app.mutableData.newRandomPrivate(TAG_TYPE)
        .then((m) => m.quickSetup({}).then(() => m.getVersion()))
        .then((version) => {
          should(version).equal(0);
          // test that after a change in mdata (not in the entries) version is incremented
        })
    );
  });

  describe('QuickSetup', () => {
    it('get non-existing key', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup({}).then(() => {
          should(m.get('_non-existing-key')).be.rejected();
          // add validation of the error code returned
        }))
    );

    it('get existing key', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.get('key1')))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          should(value.version).equal(0);
        })
    );

    it('serialise/deserialise smoketest', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.serialise())) // serialise
          .then((serial) => app.mutableData.fromSerial(serial)) // check it deserialises again
    );
  });

  describe('Entries', () => {
    it('get entries and check length', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
        .then((entries) => entries.len())
        .then((len) => {
          should(len).equal(Object.keys(TEST_ENTRIES).length);
        })
    );

    it('get entries and get a value', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
        .then((entries) => entries.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          should(value.version).equal(0);
        })
    );

    it('insert & get a single value', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
        .then((entries) => entries.insert('newKey', 'newValue')
          .then(entries.get('newKey')
          .then((value) => {
            should(value).not.be.undefined();
            should(value.buf.toString()).equal('newValue');
            should(value.version).equal(0);
          }))
    ));

    it.skip('forEach on the list of entries', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
        .then((entries) => entries.forEach(() => {
          throw new Error('Test Not Implemented');
        }))
    );

    it('get list of keys', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
        .then((keys) => keys.len())
        .then((len) => {
          should(len).equal(Object.keys(TEST_ENTRIES).length);
        })
    );

    it.skip('forEach on list of keys', () => {
      throw new Error('Test Not Implemented');
    });

    it('get list of values', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
        .then((values) => values.len())
        .then((len) => {
          should(len).equal(Object.keys(TEST_ENTRIES).length);
        })
    );

    it.skip('forEach on list of values', () => {
      throw new Error('Test Not Implemented');
    });

    it.skip('encrypt entry key', () => {
      throw new Error('Test Not Implemented');
    });

    it.skip('encrypt entry value', () => {
      throw new Error('Test Not Implemented');
    });
  });

  describe('Applying EntryMutationTransaction', () => {
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

  describe('Permissions', () => {
    it('get list of permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.getPermissions()
            .then((perm) => perm.len())
            .then((length) => {
              should(length).equal(1);
            })
          ))
    );

    it.skip('get user\'s permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.auth.getPubSignKey()
            .then((pk) => m.getUserPermissions(pk.ref)
              .then((perm) => perm.len())
              .then((length) => {
                should(length).equal(1);
              })
            )))
    );

    it.skip('get permissions set', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.getPermissions()
            .then((perm) => app.auth.getPubSignKey()
              .then((pk) => perm.getPermissionSet(pk.ref))
              .then((permSet) => permSet.len())
              .then((length) => {
                should(length).equal(3);
              })
          )))
    );

    it.skip('remove a permission', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.getPermissions()
            .then((perm) => app.auth.getPubSignKey()
              .then((pk) => perm.delPermissionsSet(pk.ref, 1))
              .then((updatedPerm) => m.getEntries()
                .then((entries) => m.put(updatedPerm, entries))
                .then(() => app.mutableData.newMutation()
                  .then((mut) => mut.update('key2', 'updatedValue', 1)
                    .then(() => {
                      should(m.applyEntriesMutation(mut)).be.fulfilled();
                    })
                  ))))))
    );

    it.skip('update a permission', () => {
      throw new Error('Test Not Implemented');
    });
  });

  describe.skip('Owners', () => {
    it('change oenwership', () => {
      throw new Error('Test Not Implemented');
    });
  });
});

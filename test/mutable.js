const crypto = require('crypto');
const should = require('should');
const h = require('./helpers');
const consts = require('../src/consts');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Mutable Data', () => {
  let app = createAuthenticatedTestApp();
  const TAG_TYPE = 15639;
  const TAG_TYPE_RESERVED = 10000;
  const TAG_TYPE_INVALID = '_invalid_tag';
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
      should(app.mutableData.newPublic(h.createRandomXorName(), TAG_TYPE_RESERVED)).be.rejected()
    );

    it.skip('create custom private with reserved tag type', () =>
      should(app.mutableData.newPrivate(h.createRandomXorName(), TAG_TYPE_RESERVED,
                                          h.createRandomSecKey(),
                                          h.createRandomNonce())).be.rejected()
    );

    it('create random public with invalid tag vaue', () =>
      should(app.mutableData.newRandomPublic(TAG_TYPE_INVALID)).be.rejected()
    );

    it('create random private with invalid tag value', () =>
      should(app.mutableData.newRandomPrivate(TAG_TYPE_INVALID)).be.rejected()
    );

    it('create custom public with invalid tag value', () =>
      should(app.mutableData.newPublic(h.createRandomXorName(), TAG_TYPE_INVALID)).be.rejected()
    );

    it('create custom private with invalid tag value', () =>
      should(app.mutableData.newPrivate(h.createRandomXorName(), TAG_TYPE_INVALID,
                                          h.createRandomSecKey(),
                                          h.createRandomNonce())).be.rejected()
    );

    it('create custom public with invalid name', () =>
      should(app.mutableData.newPublic(TEST_NAME_INVALID, TAG_TYPE)).be.rejected()
    );

    it('create custom private with invalid name', () =>
      should(app.mutableData.newPrivate(TEST_NAME_INVALID, TAG_TYPE,
                                          h.createRandomSecKey(),
                                          h.createRandomNonce())).be.rejected()
    );
  });

  describe('MutableData info', () => {
    it('create random public and read its name', () =>
        app.mutableData.newRandomPublic(TAG_TYPE)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create random private and read its name', () =>
        app.mutableData.newRandomPrivate(TAG_TYPE)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create custom public and read its name', () =>
        app.mutableData.newPublic(h.createRandomXorName(), TAG_TYPE)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              // test XOR_NAME generation algorithm applied to the name provided???
              should(r.name).have.length(32);
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create custom private and read its name', () =>
        app.mutableData.newPrivate(h.createRandomXorName(), TAG_TYPE,
                                    h.createRandomSecKey(), h.createRandomNonce())
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.name).have.length(32);
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
    it('get non-existing key from public MD', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup({}).then(() => {
          should(m.get('_non-existing-key')).be.rejected();
          // add validation of the error code returned
        }))
    );

    it('get existing key from public MD', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.get('key1')))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          should(value.version).equal(0);
        })
    );

    it('get existing key from private MD', () => {
      const testXorName = h.createRandomXorName();
      return app.crypto.generateNonce()
        .then((nonce) => app.mutableData.newPrivate(testXorName, TAG_TYPE,
                                        h.createRandomSecKey(), nonce))
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          should(value.version).equal(0);
        });
    });

    it('get existing key from serialised private MD', () => {
      const testXorName = h.createRandomXorName();
      return app.mutableData.newPrivate(testXorName, TAG_TYPE,
                                        h.createRandomSecKey(), h.createRandomNonce())
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.serialise())
        .then((serial) => app.mutableData.fromSerial(serial))
        .then((privmd) => privmd.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          should(value.version).equal(0);
        });
    });

    it('get existing key from fetching public MD again', () => {
      const testXorName = h.createRandomXorName();
      return app.mutableData.newPublic(testXorName, TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then(() => app.mutableData.newPublic(testXorName, TAG_TYPE))
        .then((md) => md.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          should(value.version).equal(0);
        });
    });

    it('serialise/deserialise smoketest', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.serialise())) // serialise
          .then((serial) => app.mutableData.fromSerial(serial)) // check it deserialises again
    );
  });

  describe('Null entries and/or permissions', () => {
    it('null entries & permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.put(null, null)
          .then(() => m.getVersion())
          .then((version) => {
            should(version).equal(0);
          })
          .then(() => m.getNameAndTag())
          .then((r) => {
            should(r.name).not.be.undefined();
            should(r.tag).equal(TAG_TYPE);
          })
          .then(() => m.getEntries())
          .then((entries) => entries.len()
            .then((len) => {
              should(len).equal(0);
            })
            .then(() => entries.insert('newKey', 'newValue'))
            .then(() => should(m.put(null, entries)).be.rejected())
          )
        )
    );

    it('non-null entries and null permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => app.mutableData.newEntries()
          .then((entries) => entries.insert('key1', 'value1')
            .then(() => m.put(null, entries)
              .then(() => m.getVersion())
              .then((version) => {
                should(version).equal(0);
              })
              .then(() => m.get('key1'))
              .then((value) => {
                should(value).not.be.undefined();
                should(value.buf.toString()).equal('value1');
                should(value.version).equal(0);
              })
              .then(() => entries.insert('newKey', 'newValue'))
              .then(() => should(m.put(null, entries)).be.rejected())
            )
        ))
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

    it('insert & get a single value from private MD', () => app.mutableData.newRandomPrivate(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
        .then((entries) => entries.insert('newKey', 'newValue')
          .then(entries.get('newKey')
          .then((value) => {
            should(value).not.be.undefined();
            should(value.buf.toString()).equal('newValue');
            should(value.version).equal(0);
          }))
    ));

    it('forEach on list of entries', (done) => {
      app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
        .then((entries) => entries.forEach((key, value) => {
          should(value.version).be.equal(0);
          should(TEST_ENTRIES).have.ownProperty(key.toString());
          should(TEST_ENTRIES[key.toString()]).be.equal(value.buf.toString());
        }).then(() => done(), (err) => done(err)));
    });

    it('get list of keys', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
        .then((keys) => keys.len())
        .then((len) => {
          should(len).equal(Object.keys(TEST_ENTRIES).length);
        })
    );

    it('forEach on list of keys', (done) => {
      app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
        .then((keys) => keys.forEach((key) => {
          should(TEST_ENTRIES).have.ownProperty(key.toString());
        }).then(() => done(), (err) => done(err)));
    });

    it('get list of values', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
        .then((values) => values.len())
        .then((len) => {
          should(len).equal(Object.keys(TEST_ENTRIES).length);
        })
    );

    it('forEach on list of values', (done) => {
      app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
        .then((values) => values.forEach((value) => {
          should(TEST_ENTRIES).matchAny((v) => {
            should(v).be.eql(value.buf.toString());
            should(value.version).be.equal(0);
          });
        }).then(() => done(), (err) => done(err)));
    });
  });

  describe('Encrypt entry key/value', () => {
    it('encrypt entry key on public md', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptKey('_testkey'))
        .then((key) => {
          should(key).not.be.undefined();
          should(key.toString()).equal('_testkey');
        }))
    );

    it('encrypt entry value on public md', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptValue('_testvalue'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.toString()).equal('_testvalue');
        }))
    );

    it('encrypt entry key on private md', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptKey('_testkey'))
        .then((key) => {
          should(key).not.be.undefined();
          should(key.toString()).not.be.equal('_testkey');
        }))
    );

    it('encrypt entry value on private md', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptValue('_testvalue'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.toString()).not.be.equal('_testvalue');
        }))
    );
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

    it('forEach on list of permissions', (done) => {
      app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getPermissions()
          .then((perms) => app.crypto.getAppPubSignKey()
            .then((pk) => perms.getPermissionSet(pk).should.be.fulfilled())
            .then(() => perms.forEach((signkey, pmset) => pmset.setAllow('Delete')
                .then(() => m.delUserPermissions(signkey, 1).should.be.fulfilled())
                .catch((err) => done(err))
            ).then(() => done(), (err) => done(err)))
          )));
    });

    it('get permissions set', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.getPermissions()
            .then((perm) => app.crypto.getAppPubSignKey()
              .then((pk) => perm.getPermissionSet(pk).should.be.fulfilled())
            )))
    );

    it('insert permissions set for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.mutableData.newPermissionSet()
            .then((newPermSet) => newPermSet.setAllow('Delete')
              .then(() => m.getPermissions()
              .then((perm) => perm.insertPermissionSet(null, newPermSet).should.be.fulfilled())
            ))))
    );

    it('get permissions set for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.mutableData.newPermissionSet()
            .then((newPermSet) => newPermSet.setAllow('Delete')
              .then(() => m.getPermissions()
              .then((perm) => perm.insertPermissionSet(null, newPermSet)
                .then(() => perm.getPermissionSet(null).should.be.fulfilled())
              )))))
    );

    it('insert new permissions set', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.crypto.getAppPubSignKey()
            .then((pk) => app.mutableData.newPermissionSet()
              .then((newPermSet) => newPermSet.setAllow('Delete')
                .then(() => m.setUserPermissions(pk, newPermSet, 1)
                  .then(() => app.mutableData.newMutation()
                    .then((mut) => mut.update('key2', 'updatedValue', 1)
                      .then(() => should(m.applyEntriesMutation(mut)).be.rejected())
                    )))))))
    );

    it('update user\'s permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.crypto.getAppPubSignKey()
            .then((pk) => m.getUserPermissions(pk)
              .then((permSet) => permSet.setDeny('Update')
                .then(() => m.setUserPermissions(pk, permSet, 1)
                .then(() => app.mutableData.newMutation()
                  .then((mut) => mut.update('key2', 'updatedValue', 1)
                    .then(() => should(m.applyEntriesMutation(mut)).be.rejected())
                  )))))))
    );

    it('get user\'s permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.crypto.getAppPubSignKey()
            .then((pk) => m.getUserPermissions(pk).should.be.fulfilled())
            // we should be testing something more here...
          ))
    );

    it('remove user\'s permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.crypto.getAppPubSignKey()
            .then((pk) => m.delUserPermissions(pk, 1))
            .then(() => app.mutableData.newMutation()
              .then((mut) => mut.update('key2', 'updatedValue', 1)
                .then(() => should(m.applyEntriesMutation(mut)).be.rejected())
              ))))
    );

    it('update user\'s permissions', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.crypto.getAppPubSignKey()
            .then((pk) => app.mutableData.newPermissionSet()
              .then((newPerm) => newPerm.setAllow('Insert')
                .then(() => m.setUserPermissions(pk, newPerm, 1))
                .then(() => app.mutableData.newMutation()
                  .then((mut) => mut.update('key2', 'updatedValue', 1)
                    .then(() => should(m.applyEntriesMutation(mut))
                                  .be.rejected())
                  ))))))
    );

    it('set new permissions for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.mutableData.newPermissionSet())
          .then((newPermSet) => newPermSet.setAllow('Insert')
            .then(() => m.setUserPermissions(null, newPermSet, 1).should.be.fulfilled())
          ))
    );

    it('set cleared permissions for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.mutableData.newPermissionSet())
          .then((newPermSet) => newPermSet.clear('Insert')
            .then(() => m.setUserPermissions(null, newPermSet, 1).should.be.fulfilled())
          ))
    );

    it('get user permissions for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.mutableData.newPermissionSet())
          .then((newPermSet) => newPermSet.setAllow('Insert')
            .then(() => m.setUserPermissions(null, newPermSet, 1)))
          .then(() => m.getUserPermissions(null).should.be.fulfilled())
        )
    );

    it('remove user permissions for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => app.mutableData.newPermissionSet())
          .then((newPermSet) => newPermSet.setAllow('Insert')
            .then(() => m.setUserPermissions(null, newPermSet, 1)))
          .then(() => m.delUserPermissions(null, 2).should.be.fulfilled())
        )
    );
  });

  describe('NFS emulation', () => {
    before(function bfore(done) {
      // Let's get a new instance of the app to not hit the PUTs limit
      this.timeout(5000);
      app = createAuthenticatedTestApp();
      done();
    });

    it('opens file in write mode, writes, and returns fetched file', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
      .then((nfs) => {
        should(consts.OPEN_MODE_OVERWRITE).equal(1);
        return nfs.open(null, consts.OPEN_MODE_OVERWRITE)
          .then((file) => file.write('hello, SAFE world!')
            .then(() => file.close())
            .then(() => nfs.insert('hello.txt', file))
          )
          .then(() => {
            should(nfs.fetch('hello.txt')).be.fulfilled();
          }
        );
      })
    );

    it('reads a file and returns file contents', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
      .then((nfs) => nfs.open(null, consts.OPEN_MODE_OVERWRITE)
        .then((file) => file.write('hello, SAFE world!')
          .then(() => file.close())
          .then(() => nfs.insert('hello.txt', file))
        )
        .then(() => nfs.fetch('hello.txt'))
        .then((retrievedFile) => nfs.open(retrievedFile, consts.OPEN_MODE_READ))
        .then((file) => file.read(consts.FILE_READ_FROM_BEGIN, consts.FILE_READ_TO_END))
        .then((data) => {
          should(data.toString()).be.equal('hello, SAFE world!');
        })
      )
    );

    it('provides helper function to create and save file to the network', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
      .then((nfs) => should(nfs.create('testing')).be.fulfilled())
    );

    it('deletes file', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      // Note we use lowercase 'nfs' below to test that it is case insensitive
      .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
      .then((nfs) => nfs.create('Hello world')
        .then((file) => nfs.insert('test.txt', file))
        .then(() => nfs.delete('test.txt', 1))
        .then(() => {
          should(nfs.fetch('test.txt')).be.rejected();
        })
      )
    );

    it('create, delete, update, fetch and finally open to read a file', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs'))
        .then((nfs) => nfs.create('Hello world')
          .then((file) => nfs.insert('test.txt', file))
          .then(() => nfs.delete('test.txt', 1))
          .then(() => nfs.create('Hello world'))
          .then((file) => m.get('test.txt').then((value) => nfs.update('test.txt', file, value.version + 1)))
          .then(() => nfs.fetch('test.txt'))
          .then((file) => nfs.open(file, 4))
          .then((f) => f.read(0, 0))
          .then((co) => {
            should(co.toString()).be.equal('Hello world');
          })
        ))
    );
  });

  describe('forceCleanUp', () => {
    it('forceCleanUp on MutableData object only', () => {
      const testXorName = h.createRandomXorName();
      return app.mutableData.newPublic(testXorName, TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.forceCleanUp())
        );
    });

    // We need to solve this issue which seems to be in node-ffi callbacks mechanism
    it.skip('forceCleanUp on both MutableData and safeApp objects', () => {
      const testXorName = h.createRandomXorName();
      return app.mutableData.newPublic(testXorName, TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.forceCleanUp())
        )
        .then(() => app.forceCleanUp());
    });
  });

  describe.skip('Owners', () => {
    it('change ownership', () => {
      throw new Error('Test Not Implemented');
    });
  });
});

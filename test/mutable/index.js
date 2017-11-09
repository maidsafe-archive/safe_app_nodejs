const should = require('should');
const h = require('../helpers');
const { pubConsts: CONSTANTS } = require('../../src/consts');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Mutable Data', function test() { // eslint-disable-line prefer-arrow-callback
  this.timeout(30000);
  const app = createAuthenticatedTestApp();
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

    it('puts mutable data on network', async () => {
      const mutableData = await app.mutableData.newRandomPublic(15001);
      const entries = await app.mutableData.newEntries();
      const permissions = await app.mutableData.newPermissions();
      const permissionSet = await app.mutableData.newPermissionSet();
      const signingKey = await app.crypto.getAppPubSignKey();
      await permissionSet.setAllow('Insert');
      await permissionSet.setAllow('Update');
      await permissionSet.setAllow('Delete');
      await permissionSet.setAllow('ManagePermissions');
      await permissions.insertPermissionSet(signingKey, permissionSet);
      await mutableData.put(permissions, entries).should.be.fulfilled();
    });
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

  describe('Errors', () => {
    it('missing callback in keys.forEach', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup().then(() => m.getKeys()))
      .then((keys) => keys.forEach().should.be.rejectedWith('A function parameter _must be_ provided'))
    );

    it('missing callback in values.forEach', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup().then(() => m.getValues()))
      .then((values) => values.forEach().should.be.rejectedWith('A function parameter _must be_ provided'))
    );

    it('missing callback in entries.forEach', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup().then(() => m.getEntries()))
      .then((entries) => entries.forEach().should.be.rejectedWith('A function parameter _must be_ provided'))
    );
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

  describe('Metadata', () => {
    it('set metadata with quickSetup', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES, 'name of MD', 'description of MD'))
        .then((md) => should(md.get(CONSTANTS.MD_METADATA_KEY)).be.fulfilled())
    );

    it('set & update metadata', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.setMetadata('name of MD', 'description of MD')
          .then(() => md.setMetadata('update name', 'update description'))
          .then(() => should(md.get(CONSTANTS.MD_METADATA_KEY)).be.fulfilled())
        )
    );

    it('empty metadata', () => app.mutableData.newRandomPublic(TAG_TYPE)
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.setMetadata()
          .then(() => md.setMetadata('name of MD'))
          .then(() => md.setMetadata(null, 'description of MD'))
          .then(() => should(md.get(CONSTANTS.MD_METADATA_KEY)).be.fulfilled())
        )
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

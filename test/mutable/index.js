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
const h = require('../helpers');
const { pubConsts: CONSTANTS } = require('../../src/consts');
const errConst = require('../../src/error_const');

describe('Mutable Data', () => {
  let app;
  const TYPE_TAG = 15639;
  const TAG_TYPE_INVALID = '_invalid_tag';
  const TEST_NAME_INVALID = 'name-shorter-than-32-bytes-long';
  const TEST_ENTRIES = { key1: 'value1', key2: 'value2' };

  before(async () => {
    app = await h.createAuthenticatedTestApp();
  });

  describe('Create with invalid values', () => {
    it('create random public with invalid tag vaue', () => {
      const test = () => app.mutableData.newRandomPublic(TAG_TYPE_INVALID);
      return should(test).throw(errConst.TYPE_TAG_NAN.msg);
    });

    it('create random private with invalid tag value', () => {
      const test = () => app.mutableData.newRandomPrivate(TAG_TYPE_INVALID);
      return should(test).throw(errConst.TYPE_TAG_NAN.msg);
    });

    it('create custom public with invalid tag value', () => {
      const test = () => app.mutableData.newPublic(h.createRandomXorName(), TAG_TYPE_INVALID);
      return should(test).throw(errConst.TYPE_TAG_NAN.msg);
    });

    it('create custom private with invalid tag value', () => should(app.mutableData.newPrivate(h.createRandomXorName(), TAG_TYPE_INVALID,
                                          h.createRandomSecKey(),
                                          h.createRandomNonce()))
        .be.rejectedWith(errConst.TYPE_TAG_NAN.msg)
    );

    it('create custom public with invalid name', () => {
      const test = () => app.mutableData.newPublic(TEST_NAME_INVALID, TYPE_TAG);
      return should(test).throw(errConst.XOR_NAME.msg(32));
    });

    it('create custom private with invalid name', () => should(app.mutableData.newPrivate(TEST_NAME_INVALID, TYPE_TAG,
                                          h.createRandomSecKey(),
                                          h.createRandomNonce()))
        .be.rejectedWith(errConst.XOR_NAME.msg(32)));

    it('create custom private with non-Buffer and invalid name', () => should(app.mutableData.newPrivate(h.createRandomInvalidXor().toString(), TYPE_TAG,
                                    h.createRandomSecKey(), h.createRandomNonce()))
        .be.rejectedWith(errConst.XOR_NAME.msg(32)));

    it('create custom private with non-Buffer and invalid secret key', () => should(app.mutableData.newPrivate(
                                    h.createRandomXorName(),
                                    TYPE_TAG,
                                    h.createRandomInvalidSecKey().toString(),
                                    h.createRandomNonce()))
        .be.rejectedWith(errConst.INVALID_SEC_KEY.msg(32)));

    it('create custom private with non-Buffer and invalid nonce', () => should(app.mutableData.newPrivate(
                                    h.createRandomXorName(),
                                    TYPE_TAG,
                                    h.createRandomSecKey(),
                                    h.createRandomInvalidNonce().toString()))
        .be.rejectedWith(errConst.NONCE.msg(24)));

    it('create custom private with and invalid name as Buffer', () => should(app.mutableData.newPrivate(h.createRandomInvalidXor(), TYPE_TAG,
                                    h.createRandomSecKey(), h.createRandomNonce()))
        .be.rejectedWith(errConst.XOR_NAME.msg(32)));

    it('create custom private with and invalid secret key as Buffer', () => should(app.mutableData.newPrivate(h.createRandomXorName(), TYPE_TAG,
                                    h.createRandomInvalidSecKey(), h.createRandomNonce()))
        .be.rejectedWith(errConst.INVALID_SEC_KEY.msg(32)));

    it('create custom private with and invalid nonce as Buffer', () => should(app.mutableData.newPrivate(h.createRandomXorName(), TYPE_TAG,
                                    h.createRandomSecKey(), h.createRandomInvalidNonce()))
        .be.rejectedWith(errConst.NONCE.msg(24)));
  });

  describe('MutableData info', () => {
    it('create random public and read its name', () =>
        app.mutableData.newRandomPublic(TYPE_TAG)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              return should(r.typeTag).equal(TYPE_TAG);
            })
    );

    it('create random private and read its name', () =>
        app.mutableData.newRandomPrivate(TYPE_TAG)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              return should(r.typeTag).equal(TYPE_TAG);
            })
    );

    it('create custom public and read its name', () =>
        app.mutableData.newPublic(h.createRandomXorName(), TYPE_TAG)
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.name).have.length(32);
              return should(r.typeTag).equal(TYPE_TAG);
            })
    );

    it('throws error if custom private is created with nonce not equal to 24 bytes', async () => {
      const nonce = 'not a nonce';
      return should(
             app.mutableData.newPrivate(h.createRandomXorName(),
                                        TYPE_TAG,
                                        h.createRandomSecKey(),
                                        nonce))
            .be.rejectedWith(errConst.NONCE.msg(24));
    });

    it('throws error if custom private is created with invalid secret key', async () => should(
             app.mutableData.newPrivate(h.createRandomXorName(),
                                        TYPE_TAG,
                                        h.createRandomInvalidSecKey(),
                                        h.createRandomNonce()))
            .be.rejectedWith(errConst.INVALID_SEC_KEY.msg(32)));

    it('create custom private and read its name', () =>
        app.mutableData.newPrivate(h.createRandomXorName(), TYPE_TAG,
                                    h.createRandomSecKey(), h.createRandomNonce())
            .then((m) => m.quickSetup({}).then(() => m.getNameAndTag()))
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.name).have.length(32);
              return should(r.typeTag).equal(TYPE_TAG);
            })
    );

    it('mdata version', () => app.mutableData.newRandomPrivate(TYPE_TAG)
        .then((m) => m.quickSetup({}).then(() => m.getVersion()))
        .then((version) => should(version).equal(0)
          // test that after a change in mdata (not in the entries) version is incremented
        )
    );

    it('puts mutable data on network', async () => {
      const permissionSet = ['Insert', 'Update', 'Delete', 'ManagePermissions'];
      const mutableData = await app.mutableData.newRandomPublic(15001);
      const entries = await app.mutableData.newEntries();
      const permissions = await app.mutableData.newPermissions();
      const signingKey = await app.crypto.getAppPubSignKey();
      await permissions.insertPermissionSet(signingKey, permissionSet);
      return should(mutableData.put(permissions, entries)).be.fulfilled();
    });
  });

  describe('QuickSetup', () => {
    it('get non-existing key from public MD', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup({}).then(() =>
          should(m.get('_non-existing-key')).be.rejectedWith('Core error: Routing client error -> Requested entry not found')
        ))
    );

    it('get existing key from public MD', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.get('key1')))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          return should(value.version).equal(0);
        })
    );

    it('get existing key from private MD', () => {
      const testXorName = h.createRandomXorName();
      return app.crypto.generateNonce()
        .then((nonce) => app.mutableData.newPrivate(testXorName, TYPE_TAG,
                                        h.createRandomSecKey(), nonce))
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          return should(value.version).equal(0);
        });
    });

    it('get existing key from serialised private MD', () => {
      const testXorName = h.createRandomXorName();
      return app.mutableData.newPrivate(testXorName, TYPE_TAG,
                                        h.createRandomSecKey(), h.createRandomNonce())
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.serialise())
        .then((serial) => app.mutableData.fromSerial(serial))
        .then((privmd) => privmd.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          return should(value.version).equal(0);
        });
    });

    it('get existing key from fetching public MD again', () => {
      const testXorName = h.createRandomXorName();
      return app.mutableData.newPublic(testXorName, TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then(() => app.mutableData.newPublic(testXorName, TYPE_TAG))
        .then((md) => md.get('key1'))
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('value1');
          return should(value.version).equal(0);
        });
    });

    it('serialise/deserialise smoke test', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.serialise()))
          .then((serial) => app.mutableData.fromSerial(serial))
    );

    it('serialised size smoke test', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.getSerialisedSize()))
          .then((size) => should(size).be.greaterThan(0))
    );
  });

  describe('Null entries and/or permissions', () => {
    it('null entries & permissions', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.put(CONSTANTS.MD_PERMISSION_EMPTY, CONSTANTS.MD_ENTRIES_EMPTY)
          .then(() => m.getVersion())
          .then((version) => {
            should(version).equal(0);
          })
          .then(() => m.getNameAndTag())
          .then((r) => {
            should(r.name).not.be.undefined();
            should(r.typeTag).equal(TYPE_TAG);
          })
          .then(() => m.getEntries())
          .then((entries) => entries.len()
            .then((len) => {
              should(len).equal(0);
            })
            .then(() => entries.insert('newKey', 'newValue'))
            .then(() => should(m.put(CONSTANTS.MD_PERMISSION_EMPTY, entries)).be.rejected())
          )
        )
    );

    it('non-null entries and null permissions', () => app.mutableData.newRandomPublic(TYPE_TAG)
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
    it('invalid user\'s permissions', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => {
          const invalidPerm = 'Invalid-Perm';
          return should(md.setUserPermissions(CONSTANTS.USER_ANYONE, [invalidPerm], 1)).be.rejectedWith(`${invalidPerm} is not a valid permission`);
        })
    );
  });

  describe('Encrypt entry key/value', () => {
    it('encrypt entry key on public md', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptKey('_testkey'))
        .then((encKey) => {
          should(encKey).not.be.undefined();
          return should(encKey.toString()).equal('_testkey');
        }))
    );

    it('encrypt entry value on public md', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptValue('_testvalue'))
        .then((encValue) => {
          should(encValue).not.be.undefined();
          return should(encValue.toString()).equal('_testvalue');
        }))
    );

    it('encrypt entry key on private md', () => app.mutableData.newRandomPrivate(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptKey('_testkey'))
        .then((encKey) => {
          should(encKey).not.be.undefined();
          should(encKey.toString()).not.be.equal('_testkey');
          return m.decrypt(encKey)
            .then((key) => should(key.toString()).equal('_testkey'));
        }))
    );

    it('encrypt entry value on private md', () => app.mutableData.newRandomPrivate(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.encryptValue('_testvalue'))
        .then((value) => {
          should(value).not.be.undefined();
          return should(value.toString()).not.be.equal('_testvalue');
        }))
    );
  });

  describe('Metadata', () => {
    it('set metadata with quickSetup', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES, 'name of MD', 'description of MD'))
        .then((md) => should(md.get(CONSTANTS.MD_METADATA_KEY)).be.fulfilled())
    );

    it('set & update metadata', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.setMetadata('name of MD', 'description of MD')
          .then(() => md.setMetadata('update name', 'update description'))
          .then(() => should(md.get(CONSTANTS.MD_METADATA_KEY)).be.fulfilled())
        )
    );

    it('empty metadata', () => app.mutableData.newRandomPublic(TYPE_TAG)
        .then((m) => m.quickSetup(TEST_ENTRIES))
        .then((md) => md.setMetadata()
          .then(() => md.setMetadata('name of MD'))
          .then(() => md.setMetadata(null, 'description of MD'))
          .then(() => should(md.get(CONSTANTS.MD_METADATA_KEY)).be.fulfilled())
        )
    );
  });


  describe('forceCleanUp', () => {
    it('forceCleanUp on network object', () => app.mutableData.newMutation()
      .then((mut) => mut.forceCleanUp())
    );

    it('forceCleanUp on safeApp object', () =>
      app.forceCleanUp()
    );

    // We need to solve this issue which seems to be in node-ffi callbacks mechanism
    it.skip('forceCleanUp on both network and safeApp object', () =>
      app.mutableData.newMutation()
        .then((mut) => mut.forceCleanUp())
        .then(() => app.forceCleanUp())
    );
  });

  describe.skip('Owners', () => {
    it('change ownership', () => {
      throw new Error('Test Not Implemented');
    });
  });
}).timeout(30000);

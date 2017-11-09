
const should = require('should');
const h = require('../helpers');
const { pubConsts: CONSTANTS } = require('../../src/consts');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Permissions', function testContainer() {
  this.timeout(30000);
  const app = createAuthenticatedTestApp();
  const TAG_TYPE = 15639;
  const TEST_ENTRIES = { key1: 'value1', key2: 'value2' };

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
            .then((perm) => perm.insertPermissionSet(CONSTANTS.USER_ANYONE,
                                                     newPermSet).should.be.fulfilled())
          ))))
  );

  it('get permissions set for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newPermissionSet()
          .then((newPermSet) => newPermSet.setAllow('Delete')
            .then(() => m.getPermissions()
            .then((perm) => perm.insertPermissionSet(CONSTANTS.USER_ANYONE, newPermSet)
              .then(() => perm.getPermissionSet(CONSTANTS.USER_ANYONE).should.be.fulfilled())
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
          .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE,
                                           newPermSet, 1).should.be.fulfilled())
        ))
  );

  it('set cleared permissions for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newPermissionSet())
        .then((newPermSet) => newPermSet.clear('Insert')
          .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE,
                                           newPermSet, 1).should.be.fulfilled())
        ))
  );

  it('get user permissions for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newPermissionSet())
        .then((newPermSet) => newPermSet.setAllow('Insert')
          .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE, newPermSet, 1)))
        .then(() => m.getUserPermissions(CONSTANTS.USER_ANYONE).should.be.fulfilled())
      )
  );

  it('remove user permissions for `Anyone`', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.mutableData.newPermissionSet())
        .then((newPermSet) => newPermSet.setAllow('Insert')
          .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE, newPermSet, 1)))
        .then(() => m.delUserPermissions(CONSTANTS.USER_ANYONE, 2).should.be.fulfilled())
      )
  );
});

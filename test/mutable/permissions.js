const should = require('should');
const h = require('../helpers');
const { pubConsts: CONSTANTS } = require('../../src/consts');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Permissions', function testContainer() {
  this.timeout(30000);
  const app = createAuthenticatedTestApp();
  const TYPE_TAG = 15639;
  const TEST_ENTRIES = { key1: 'value1', key2: 'value2' };

  it('get list of permissions', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getPermissions()
          .then((perm) => perm.len())
          .then((length) => {
            should(length).equal(1);
          })
        ))
  );

  it('list permission sets and remove them', (done) => {
    app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getPermissions())
        .then((perms) => perms.listPermissionSets()
          .then((permSets) => Promise.all(permSets.map((userPermSet) =>
            m.delUserPermissions(userPermSet.signKey, 1).should.be.fulfilled()
          )))
          .then(() => done(), (err) => done(err))
        )
      );
  });

  it('get permissions set', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getPermissions()
          .then((perm) => app.crypto.getAppPubSignKey()
            .then((pk) => perm.getPermissionSet(pk).should.be.fulfilled())
          )))
  );

  it('insert permissions set for `Anyone`', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getPermissions())
        .then((perm) => perm.insertPermissionSet(CONSTANTS.USER_ANYONE,
                                                 ['Delete']).should.be.fulfilled()))
  );

  it('get permissions set for `Anyone`', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getPermissions())
        .then((perm) => perm.insertPermissionSet(CONSTANTS.USER_ANYONE, ['Delete'])
          .then(() => perm.getPermissionSet(CONSTANTS.USER_ANYONE).should.be.fulfilled())
        ))
  );

  it('insert new permissions set', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.crypto.getAppPubSignKey()
          .then((pk) => m.setUserPermissions(pk, ['Delete'], 1)
            .then(() => app.mutableData.newMutation()
              .then((mut) => mut.update('key2', 'updatedValue', 1)
                .then(() => should(m.applyEntriesMutation(mut)).be.rejected())
              )))))
  );

  it('update user\'s permissions', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.crypto.getAppPubSignKey()
          .then((pk) => m.setUserPermissions(pk, ['Insert'], 1)
          .then(() => app.mutableData.newMutation()
            .then((mut) => mut.update('key2', 'updatedValue', 1)
              .then(() => should(m.applyEntriesMutation(mut)).be.rejected())
            )))))
  );

  it('get user\'s permissions', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.crypto.getAppPubSignKey()
          .then((pk) => m.getUserPermissions(pk).should.be.fulfilled())
        ))
  );

  it('remove user\'s permissions', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => app.crypto.getAppPubSignKey()
          .then((pk) => should(m.delUserPermissions(pk, 1)).be.fulfilled())
          .then(() => app.mutableData.newMutation()
            .then((mut) => mut.update('key2', 'updatedValue', 1)
              .then(() => should(m.applyEntriesMutation(mut))
                .be.rejectedWith('Core error: Routing client error -> Access denied'))
            ))))
  );

  it('set new permissions for `Anyone`', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE,
                                           ['Insert'], 1).should.be.fulfilled())
        )
  );

  it('deny all permissions to `Anyone`', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
          .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE,
                                           null, 1).should.be.fulfilled())
        )
  );

  it('get user permissions for `Anyone`', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.getUserPermissions(CONSTANTS.USER_ANYONE).should.be.rejected())
        .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE, ['Insert'], 1))
        .then(() => m.getUserPermissions(CONSTANTS.USER_ANYONE).should.be.fulfilled())
      )
  );

  it('remove user permissions for `Anyone`', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES)
        .then(() => m.setUserPermissions(CONSTANTS.USER_ANYONE, ['Insert'], 1))
        .then(() => m.delUserPermissions(CONSTANTS.USER_ANYONE, 1).should.be.rejected())
        .then(() => m.delUserPermissions(CONSTANTS.USER_ANYONE, 2).should.be.fulfilled())
      )
  );
});
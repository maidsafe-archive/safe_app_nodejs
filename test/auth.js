const should = require('should');
const h = require('./helpers');
const errConst = require('../src/error_const');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

/* eslint-disable no-shadow */
describe('auth interface', () => {
  let app;

  before(async () => {
    const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };
    app = await createAuthenticatedTestApp('_test_scope', containersPermissions);
  });

  it('should build some authentication uri', () => {
    const app = h.createTestApp();
    return app.auth.genAuthUri({ _public: ['Read'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should build some authentication uri if missing permissions object', () => {
    const app = h.createTestApp();
    return app.auth.genAuthUri()
      .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('throws error if permissions object contains invalid permission', async () => {
    const app = h.createTestApp();
    const test = () => app.auth.genAuthUri({ _public: ['Invalid'] });
    return should(test).throw('Invalid is not a valid permission');
  });

  it('should throw error if non-standard container is requested', () => {
    const containersPermissions = { _app: ['Read', 'Insert', 'ManagePermissions'] };
    return should(createAuthenticatedTestApp('_test_scope', containersPermissions, { own_container: true }))
      .be.rejected();
  });

  it('is authenticated for testing', () => should(app.auth.registered).be.true());

  it('should build some containers uri', () => {
    const app = h.createTestApp();
    return app.auth.genContainerAuthUri({ _public: ['Insert'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should build some containers uri if missing containers object', () => {
    const app = h.createTestApp();
    return app.auth.genContainerAuthUri()
      .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('throws error if invalid container permission requested', () => {
    const app = h.createTestApp();
    const test = () => app.auth.genContainerAuthUri({ _public: ['Invalid'] });
    return should(test).throw('Invalid is not a valid permission');
  });

  it('should build some shared MD uri', () => {
    const app = h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ type_tag: 15001, name: sharedMdXorName, perms: ['Insert'] }];
    return app.auth.genShareMDataUri(perms)
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should throw error for non-existent permissions array for share MD request', () => {
    const app = h.createTestApp();
    const test = () => app.auth.genShareMDataUri();
    return should(test).throw(errConst.MISSING_PERMS_ARRAY.msg);
  });

  it('should throw error for misspelled or non-existent share MD request permission', async () => {
    const app = h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ name: sharedMdXorName, perms: ['Insert'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(errConst.INVALID_SHARE_MD_PERMISSION.msg(JSON.stringify(perms[0])));
  });

  it('should throw error for malformed share MD request permission', async () => {
    const app = h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = { type_tag: 15001, name: sharedMdXorName, perms: ['Insert'] };
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(errConst.INVALID_PERMS_ARRAY.msg);
  });

  it('should throw error for invalid share MD request permission', async () => {
    const app = h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ type_tag: 15001, name: sharedMdXorName, perms: ['Wrong'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(`${perms[0].perms[0]} is not a valid permission`);
  });

  it('should throw error for share MD request if type_tag is non-integer', async () => {
    const app = h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ type_tag: 'non-integer', name: sharedMdXorName, perms: ['Insert'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(
      errConst.INVALID_SHARE_MD_PERMISSION.msg(JSON.stringify(perms[0]))
    );
  });

  it('should throw error for share MD request if name is not 32 byte buffer', async () => {
    const app = h.createTestApp();
    const mdName = 'not 32 byte buffer';
    const perms = [{ type_tag: 15001, name: mdName, perms: ['Insert'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(
      errConst.INVALID_SHARE_MD_PERMISSION.msg(JSON.stringify(perms[0]))
    );
  });

  it('creates unregistered connection', () => {
    const app = h.createTestApp();
    return app.auth.genConnUri()
      .then((resp) => {
        should(resp.uri).is.not.undefined();
        return should(resp.uri).startWith('safe-auth:');
      });
  });

  it('logs in to network with URI response from authenticator', () => {
    const app = h.createTestApp();
    return should(app.auth.loginFromURI(h.authUris.registeredUri)).be.fulfilled();
  });

  it('creates an authenticated session just for testing', () => {
    const app = h.createTestApp();
    return should(app.auth.loginForTest()).be.fulfilled();
  }).timeout(20000);
});

describe('Access Container', () => {
  let app;

  before(async () => {
    const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };
    app = await createAuthenticatedTestApp('_test_scope', containersPermissions, { own_container: true });
  });

  it('should have a connection object after completing app authentication', () => {
    should.exist(app.connection);
  });

  /* eslint-disable dot-notation */
  it('get container names', () => app.auth.refreshContainersPermissions().then(() =>
    app.auth.getContainersPermissions().then((contsPerms) => {
      // we always get a our own sandboxed container in tests
      should(Object.keys(contsPerms).length).be.equal(3);
      should(contsPerms['_public']).be.eql({
        Read: true,
        Insert: false,
        Delete: false,
        Update: false,
        ManagePermissions: false
      });
      return should(contsPerms['_publicNames']).be.eql({
        Read: true,
        Insert: true,
        Delete: false,
        Update: false,
        ManagePermissions: true
      });
    })));

  it('returns empty object if no containers found for app', async () => {
    const appWithNoContainers = await createAuthenticatedTestApp();
    const noContainers = await appWithNoContainers.auth.getContainersPermissions();
    const isObject = noContainers.constructor === Object;
    const emptyObject = Object.keys(noContainers).length === 0;
    return should(isObject && emptyObject).be.true();
  });

  it('get own container', () => app.auth.refreshContainersPermissions().then(() =>
    app.auth.getOwnContainer().then((mdata) => should(mdata).is.not.undefined())));

  it('throws error if root container requested but was not created', async () => {
    const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };
    const app = await createAuthenticatedTestApp('_test_scope_2', containersPermissions, { own_container: false });
    return should(app.auth.getOwnContainer()).be.rejectedWith('Container not found');
  });

  it('has read access to `_public`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('_public').then((hasAccess) => should(hasAccess).be.true())));

  it('has access to `_public` for `Read` and Insert`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('_public', ['Read', 'Insert']).then((hasAccess) => should(hasAccess).be.false())));

  it('has access to `_publicNames` for `Read` and ManagePermissions`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('_publicNames', ['Read', 'ManagePermissions']).then((hasAccess) => should(hasAccess).be.true())));

  it('access permission provided as a string', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('_public', 'Read').then((hasAccess) => should(hasAccess).be.true())));

  it('can\'t access to `__does_not_exist`', () => app.auth.refreshContainersPermissions().then(() => should(app.auth.canAccessContainer('__does_not_exist')).be.rejected()));

  it('read info of `_public`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.getContainer('_public').then((ctnr) => ctnr.getNameAndTag()).then((resp) => {
        should(resp.name).is.not.undefined();
        return should(resp.type_tag).equal(15000);
      })));

  it('throws error is no container name provided', () => app.auth.refreshContainersPermissions().then(() => {
    const test = () => app.auth.getContainer();
    return should(test).throw(errConst.MISSING_CONTAINER_STRING.msg);
  }));

  it('read info of own container', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.getOwnContainer().then((ctnr) => ctnr.getNameAndTag()).then((resp) => {
        should(resp.name).is.not.undefined();
        return should(resp.type_tag).equal(15000);
      })));

  it('mutate info of `_publicNames` container', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.getContainer('_publicNames')
        .then((md) => md.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.insert('key1', 'value1')
              .then(() => md.applyEntriesMutation(mut))
            )))
        .then(() => app.auth.getContainer('_publicNames'))
          .then((md) => md.get('key1'))
          .then((value) => {
            should(value.buf).not.be.undefined();
            return should(value.buf.toString()).equal('value1');
          })
  ));

  it('mutate info of own container', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.getOwnContainer()
        .then((md) => md.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.insert('key1', 'value1')
              .then(() => md.applyEntriesMutation(mut))
            )))
        .then(() => app.auth.getOwnContainer())
          .then((md) => md.get('key1'))
          .then((value) => {
            should(value.buf).not.be.undefined();
            return should(value.buf.toString()).equal('value1');
          })
  ));
}).timeout(15000);

const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

/* eslint-disable no-shadow */
describe('auth interface', function testContainer() {
  this.timeout(15000);
  const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };
  const app = createAuthenticatedTestApp('_test_scope', containersPermissions);
  it('should build some authentication uri', () => {
    const app = h.createTestApp();
    return app.auth.genAuthUri({ _public: ['Read'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('is authenticated for testing', () => {
    should(app.auth.registered).be.true();
  });

  it('should build some containers uri', () => {
    const app = h.createTestApp();
    return app.auth.genContainerAuthUri({ private: ['Insert'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should build some shared MD uri', () => {
    const app = h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ type_tag: 15001, name: sharedMdXorName, perms: ['Insert'] }];
    return app.auth.genShareMDataUri(perms)
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('creates unregistered connection', () => {
    const app = h.createTestApp();
    return app.auth.genConnUri()
      .then((resp) => {
        should(resp.uri).is.not.undefined();
        should(resp.uri).startWith('safe-auth:');
      });
  });

  it('logs in to network with URI response from authenticator', async () => {
    const app = h.createTestApp();
    app.auth.loginFromURI(h.authUris.registeredUri).should.be.fulfilled();
  });

  it('creates an authenticated session just for testing', async () => {
    const app = h.createTestApp();
    app.auth.loginForTest().should.be.fulfilled();
  });
});

describe('Access Container', () => {
  const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };
  const app = createAuthenticatedTestApp('_test_scope', containersPermissions);

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
      should(contsPerms['_publicNames']).be.eql({
        Read: true,
        Insert: true,
        Delete: false,
        Update: false,
        ManagePermissions: true
      });
    })));

  it('get own container', () => app.auth.refreshContainersPermissions().then(() =>
    app.auth.getOwnContainer().then((mdata) => {
      should(mdata).is.not.undefined();
    })));

  it('has read access to `_public`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('_public').then((hasAccess) => {
        should(hasAccess).be.true();
      })));

  it('has read access to `_public` for `Read` and Insert`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('_public', ['Read', 'Insert']).then((hasAccess) => {
        should(hasAccess).be.false();
      })));

  it('has read access to `_publicNames` for `Read` and ManagePermissions`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('_publicNames', ['Read', 'ManagePermissions']).then((hasAccess) => {
        should(hasAccess).be.true();
      })));

  it('can\'t access to `__does_not_exist`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.canAccessContainer('__does_not_exist')
          .should.be.rejected()));

  it('read info of `_public`', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.getContainer('_public').then((ctnr) => ctnr.getNameAndTag()).then((resp) => {
        should(resp.name).is.not.undefined();
        should(resp.tag).equal(15000);
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
            should(value.buf.toString()).equal('value1');
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
            should(value.buf.toString()).equal('value1');
          })
  ));
});

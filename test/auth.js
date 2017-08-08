const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Access Container', () => {
  const app = createAuthenticatedTestApp('_test_scope', { _public: ['Read'], _publicNames: ['Read', 'Insert'] });

  it('is authenticated for testing', () => {
    should(app.auth.registered).be.true();
  });

  it('get container names', () => app.auth.refreshContainersPermissions().then(() =>
    app.auth.getContainersNames().then((names) => {
      // we always get a our own sandboxed container in tests")
      should(names.length).be.equal(3);
      should(names).containEql('_public');
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

  it('mutate info of `_public` container', () => app.auth.refreshContainersPermissions().then(() =>
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

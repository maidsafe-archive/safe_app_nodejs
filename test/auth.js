const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Access Container', () => {
  const app = createAuthenticatedTestApp('_test_scope', { _public: ['Read'], _publicNames: ['Read', 'Insert'] });

  it('is authenticated for testing', () => {
    should(app.auth.registered).be.true();
  });

  it('get container names', () => app.auth.refreshContainerAccess().then(() =>
    app.auth.getAccessContainerNames().then((names) => {
      // we always get a our own sandboxed container in tests")
      should(names.length).be.equal(3);
      should(names).containEql('_public');
    })));

  it('get home container', () => app.auth.refreshContainerAccess().then(() =>
    app.auth.getHomeContainer().then((mdata) => {
      should(mdata).is.not.undefined();
    })));
  it('has read access to `_public`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('_public').then((hasAccess) => {
        should(hasAccess).be.true();
      })));

  it('can\'t access to `__does_not_exist`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('__does_not_exist')
          .should.be.rejected()));

  it('read info of `_public`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.getAccessContainerInfo('_public').then((ctnr) => ctnr.getNameAndTag()).then((resp) => {
        should(resp.name).is.not.undefined();
        should(resp.tag).equal(15000);
      })));

  it.skip('mutate info of `_public` container', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.getAccessContainerInfo('_publicNames')
        .then((md) => md.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.insert('key1', 'value1')
              .then(() => md.applyEntriesMutation(mut))
            )))
        .then(() => app.auth.getAccessContainerInfo('_publicNames'))
          .then((md) => md.get('key1'))
          .then((value) => {
            should(value).not.be.undefined();
            should(value.toString()).equal('value1');
          })
  ));

  it.skip('mutate info of home container', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.getHomeContainer()
        .then((md) => md.getEntries()
          .then((entries) => entries.mutate()
            .then((mut) => mut.insert('key1', 'value1')
              .then(() => md.applyEntriesMutation(mut))
            )))
        .then(() => app.auth.getHomeContainer())
          .then((md) => md.get('key1'))
          .then((value) => {
            should(value).not.be.undefined();
            should(value.toString()).equal('value1');
          })
  ));
});

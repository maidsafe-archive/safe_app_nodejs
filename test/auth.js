const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Access Container', () => {
  const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };
  const app = createAuthenticatedTestApp('_test_scope', containersPermissions);

  it('should have a connection object after completing app authentication', () => {
    should.exist(app.connection);
  });

  it('is authenticated for testing', () => {
    should(app.auth.registered).be.true();
  });

  it.only('reads granted permissions without network connection', async () => {
    const appNoConnect = h.createTestApp();
    const authUri = 'safe-bmV0Lm1haWRzYWZlLmFwaV9wbGF5Z3JvdW5kLndlYmNsaWVudC4xMA==:AQAAAK4SycQAAAAAAAAAACAAAAAAAAAAcbeJ6i_3Q8A-1MlwBi_87TwUHeOEiJzUhULZ6lfMjLQgAAAAAAAAAMfippWOIGUmdYzynm_s7pl5ZelwmQEAYSRz3xwcicM_IAAAAAAAAADOWrxc8lCkknb3gBgHc85H9qYqhkUxNfV0KriqwD3lAkAAAAAAAAAAtNPwIs89bpwGT1BzW_KCedL_dCb25SYsNbRVl4jifHDOWrxc8lCkknb3gBgHc85H9qYqhkUxNfV0KriqwD3lAiAAAAAAAAAAUBCtrEXCliKQImiI0csHnA2fXvEqE0tyWDLjSkd1px0gAAAAAAAAALIhZpBN8TSftDJuRlxjsHy6YSR0jsVEErkuDp7YfYzJAAAAAAAAAAAAAAAAAAAAAC6vLdfnemaARQZRGJGDpz3yHw-AGueI6g0nzfzOl9DEmDoAAAAAAAAYAAAAAAAAAFCiBwTgnm67yF_hTXi7gaakYQ7J2I9NCg==';
    const permissions = await appNoConnect.auth.readAppPermissions(authUri);
    console.log(permissions); // eslint-disable-line
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

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
const h = require('./helpers');
const errConst = require('../src/error_const');
const lib = require('../src/native/lib');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createTestApp = h.createTestApp;

const containersPermissions = { _public: ['Read'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };

/* eslint-disable no-shadow */
describe('auth interface', () => {
  let app;
  before(async () => {
    app = await createAuthenticatedTestApp({ scope: '_test_scope' }, containersPermissions);
  });

  it('should build some authentication uri', async () => {
    const app = await h.createTestApp();
    return app.auth.genAuthUri({ _public: ['Read'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should build some authentication uri if missing permissions object', async () => {
    const app = await h.createTestApp();
    return app.auth.genAuthUri()
      .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('throws error if permissions object contains invalid permission', async () => {
    const app = await h.createTestApp();
    const test = () => app.auth.genAuthUri({ _public: ['Invalid'] });
    return should(test).throw('Invalid is not a valid permission');
  });

  it('should throw error if non-standard container is requested', () => {
    const containersPermissions = {
      _public: ['Insert', 'Read', 'Update'],
      _second: ['Read']
    };
    return should(createAuthenticatedTestApp({ scope: '_test_scope' }, containersPermissions, { own_container: true }))
      .be.rejectedWith("'_second' not found in the access container");
  });

  it('is authenticated for testing', () => should(app.auth.registered).be.true());

  it('should build some containers uri', async () => {
    const app = await h.createTestApp();
    return app.auth.genContainerAuthUri({ _public: ['Insert'] })
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should build some containers uri if missing containers object', async () => {
    const app = await h.createTestApp();
    return app.auth.genContainerAuthUri()
      .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('throws error if invalid container permission requested', async () => {
    const app = await h.createTestApp();
    const test = () => app.auth.genContainerAuthUri({ _public: ['Invalid'] });
    return should(test).throw('Invalid is not a valid permission');
  });

  it('should build some shared MD uri', async () => {
    const app = await h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ typeTag: 15001, name: sharedMdXorName, perms: ['Insert'] }];
    return app.auth.genShareMDataUri(perms)
        .then((resp) => should(resp.uri).startWith('safe-auth:'));
  });

  it('should throw error for non-existent permissions array for share MD request', async () => {
    const app = await h.createTestApp();
    const test = () => app.auth.genShareMDataUri();
    return should(test).throw(errConst.MISSING_PERMS_ARRAY.msg);
  });

  it('should throw error for misspelled or non-existent share MD request permission', async () => {
    const app = await h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ name: sharedMdXorName, perms: ['Insert'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(errConst.INVALID_SHARE_MD_PERMISSION.msg(JSON.stringify(perms[0])));
  });

  it('should throw error for malformed share MD request permission', async () => {
    const app = await h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = { typeTag: 15001, name: sharedMdXorName, perms: ['Insert'] };
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(errConst.INVALID_PERMS_ARRAY.msg);
  });

  it('should throw error for invalid share MD request permission', async () => {
    const app = await h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ typeTag: 15001, name: sharedMdXorName, perms: ['Wrong'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(`${perms[0].perms[0]} is not a valid permission`);
  });

  it('should throw error for share MD request if typeTag is non-integer', async () => {
    const app = await h.createTestApp();
    const sharedMdXorName = h.createRandomXorName();
    const perms = [{ typeTag: 'non-integer', name: sharedMdXorName, perms: ['Insert'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(
      errConst.INVALID_SHARE_MD_PERMISSION.msg(JSON.stringify(perms[0]))
    );
  });

  it('should throw error for share MD request if name is not 32 byte buffer', async () => {
    const app = await h.createTestApp();
    const mdName = 'not 32 byte buffer';
    const perms = [{ typeTag: 15001, name: mdName, perms: ['Insert'] }];
    const test = () => app.auth.genShareMDataUri(perms);
    return should(test).throw(
      errConst.INVALID_SHARE_MD_PERMISSION.msg(JSON.stringify(perms[0]))
    );
  });

  it('creates unregistered connection', async () => {
    const app = await h.createTestApp();
    return app.auth.genConnUri()
      .then((resp) => {
        should(resp.uri).is.not.undefined();
        return should(resp.uri).startWith('safe-auth:');
      });
  });

  it('throws error if no URI provided to app_unregistered', async () => {
    const app = await createTestApp();
    return should(lib.app_unregistered(app)).be.rejectedWith(errConst.MISSING_AUTH_URI.msg);
  });

  it('logs in to network with URI response from authenticator', async () => {
    const app = await h.createTestApp();
    return should(app.auth.loginFromUri(h.authUris.registeredUri)).be.fulfilled();
  });

  it('creates an authenticated session just for testing', async () => {
    const app = await h.createTestApp();
    return should(app.auth.loginForTest()).be.fulfilled();
  });

  it('fails to log in to mock network with live network URI response from authenticator', async () => {
    const app = await h.createTestApp();
    return should(app.auth.loginFromUri(h.authUris.liveAuthUri)).be.rejectedWith('IPC error: IncompatibleMockStatus');
  });

  it('fails to log in to mock network with base 64 auth URI', async () => {
    const app = await h.createTestApp();
    return should(app.auth.loginFromUri(h.authUris.base64MockAuthUri)).be.rejectedWith('Serialisation error');
  });
});

describe('Get granted containers permissions from auth URI', () => {
  it('invalid uri', async () => {
    const appNoConnect = await createTestApp();
    return should(appNoConnect.auth.readGrantedPermissions('safe-invalid-uri'))
              .be.rejectedWith('IPC error: InvalidMsg');
  });

  it('uri with no auth granted information', async () => {
    const appNoConnect = await createTestApp();
    return should(appNoConnect.auth.readGrantedPermissions(h.authUris.unregisteredUri))
              .be.rejectedWith('The URI provided is not for an authenticated app with permissions information');
  });

  it('valid auth uri but no containers permissions granted', async () => {
    const appNoConnect = await createTestApp();
    const contsPerms = await should(appNoConnect.auth.readGrantedPermissions(
                                      h.authUris.registeredUriNoContsPerms)
                                    ).be.fulfilled();
    return should(Object.keys(contsPerms).length).be.equal(0);
  });

  /* eslint-disable no-underscore-dangle */
  it('valid auth uri with some containers permissions granted', async () => {
    const appNoConnect = await createTestApp();
    const contsPerms = await appNoConnect.auth.readGrantedPermissions(h.authUris.registeredUri);
    should(Object.keys(contsPerms).length).be.equal(2);
    should(contsPerms._publicNames).be.eql({
      Read: true,
      Insert: true,
      Delete: false,
      Update: false,
      ManagePermissions: false
    });
    const ownContainerName = 'apps/net.maidsafe.examples.mailtutorial';
    return should(contsPerms[ownContainerName]).be.eql({
      Read: true,
      Insert: true,
      Delete: true,
      Update: true,
      ManagePermissions: true
    });
  });
});

describe('Access Container', () => {
  let app;
  const containersPermissions = {
    _documents: ['Read'],
    _downloads: ['Insert'],
    _music: ['Delete'],
    _pictures: ['Read', 'Delete'],
    _videos: ['Update', 'ManagePermissions'],
    _public: ['Read'],
    _publicNames: ['Read', 'Insert', 'ManagePermissions']
  };

  before(async () => {
    app = await createAuthenticatedTestApp({ scope: '_test_scope' }, containersPermissions, { own_container: true });
  });

  it('should have a connection object after completing app authentication', () => should.exist(app.connection));

  /* eslint-disable no-underscore-dangle */
  it('get container names', () => app.auth.refreshContainersPermissions().then(() =>
    app.auth.getContainersPermissions().then((contsPerms) => {
      // we always get a our own sandboxed container in tests
      should(Object.keys(contsPerms).length).be.equal(8);
      should(contsPerms._documents).be.eql({
        Read: true,
        Insert: false,
        Delete: false,
        Update: false,
        ManagePermissions: false
      });
      should(contsPerms._downloads).be.eql({
        Read: false,
        Insert: true,
        Delete: false,
        Update: false,
        ManagePermissions: false
      });
      should(contsPerms._music).be.eql({
        Read: false,
        Insert: false,
        Delete: true,
        Update: false,
        ManagePermissions: false
      });
      should(contsPerms._pictures).be.eql({
        Read: true,
        Insert: false,
        Delete: true,
        Update: false,
        ManagePermissions: false
      });
      should(contsPerms._videos).be.eql({
        Read: false,
        Insert: false,
        Delete: false,
        Update: true,
        ManagePermissions: true
      });
      should(contsPerms._public).be.eql({
        Read: true,
        Insert: false,
        Delete: false,
        Update: false,
        ManagePermissions: false
      });
      return should(contsPerms._publicNames).be.eql({
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
    const app = await createAuthenticatedTestApp('_test_scope_2', containersPermissions, { own_container: false });
    return should(app.auth.getOwnContainer()).be.rejectedWith(`'apps/${h.appInfo.id}' not found in the access container`);
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
        return should(resp.typeTag).equal(15000);
      })));

  it('throws error is no container name provided', () => app.auth.refreshContainersPermissions().then(() => {
    const test = () => app.auth.getContainer();
    return should(test).throw(errConst.MISSING_CONTAINER_STRING.msg);
  }));

  it('read info of own container', () => app.auth.refreshContainersPermissions().then(() =>
      app.auth.getOwnContainer().then((ctnr) => ctnr.getNameAndTag()).then((resp) => {
        should(resp.name).is.not.undefined();
        return should(resp.typeTag).equal(15000);
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

  it('check _public container is a Public MD', async () => {
    const app = await h.publicNamesTestApp();
    const md = await app.auth.getContainer('_public');
    const encKey = await md.encryptKey('_testkey');
    const mut = await app.mutableData.newMutation();
    await mut.insert(encKey, 'plain-text');
    await md.applyEntriesMutation(mut);
    const value = await md.get('_testkey');
    should(value.buf.toString()).be.equal('plain-text');
  });
});

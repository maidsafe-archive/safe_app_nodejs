const lib = require('../src/native/lib');
const should = require('should');
const { fromAuthURI, CONSTANTS } = require('../src');
const h = require('./helpers');

const appInfo = {
  id: 'net.maidsafe.example.tests',
  name: 'Example Test',
  vendor: 'MaidSafe.net Ltd'
};

describe('Smoke testing', () => {
  it('confirms there is a lib', () => {
    should(lib).be.Object();
  });

  it('confirms the CONSTANTS are exposed', () => {
    should(CONSTANTS).be.Object();
  });

  it('confirms the full list of constants', () => {
    // let's check all contants to make sure we don't break any app
    // by accidentally changing a constant's name or value
    const expectedConsts = {
      NFS_FILE_MODE_OVERWRITE: 1,
      NFS_FILE_MODE_APPEND: 2,
      NFS_FILE_MODE_READ: 4,
      NFS_FILE_START: 0,
      NFS_FILE_END: 0,
      USER_ANYONE: 0,
      MD_METADATA_KEY: '_metadata',
      MD_ENTRIES_EMPTY: 0,
      MD_PERMISSION_EMPTY: 0
    };
    should(CONSTANTS).be.eql(expectedConsts);
  });
});

describe('External API', () => {
  describe('fromAuthURI', () => {
    it('should connect registered', () => fromAuthURI(appInfo, h.authUris.registeredUri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true())
    );

    it('should connect unregistered', () => fromAuthURI(appInfo, h.authUris.unregisteredUri, null, { log: false })
        .then((app) => should(app.auth.registered).not.be.true())
    );

    it('should connect with authorised containers', () => fromAuthURI(appInfo, h.authUris.containersUri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true())
    );

    it('should connect with authorised shared MD', () => fromAuthURI(appInfo, h.authUris.sharedMdataUri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true())
    );
  });

  describe('fromAuthURI with URI variations', () => {
    it('URI == safe-:<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, 'safe-:');
      return fromAuthURI(appInfo, uri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true());
    });

    it('URI == <auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, '');
      return fromAuthURI(appInfo, uri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true());
    });

    it('fail with safe-<app info>://<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, '$&//$\'');
      return should(fromAuthURI(appInfo, uri, null, { log: false })).be.rejectedWith('Serialisation error');
    });

    it('fail with safe-<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, 'safe-');
      return should(fromAuthURI(appInfo, uri, null, { log: false })).be.rejectedWith('Serialisation error');
    });

    it('fail with safe:<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, 'safe:');
      return should(fromAuthURI(appInfo, uri, null, { log: false })).be.rejectedWith('Serialisation error');
    });
  });
});

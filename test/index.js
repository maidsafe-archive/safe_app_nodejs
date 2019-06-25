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


const lib = require('../src/native/lib');
const fs = require('fs');
const path = require('path');
const should = require('should');
const { fromAuthUri, CONSTANTS, initialiseApp } = require('../src');
const h = require('./helpers');
const api = require('../src/native/api');
const appHelpers = require('../src/helpers');
const App = require('../src/app');
const consts = require('../src/consts');
const errConst = require('../src/error_const');
const { useMockByDefault, getSafeAppLibFilename, getSystemUriLibFilename } = require('../src/helpers');

const appInfo = {
  id: 'net.maidsafe.example.tests',
  name: 'Example Test',
  vendor: 'MaidSafe.net Ltd'
};

describe('Smoke testing', () => {
  it('confirms there is a lib', () => should(lib).be.Object());

  it('confirms the CONSTANTS are exposed', () => should(CONSTANTS).be.Object());

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
      MD_PERMISSION_EMPTY: 0,
      GET_NEXT_VERSION: 0
    };
    return should(CONSTANTS).be.eql(expectedConsts);
  });

  it('requires additional functions for testing, if in non-production', () => {
    const testingApi = api[api.length - 1];
    should(useMockByDefault).be.true();
    should.exist(testingApi.functions.test_create_app);
    return should.exist(testingApi.functions.test_create_app_with_access);
  });

  it('requires console and console.warn', () => {
    should.exist(console);
    return should.exist(console.warn);
  });

  // TODO: there is an inconsistency between Linux and Windows
  // for the `openUri` function behaviour.
  // On Linux the promise is rejected as expected, while on Windows
  // the promise is resolved with an undefined value. We need to research
  // where the issue exactly is, i.e. system_uri lib or safe_app_nodejs.
  // MAID-2553 was raised to solve this.
  it('system uri openUri function returns a promise', async () => {
    const app = await h.createTestApp();
    return should(app.auth.openUri('')).be.a.Promise(); // TODO: when isse fix add ``.and.be.rejected()` to remove the warning
  });

  it('system uri lib contains "mock" dir (as we\'re testing)', () => {
    const sysUriPath = getSystemUriLibFilename('./');
    return should(sysUriPath.includes('mock')).be.true();
  });

  it('safe app lib contains "mock" dir (as we\'re testing)', () => {
    const libPath = getSafeAppLibFilename('./');
    return should(libPath.includes('mock')).be.true();
  });

  it('safe app lib contains "mock" dir if we force use of mock', () => {
    const libPath = getSafeAppLibFilename('./', { forceUseMock: true });
    return should(libPath.includes('mock')).be.true();
  });

  it('throws error if lib fails to load', () => {
    try {
      appHelpers.autoref(new App(h.appInfo, null, {
        libPath: '/home',
        log: false
      }));
    } catch (err) {
      const errArray = err.message.split('libraries: ');
      should(errConst.FAILED_TO_LOAD_LIB.msg(errArray[1])).be.equal(err.message);
    }
  });

  it('will not init system_uri if library does not exist at expected path', async () => {
    delete lib.registerUriScheme;
    delete lib.openUri;
    const libDir = path.dirname(getSystemUriLibFilename('./src/native/'));
    fs.renameSync(path.join(libDir, consts.SYSTEM_URI_LIB_FILENAME), path.join(libDir, 'hideLib'));
    await h.createTestApp(null, null, { registerScheme: false });
    fs.renameSync(path.join(libDir, 'hideLib'), path.join(libDir, consts.SYSTEM_URI_LIB_FILENAME));
    should.not.exist(lib.registerUriScheme);
    return should.not.exist(lib.openUri);
  });

  it('autoref on object with no "free" function', () => {
    class NoStaticFreeFn {}
    const test = () => appHelpers.autoref(new NoStaticFreeFn());
    should(test).throw('No static "free" function found on object to autoref');
  });
});

describe('External API', () => {
  describe('initialiseApp', () => {
    it('creates and returns new App instance to interface with network', async () => {
      const app = await initialiseApp(appInfo);
      return should(app).have.properties(['auth', 'appInfo', 'crypto', 'cipherOpt', 'mutableData', 'immutableData', 'networkState']);
    });

    it('customExecPath with an array of args', async () => {
      const wrongAppInfo = Object.assign({}, appInfo, { customExecPath: ['arg0', 'arg1', 'arg2'] });
      return should(initialiseApp(wrongAppInfo)).be.fulfilled();
    });

    it('invalid customExecPath param format', async () => {
      const wrongAppInfo = Object.assign({}, appInfo, { customExecPath: 'non-array-exec-path' });
      return should(initialiseApp(wrongAppInfo)).be.rejectedWith('Exec command must be an array of string arguments');
    });

    it('throws error for missing appInfo property', () => should(initialiseApp({ id: 'id1', vendor: 'vendor' })).be.rejectedWith(errConst.MALFORMED_APP_INFO.msg));
  });

  describe('fromAuthUri', () => {
    it('should connect registered', () => fromAuthUri(appInfo, h.authUris.registeredUri, null, { log: false })
      .then((app) => should(app.auth.registered).be.true())
    );

    it('should connect unregistered', () => fromAuthUri(appInfo, h.authUris.unregisteredUri, null, { log: false })
      .then((app) => should(app.auth.registered).not.be.true())
    );

    it('should connect with authorised containers', () => fromAuthUri(appInfo, h.authUris.containersUri, null, { log: false })
      .then((app) => should(app.auth.registered).be.true())
    );

    it('should connect with authorised shared MD', () => fromAuthUri(appInfo, h.authUris.sharedMdataUri, null, { log: false })
      .then((app) => should(app.auth.registered).be.true())
    );
  });

  describe('fromAuthUri with URI variations', () => {
    it('URI == safe-:<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, 'safe-:');
      return fromAuthUri(appInfo, uri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true());
    });

    it('URI == <auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, '');
      return fromAuthUri(appInfo, uri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true());
    });

    // this is the case in Fedora where '/' characters are added after the ':' by the OS
    it('URI == safe-<app id>:///<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-([^:]*):?/g, 'safe-$1:///');
      return fromAuthUri(appInfo, uri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true());
    });

    it('fail with safe-<app info>://<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, '$&//$\'');
      return should(fromAuthUri(appInfo, uri, null, { log: false })).be.rejectedWith('Serialisation error');
    });

    it('fail with safe-<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, 'safe-');
      return should(fromAuthUri(appInfo, uri, null, { log: false })).be.rejectedWith('IPC error: InvalidMsg');
    });

    it('fail with safe:<auth info>', () => {
      const uri = h.authUris.registeredUri.replace(/^safe-[^:]*:?/g, 'safe:');
      return should(fromAuthUri(appInfo, uri, null, { log: false })).be.rejectedWith('Serialisation error');
    });
  });
});

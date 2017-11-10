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

    it.skip('should connect with authorised shared MD', () => fromAuthURI(appInfo, h.authUris.sharedMdataUri, null, { log: false })
        .then((app) => should(app.auth.registered).be.true())
    );
  });
});

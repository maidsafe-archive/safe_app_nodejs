const lib = require('../src/native/lib');
const should = require('should');
const fromAuthURI = require('../src').fromAuthURI;

const appInfo = {
  id: 'net.maidsafe.example.tests',
  name: 'Example Test',
  vendor: 'MaidSafe Ltd.'
};

const registeredAppUri = 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1krxhhbxbszq:AQAAAOIDI_gAAAAAAAAAACAAAAAAAAAAGWzDHH2GG-TUtS_qLvytHNXrAPWGtI6QLDuoP28EE_0gAAAAAAAAALPyoRvbtvPKs9bWYgsQvT3strDfQsw4HXRzNW_cfmxTIAAAAAAAAAD_a6ysxSGIUWz9pOLlq9hRMM-EJQctDpVkhRTXPar-W0AAAAAAAAAA-O8HsVV5ZZbiAwWTTFXQeNX7pSYtLmZXRHnrdVyXZvv_a6ysxSGIUWz9pOLlq9hRMM-EJQctDpVkhRTXPar-WyAAAAAAAAAAUnTeCf39C-KDfioarbgDedqYhu_ZEpCHK_CatkiYNFUgAAAAAAAAAOTkFE7GibxaH0egTV1NtczggZkyAsCVRY6AcbceiSNfAAAAAAAAAAAAAAAAAAAAAAAAAAAAMCralz2EJh0ML2wMZLBhh0hELI1dIQUlVtaWHqIClqmYOgAAAAAAABgAAAAAAAAA2lo16ByCIq4SnojMIRPV_RSvQIOelGUD';

const unregisteredAppUri = 'safe-dW5yZWdpc3RlcmVk:AQAAAHDL4SwCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

describe('Smoke testing', () => {
  it('confirms there is a lib', () => {
    should(lib).be.Object();
  });
});

describe('External API', () => {
  describe('fromAuthURI', () => {
    it('should authenticate', () => fromAuthURI(appInfo, registeredAppUri)
        .then((app) => should(app.auth.registered).be.true())
    );

    it('should refresh containers permissions', () => fromAuthURI(appInfo, registeredAppUri)
        .then((app) => should(app.auth.refreshContainersPermissions()).be.fulfilled())
    );

    it('should connect unregistered', () => fromAuthURI(appInfo, unregisteredAppUri)
        .then((app) => should(app.auth.registered).not.be.true())
    );
  });
});

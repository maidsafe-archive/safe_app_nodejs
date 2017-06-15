const lib = require('../src/native/lib');
const should = require('should');
const fromAuthURI = require('../src').fromAuthURI;

describe('Smoke testing', () => {
  it('confirms there is a lib', () => {
    should(lib).be.Object();
  });
});

describe('External API', () => {
  describe('fromAuthURI', () => {
    it('should authenticate', () => {
      const uri = 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1krxhhbxbszq:AQAAAOIDI_gAAAAAAAAAACAAAAAAAAAAGWzDHH2GG-TUtS_qLvytHNXrAPWGtI6QLDuoP28EE_0gAAAAAAAAALPyoRvbtvPKs9bWYgsQvT3strDfQsw4HXRzNW_cfmxTIAAAAAAAAAD_a6ysxSGIUWz9pOLlq9hRMM-EJQctDpVkhRTXPar-W0AAAAAAAAAA-O8HsVV5ZZbiAwWTTFXQeNX7pSYtLmZXRHnrdVyXZvv_a6ysxSGIUWz9pOLlq9hRMM-EJQctDpVkhRTXPar-WyAAAAAAAAAAUnTeCf39C-KDfioarbgDedqYhu_ZEpCHK_CatkiYNFUgAAAAAAAAAOTkFE7GibxaH0egTV1NtczggZkyAsCVRY6AcbceiSNfAAAAAAAAAAAAAAAAAAAAAAAAAAAAMCralz2EJh0ML2wMZLBhh0hELI1dIQUlVtaWHqIClqmYOgAAAAAAABgAAAAAAAAA2lo16ByCIq4SnojMIRPV_RSvQIOelGUD';
      const appInfo = {
        id: 'net.maidsafe.example.tests',
        name: 'Example Test',
        vendor: 'MaidSafe Ltd.'
      };

      return fromAuthURI(appInfo, uri)
        .then((app) => should(app.auth.registered).be.true());
    });

    it('should connect unregistered', () => {
      const uri = 'safe-dW5yZWdpc3RlcmVk:AQAAAHDL4SwCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
      const appInfo = {
        id: 'net.maidsafe.example.tests',
        name: 'Example Test',
        vendor: 'MaidSafe Ltd.'
      };

      return fromAuthURI(appInfo, uri)
        .then((app) => should(app.auth.registered).not.be.true());
    });
  });
});

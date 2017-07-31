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
      const uri = 'safe-bmV0Lm1haWRzYWZlLmV4YW1wbGVzLm1haWx0dXRvcmlhbA==:AQAAAAy5QnMAAAAAAAAAACAAAAAAAAAAtNUKnigizGVMUBfDuPaABgq9xjn0-M0ZWrI2dl6vJBQgAAAAAAAAAI9uaYQQa9u4fclEQShcyMOVHEeltzKt5bLKwZY3vq1kIAAAAAAAAAAI0mYsFA2dh5gelvU9RlSigfUAnLosYODMwZXfpfk5GkAAAAAAAAAAqeKxG83eu8vmj5_spBTufyRTKzE5lGylukJRlv4JqnoI0mYsFA2dh5gelvU9RlSigfUAnLosYODMwZXfpfk5GiAAAAAAAAAAeHkZBLu5AxuzknojKjz20zIxWodCJ0YRAiqaRL12QmEgAAAAAAAAAE_9T1Dv9e4lJeYda4tvpu-iE_t9hytzu3MwLybcdJCICgAAAAAAAAASAAAAAAAAADQ2LjEwMS41Ni4xMjk6NTQ4MxIAAAAAAAAANDYuMTAxLjYzLjE0MDo1NDgzEQAAAAAAAAA0Ni4xMDEuOTIuODU6NTQ4MxMAAAAAAAAAMTM5LjU5LjE2NS4xMzE6NTQ4MxEAAAAAAAAAMTM5LjU5LjE3My41OjU0ODMSAAAAAAAAADEzOS41OS4xNzMuMTg6NTQ4MxMAAAAAAAAAMTM5LjU5LjE3My4xNjA6NTQ4MxMAAAAAAAAAMTM5LjU5LjE3My4xODg6NTQ4MxMAAAAAAAAAMTM5LjU5LjE3My4xOTE6NTQ4MxMAAAAAAAAAMTM5LjU5LjE3My4xOTg6NTQ4MwAAAAAAAAEPAAAAAAAAAHRlc3RfcmF0ZV9saW1pdKuJ5Wn6YaHSAOLkGwG5IOQ4VX1pvM0fayPfVmsQMamrmDoAAAAAAAAYAAAAAAAAAEauAuxGlRZm_k3oKKyg1RczYlE6tXPywQ==';
      const appInfo = {
        id: 'net.maidsafe.example.tests',
        name: 'Example Test',
        vendor: 'MaidSafe Ltd.'
      };

      return fromAuthURI(appInfo, uri)
        .then((app) => should(app.auth.registered).be.true());
    });

    it('should connect unregistered', () => {
      const uri = 'safe-dW5yZWdpc3RlcmVk:AQAAAJ7Hf3ICAAAAAAAAAAoAAAAAAAAAEgAAAAAAAAA0Ni4xMDEuNTYuMTI5OjU0ODMSAAAAAAAAADQ2LjEwMS42My4xNDA6NTQ4MxEAAAAAAAAANDYuMTAxLjkyLjg1OjU0ODMTAAAAAAAAADEzOS41OS4xNjUuMTMxOjU0ODMRAAAAAAAAADEzOS41OS4xNzMuNTo1NDgzEgAAAAAAAAAxMzkuNTkuMTczLjE4OjU0ODMTAAAAAAAAADEzOS41OS4xNzMuMTYwOjU0ODMTAAAAAAAAADEzOS41OS4xNzMuMTg4OjU0ODMTAAAAAAAAADEzOS41OS4xNzMuMTkxOjU0ODMTAAAAAAAAADEzOS41OS4xNzMuMTk4OjU0ODMAAAAAAAABDwAAAAAAAAB0ZXN0X3JhdGVfbGltaXQ=';
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

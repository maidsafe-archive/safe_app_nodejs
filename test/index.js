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
      const uri = 'safe-bmV0Lm1haWRzYWZlLmV4YW1wbGVzLm5vZGUtanMtdGVzdC1hcHA=:AAAAAWqJQyQAAAAAAAAAAAAAAAAAAAAgKf93dpDDH83rbPEHdv-yVOdp-5cg4e21sIQLStzgV1sAAAAAAAAAIPA9UirtY4gZnQACwRZubU5IXREkGWUHx4TlJnt6JxCCAAAAAAAAACCA-JC8S3piz2gh04Lf0bMtLKtiFuTcU5vyeI-QObssewAAAAAAAABAu5DnQCn6lFnPr_npQf6T_hWIDhSLKc1aVxALaH4m5YCA-JC8S3piz2gh04Lf0bMtLKtiFuTcU5vyeI-QObssewAAAAAAAAAgA3LD4n881Xay-rjwxL_nZuMFHnyvP7Pp99mhCP5__R4AAAAAAAAAIDGkCvw0Jcpfk0u8Fg1Choe1k58uGgN_ml8GdV8dxkjpAAAAAAAAACDvfcNpfSM6tcigyaGPXjbYhmZBawfZiIZ7oJ60D2EktwAAAAAAADqYAAAAAAAAABhBwlUCCCr3XDBzI5KPdTkxtlYAVxU5Kpo=';
      const appInfo = {
        id: 'net.maidsafe.example.tests',
        name: 'Example Test',
        vendor: 'MaidSafe Ltd.'
      };

      return fromAuthURI(appInfo, uri);
    });
  });
});

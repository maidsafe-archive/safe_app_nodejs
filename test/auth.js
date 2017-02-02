const should = require('should');
const h = require('./helpers');
const fromAuthURI = require('../src/index').fromAuthURI;

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const containers = {
	'_public': ['Read']
}

describe('Access Container', () => {
  const app = createAuthenticatedTestApp('_test_scope');

  it('is authenticated for testing', () => {
    should(app.auth.registered).be.true();
  });

  it('has read access to `_test`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('_test').then((hasAccess) => {
        should(hasAccess).be.true();
      })));

  it('can\'t access to `__does_not_exist`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('__does_not_exist')
          .should.be.rejected()));

  it('read info of `_test`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.getAccessContainerInfo('_test').then((ctnr) => ctnr.getNameAndTag()).then((resp) => {
        should(resp.name).is.not.undefined();
        should(resp.tag).equal(15000);
      })));

  it('decode IPC msg of auth', () => app.auth.genAuthUri(containers).then((resp) => {
      let uri = 'safe-bmV0Lm1haWRzYWZlLmV4YW1wbGVzLm5vZGUtanMtdGVzdC1hcHA=:AAAAAWqJQyQAAAAAAAAAAAAAAAAAAAAgKf93dpDDH83rbPEHdv-yVOdp-5cg4e21sIQLStzgV1sAAAAAAAAAIPA9UirtY4gZnQACwRZubU5IXREkGWUHx4TlJnt6JxCCAAAAAAAAACCA-JC8S3piz2gh04Lf0bMtLKtiFuTcU5vyeI-QObssewAAAAAAAABAu5DnQCn6lFnPr_npQf6T_hWIDhSLKc1aVxALaH4m5YCA-JC8S3piz2gh04Lf0bMtLKtiFuTcU5vyeI-QObssewAAAAAAAAAgA3LD4n881Xay-rjwxL_nZuMFHnyvP7Pp99mhCP5__R4AAAAAAAAAIDGkCvw0Jcpfk0u8Fg1Choe1k58uGgN_ml8GdV8dxkjpAAAAAAAAACDvfcNpfSM6tcigyaGPXjbYhmZBawfZiIZ7oJ60D2EktwAAAAAAADqYAAAAAAAAABhBwlUCCCr3XDBzI5KPdTkxtlYAVxU5Kpo=';
//      let uri = resp.uri;

/*    app.decode_ipc_msg(uri)
        .then((resp) => {
          should(resp.length).equal(2);
          should(resp[0]).equal('granted');
          let authGranted = resp[1].deref();
          console.log("AuthGranted:", authGranted, authGranted.access_container.tag);
          should(authGranted.access_container.tag).equal(15000);
        }, (err) => {
          console.error(err)
        }) */

      fromAuthURI(app.appInfo, uri).then((res) => {
        console.log("OK", res)
      }, (err) => {
        console.error(err)
      })

    }));

});

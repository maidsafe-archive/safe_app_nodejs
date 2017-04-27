const should = require('should');
const h = require('./helpers');
const l = require('../src/native/lib');

describe('Crypto Smoke Test', () => {

  it("properly sha3 hashes strings", () => {
    return l.sha3_hash("test").then((resp) => {
      should(resp.toString())
        .equal(Buffer("36f028580bb02cc8272a9a020f4200e346e276ae664e45ee80745574e2f5ab80", 'hex').toString());
    })
  });

  it("properly sha3 hashes buffers", () => {
    return l.sha3_hash(new Buffer("test a different value in a buffer")).then((resp) => {
      should(resp.toString())
        .equal(Buffer("bc262d37858c674b3a8950bed94f642f6e52b32fe7ac5725f287cb311d9d9d27", 'hex').toString());
    })
  });
});


describe('App Crypto Tests', () => {

  let app = h.createAuthenticatedTestApp();

  it("can get sign key", () => {
    return app.crypto.getAppPubSignKey().then(key => {
      should(key).not.be.undefined()
      return key.getRaw().then( (raw) => {
        should(raw).not.be.undefined()
      })
    })
  });

  it("can get public key", () => {
    return app.crypto.getAppPubEncKey().then(key => {
      should(key).not.be.undefined()
      return key.getRaw().then( (raw) => {
        should(raw).not.be.undefined()
      })
    })
  });

});
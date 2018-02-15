const should = require('should');
const h = require('./helpers');
const l = require('../src/native/lib');
const errConst = require('../src/error_const');

describe('Crypto Smoke Test', () => {
  it('properly sha3 hashes strings', () => l.sha3_hash('test').then((resp) => {
    should(resp.toString())
        .equal(Buffer('36f028580bb02cc8272a9a020f4200e346e276ae664e45ee80745574e2f5ab80', 'hex').toString());
  }));

  it('properly sha3 hashes buffers', () => l.sha3_hash(new Buffer('test a different value in a buffer')).then((resp) => {
    should(resp.toString())
        .equal(Buffer('bc262d37858c674b3a8950bed94f642f6e52b32fe7ac5725f287cb311d9d9d27', 'hex').toString());
  }));
});


describe('App Crypto Tests', () => {
  let app;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
  });

  it('can hash nicely', () => app.crypto.sha3Hash('testing input').then((resp) =>
    should(resp.toString())
        .equal(Buffer('97bc11468af46662f6df912b8d47edb7652e5209062c1588046bccfc7ac2dd7d', 'hex').toString())
  ));

  it('can hash nicely unauthorised', () => h.createTestApp().crypto.sha3Hash('testing input').then((resp) =>
    should(resp.toString())
        .equal(Buffer('97bc11468af46662f6df912b8d47edb7652e5209062c1588046bccfc7ac2dd7d', 'hex').toString())
  ));

  it('can get app public sign key', () => app.crypto.getAppPubSignKey().then((key) => {
    should(key).not.be.undefined();
    return key.getRaw().then((raw) => should(raw).not.be.undefined());
  }));

  it('can get app public encryption key', () => app.crypto.getAppPubEncKey().then((key) => {
    should(key).not.be.undefined();
    return key.getRaw().then((raw) => should(raw).not.be.undefined());
  }));

  it('generate nonce', () => app.crypto.generateNonce().then((nonce) => {
    should(nonce).not.be.undefined();
    should(nonce.length).be.equal(24);
  }));
});

describe('Encryption keys', () => {
  describe('custom encryption key pair', () => {
    let encKeyPair;
    let app;

    before(async () => {
      app = await h.createAuthenticatedTestApp();
    });

    beforeEach(() => app.crypto.generateEncKeyPair()
          .then((kp) => {
            encKeyPair = kp;
            should(encKeyPair).not.be.undefined();
          }));

    it('generation creates appropriate keys', () => Promise.all([
      encKeyPair.pubEncKey.getRaw().then((r) => {
        should(r).not.be.undefined();
        return r;
      }),
      encKeyPair.secEncKey.getRaw().then((r) => {
        should(r).not.be.undefined();
        return r;
      })
    ]).then((r) => should(r[0]).not.equal(r[1])));

    it('get keys from raw', () => Promise.all([
      encKeyPair.pubEncKey.getRaw()
        .then((r) => app.crypto.pubEncKeyFromRaw(r))
        .then((pk) => {
          should(pk).not.be.undefined();
          return pk;
        }),
      encKeyPair.secEncKey.getRaw()
        .then((r) => app.crypto.secEncKeyFromRaw(r))
        .then((sk) => {
          should(sk).not.be.undefined();
          return sk;
        })
    ]).then((r) => should(r[0]).not.equal(r[1])));

    it('generate key pair from raw keys', () => {
      let rawPubKey;
      let rawPubKeyFromRaw;
      let rawSecKey;
      return encKeyPair.pubEncKey.getRaw()
        .then((r) => { rawPubKey = r; })
        .then(() => encKeyPair.secEncKey.getRaw())
        .then((r) => { rawSecKey = r; })
        .then(() => app.crypto.generateEncKeyPairFromRaw(rawPubKey, rawSecKey))
        .then((kp) => kp.pubEncKey.getRaw()
          .then((r) => { rawPubKeyFromRaw = r; })
          .then(() => kp.secEncKey.getRaw())
          .then((rawSecKeyFromRaw) => {
            should(rawSecKeyFromRaw.toString()).be.equal(rawSecKey.toString());
            should(rawPubKeyFromRaw.toString()).be.equal(rawPubKey.toString());
          }));
    });
  });

  describe('two app encryption', () => {
    let me;
    let other;
    let myKeys;
    let myHandleOnTheirPubKey;
    let theirKeys;
    let theirHandleOnMyPubKey;

    before(function () {
      this.timeout(10000);
      return h.createAuthenticatedTestApp()
        .then((app) => {
          me = app;
          return h.createAuthenticatedTestApp();
        })
        .then((app) => {
          other = app;
          return me.crypto.generateEncKeyPair();
        })
        .then((kp) => {
          myKeys = kp;
          should(myKeys).not.be.undefined();
          return other.crypto.generateEncKeyPair();
        })
        .then((kp) => {
          theirKeys = kp;
          should(theirKeys).not.be.undefined();
          return myKeys.pubEncKey.getRaw();
        })
        .then((r) => other.crypto.pubEncKeyFromRaw(r))
        .then((w) => {
          theirHandleOnMyPubKey = w;
          should(theirHandleOnMyPubKey).not.be.undefined();
          return theirKeys.pubEncKey.getRaw();
        })
        .then((r) => me.crypto.pubEncKeyFromRaw(r))
        .then((w) => {
          myHandleOnTheirPubKey = w;
          should(myHandleOnTheirPubKey).not.be.undefined();
        });
    });

    it('encrypts and decrypts', () => {
      const plaintext = `all the ${Math.random()} places where I've been`;
      return myHandleOnTheirPubKey.encrypt(plaintext, myKeys.secEncKey)
        .then((cipher) => {
          should(cipher.toString()).not.equal(plaintext);
          return theirKeys.secEncKey.decrypt(cipher, theirHandleOnMyPubKey)
            .then((raw) => {
              should(plaintext).equal(raw.toString());
            });
        });
    });

    it('throws error on decrypt if public enc key not provided', () => {
      const plaintext = `all the ${Math.random()} places where I've been`;
      return myHandleOnTheirPubKey.encrypt(plaintext, myKeys.secEncKey)
        .then((cipher) => {
          should(cipher.toString()).not.equal(plaintext);
          const test = () => theirKeys.secEncKey.decrypt(cipher);
          should(test).throw(errConst.MISSING_PUB_ENC_KEY.msg);
        });
    });

    it('throws error if secret enc key not provided for encryption', () => {
      const plaintext = `all the ${Math.random()} places where I've been`;
      const test = () => myHandleOnTheirPubKey.encrypt(plaintext);
      should(test).throw(errConst.MISSING_SEC_ENC_KEY.msg);
    });

    it('encrypts and decrypts with seal', () => {
      const plaintext = `all the ${Math.random()} places where I've been`;
      return myHandleOnTheirPubKey.encryptSealed(plaintext)
        .then((cipher) => {
          should(cipher.toString()).not.equal(plaintext);
          return theirKeys.decryptSealed(cipher)
            .then((raw) => {
              should(plaintext).equal(raw.toString());
            });
        });
    });

    it('throws error if decryptSealed not provided with cipher', () => {
      const plaintext = `all the ${Math.random()} places where I've been`;
      return myHandleOnTheirPubKey.encryptSealed(plaintext)
        .then((cipher) => {
          should(cipher.toString()).not.equal(plaintext);
          const test = theirKeys.decryptSealed();
          should(test).be.rejectedWith('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object');
        });
    });
  });
});

describe('Sign keys', () => {
  describe('custom sign key pair', () => {
    let app;
    let signKeyPair;

    before(async () => {
      app = await h.createAuthenticatedTestApp();
    });

    beforeEach(() => app.crypto.generateSignKeyPair()
          .then((kp) => {
            signKeyPair = kp;
            should(signKeyPair).not.be.undefined();
          }));

    it('generation creates appropriate keys', () => Promise.all([
      signKeyPair.pubSignKey.getRaw().then((r) => {
        should(r).not.be.undefined();
        return r;
      }),
      signKeyPair.secSignKey.getRaw().then((r) => {
        should(r).not.be.undefined();
        return r;
      })
    ]).then((r) => should(r[0]).not.equal(r[1])));

    it('get keys from raw', () => Promise.all([
      signKeyPair.pubSignKey.getRaw()
        .then((r) => app.crypto.pubSignKeyFromRaw(r))
        .then((pk) => {
          should(pk).not.be.undefined();
          return pk;
        }),
      signKeyPair.secSignKey.getRaw()
        .then((r) => app.crypto.secSignKeyFromRaw(r))
        .then((sk) => {
          should(sk).not.be.undefined();
          return sk;
        })
    ]).then((r) => should(r[0]).not.equal(r[1])));

    it('generate key pair from raw keys', () => {
      let rawPubKey;
      let rawPubKeyFromRaw;
      let rawSecKey;
      return signKeyPair.pubSignKey.getRaw()
        .then((r) => { rawPubKey = r; })
        .then(() => signKeyPair.secSignKey.getRaw())
        .then((r) => { rawSecKey = r; })
        .then(() => app.crypto.generateSignKeyPairFromRaw(rawPubKey, rawSecKey))
        .then((kp) => kp.pubSignKey.getRaw()
          .then((r) => { rawPubKeyFromRaw = r; })
          .then(() => kp.secSignKey.getRaw())
          .then((rawSecKeyFromRaw) => {
            should(rawSecKeyFromRaw.toString()).be.equal(rawSecKey.toString());
            should(rawPubKeyFromRaw.toString()).be.equal(rawPubKey.toString());
          }));
    });
  });

  describe('signing messages between two apps', () => {
    let me;
    let other;
    let myKeys;
    let theirHandleOnMyPubKey;

    before(function () {
      this.timeout(10000);
      return h.createAuthenticatedTestApp()
        .then((app) => {
          me = app;
          return h.createAuthenticatedTestApp();
        })
        .then((app) => {
          other = app;
          return me.crypto.generateSignKeyPair();
        })
        .then((kp) => {
          myKeys = kp;
          should(myKeys).not.be.undefined();
        })
        .then(() => myKeys.pubSignKey.getRaw())
        .then((r) => other.crypto.pubSignKeyFromRaw(r)
          .then((w) => {
            theirHandleOnMyPubKey = w;
            should(theirHandleOnMyPubKey).not.be.undefined();
          })
        );
    });

    it('sign and verify', () => {
      const plaintext = `random ${Math.random()} plain text`;
      return myKeys.secSignKey.sign(plaintext)
        .then((signed) => {
          should(signed.toString()).not.equal(plaintext);
          return theirHandleOnMyPubKey.verify(signed)
            .then((raw) => should(plaintext).equal(raw.toString()));
        });
    });
  });
});

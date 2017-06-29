const should = require('should');
const h = require('./helpers');
const l = require('../src/native/lib');

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
  const app = h.createAuthenticatedTestApp();

  it('can hash nicely', () => app.crypto.sha3Hash('testing input').then((resp) => {
    should(resp.toString())
        .equal(Buffer('97bc11468af46662f6df912b8d47edb7652e5209062c1588046bccfc7ac2dd7d', 'hex').toString());
  }));

  it('can hash nicely unauthorised', () => h.createTestApp().crypto.sha3Hash('testing input').then((resp) => {
    should(resp.toString())
        .equal(Buffer('97bc11468af46662f6df912b8d47edb7652e5209062c1588046bccfc7ac2dd7d', 'hex').toString());
  }));

  it('can get sign key', () => app.crypto.getAppPubSignKey().then((key) => {
    should(key).not.be.undefined();
    return key.getRaw().then((raw) => {
      should(raw).not.be.undefined();
    });
  }));

  it('can get public key', () => app.crypto.getAppPubEncKey().then((key) => {
    should(key).not.be.undefined();
    return key.getRaw().then((raw) => {
      should(raw).not.be.undefined();
    });
  }));

  it('generate nonce', () => app.crypto.generateNonce().then((nonce) => {
    should(nonce).not.be.undefined();
    should(nonce.length).be.equal(24);
  }));

  describe('custom key pair', () => {
    let keyPair;

    beforeEach(() => app.crypto.generateEncKeyPair()
          .then((kp) => {
            keyPair = kp;
            should(keyPair).not.be.undefined();
          }));

    it('generation creates appropriate keys', () => Promise.all([
      keyPair.pubEncKey.getRaw().then((r) => {
        should(r).not.be.undefined();
        return r;
      }),
      keyPair.secEncKey.getRaw().then((r) => {
        should(r).not.be.undefined();
        return r;
      })
    ]).then((r) => should(r[0]).not.equal(r[1])));

    it('get keys from raw', () => Promise.all([
      keyPair.pubEncKey.getRaw()
        .then((r) => app.crypto.pubEncKeyKeyFromRaw(r))
        .then((pk) => {
          should(pk).not.be.undefined();
          return pk;
        }),
      keyPair.secEncKey.getRaw()
        .then((r) => app.crypto.secEncKeyKeyFromRaw(r))
        .then((sk) => {
          should(sk).not.be.undefined();
          return sk;
        })
    ]).then((r) => should(r[0]).not.equal(r[1])));

    it.skip('generate key pair from raw keys', () => {
      let rawPubKey;
      let rawPubKeyFromRaw;
      let rawSecKey;
      return keyPair.pubEncKey.getRaw()
        .then((r) => { rawPubKey = r; })
        .then(() => keyPair.secEncKey.getRaw())
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
    const me = app;
    const other = h.createAuthenticatedTestApp();

    let myKeys;
    let myHandleOnTheirPubKey;
    let theirKeys;
    let theirHandleOnMyPubKey;

    before(() => Promise.all([
      me.crypto.generateEncKeyPair()
            .then((kp) => {
              myKeys = kp;
              should(myKeys).not.be.undefined();
            }),

      other.crypto.generateEncKeyPair()
            .then((kp) => {
              theirKeys = kp;
              should(theirKeys).not.be.undefined();
            })])
      .then(() => Promise.all([
        myKeys.pubEncKey.getRaw()
            .then((r) => other.crypto.pubEncKeyKeyFromRaw(r)
              .then((w) => {
                theirHandleOnMyPubKey = w;
                should(theirHandleOnMyPubKey).not.be.undefined();
              })),

        theirKeys.pubEncKey.getRaw()
            .then((r) => me.crypto.pubEncKeyKeyFromRaw(r)
              .then((w) => {
                myHandleOnTheirPubKey = w;
                should(myHandleOnTheirPubKey).not.be.undefined();
              }))
      ]))
    );

    it('encrypts and decrypts', () => {
      const INPT = `all the ${Math.random()} times where I've been`;
      return myHandleOnTheirPubKey.encrypt(INPT, myKeys.secEncKey)
        .then((cipher) => {
          should(cipher.toString()).not.equal(INPT);
          return theirKeys.secEncKey.decrypt(cipher, theirHandleOnMyPubKey)
            .then((raw) => {
              should(INPT).equal(raw.toString());
            });
        });
    });

    it('encrypts and decrypts with seal', () => {
      const INPT = `all the ${Math.random()} times where I've been`;
      return myHandleOnTheirPubKey.encryptSealed(INPT)
        .then((cipher) => {
          should(cipher.toString()).not.equal(INPT);
          return theirKeys.decryptSealed(cipher)
            .then((raw) => {
              should(INPT).equal(raw.toString());
            });
        });
    });
  });
});

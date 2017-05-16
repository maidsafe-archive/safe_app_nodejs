const h = require('../helpers');
const lib = require('../native/lib');

/**
* Holds the reference to a Cipher Options,
* either PlainText, Symmetric or Asymmetric
**/
class CipherOpt extends h.NetworkObject {
  static free(app, ref) {
    lib.cipher_opt_free(app.connection, ref);
  }
}

/**
* Provide the Cipher Opt API
**/
class CipherOptInterface {

  constructor(app) {
    this.app = app;
  }

  /**
  * Create a PlainText Cipher Opt
  * @returns {CipherOpt}
  **/
  newPlainText() {
    return lib.cipher_opt_new_plaintext(this.app.connection)
          .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

  /**
  * Create a new Symmetric Cipher
  * @returns {CipherOpt}
  **/
  newSymmetric() {
    return lib.cipher_opt_new_symmetric(this.app.connection)
        .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

  /**
  * Create a new Asymmetric Cipher for the given key
  * @param {EncKey} key
  * @returns {CipherOpt}
  **/
  newAsymmetric(key) {
    return lib.cipher_opt_new_symmetric(this.app.connection, key.ref)
        .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

}
module.exports = CipherOptInterface;

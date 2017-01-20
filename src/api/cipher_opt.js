const h = require('../helpers');
const lib = require('../native/lib');

class CipherOpt extends h.NetworkObject {
  static free(app, ref) {
    // FIXME: doesn't exist in FFI/rust at the moment
    lib.cipher_opt_free(app.connection, ref);
  }
}

class CipherOptProvider {
  constructor(app) {
    this.app = app;
  }
  newPlainText() {
    return lib.cipher_opt_new_plaintext(this.app.connection)
          .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

  newSymmetric() {
    // -> CipherOpt
    return lib.cipher_opt_new_symmetric(this.app.connection)
        .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

  newAsymmetric(otherKey) {
    // -> CipherOpt
    return lib.cipher_opt_new_symmetric(this.app.connection, encryptKeyHandle)
        .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

}
module.exports = CipherOptProvider;

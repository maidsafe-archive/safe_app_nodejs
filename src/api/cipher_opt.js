const helpers = require('../helpers');
const lib = require('../native/lib');

class CipherOpt extends helpers.NetworkObject {
  static _clean(app, ref) {
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
          .then((c) => new CipherOpt(this.app, c));
  }

  newSymmetric() {
    // -> CipherOpt
    return Promise.reject(new Error('Not Implemented'));
  }

  newAsymmetric(otherKey) {
    // -> CipherOpt
    return Promise.reject(new Error('Not Implemented'));
  }

}
module.exports = CipherOptProvider;

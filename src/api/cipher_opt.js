// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under 
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or 
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms. 
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const h = require('../helpers');
const lib = require('../native/lib');
const errConst = require('../error_const');
const makeError = require('../native/_error.js');

/**
* Holds the reference to a Cipher Options,
* either PlainText, Symmetric or Asymmetric
*/
class CipherOpt extends h.NetworkObject {
  static free(app, ref) {
    lib.cipher_opt_free(app.connection, ref);
  }
}

/**
* Provide the Cipher Opt API
*/
class CipherOptInterface {

  constructor(app) {
    this.app = app;
  }

  /**
  * Create a PlainText Cipher Opt
  * @returns {CipherOpt}
  */
  newPlainText() {
    return lib.cipher_opt_new_plaintext(this.app.connection)
          .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

  /**
  * Create a new Symmetric Cipher
  * @returns {CipherOpt}
  */
  newSymmetric() {
    return lib.cipher_opt_new_symmetric(this.app.connection)
        .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

  /**
  * Create a new Asymmetric Cipher for the given public encryption key
  * @param {PubEncKey} pubEncKey
  * @returns {CipherOpt}
  */
  newAsymmetric(pubEncKey) {
    if (!pubEncKey) {
      throw makeError(errConst.MISSING_PUB_ENC_KEY.code, errConst.MISSING_PUB_ENC_KEY.msg);
    }
    return lib.cipher_opt_new_asymmetric(this.app.connection, pubEncKey.ref)
        .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

}
module.exports = CipherOptInterface;

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

class CipherOpt extends h.NetworkObject {
  static free(app, ref) {
    lib.cipher_opt_free(app.connection, ref);
  }
}

/**
* Provides encryption methods for committing {@link ImmutableData}
*/
class CipherOptInterface {
  /**
   * @hideconstructor
   */
  constructor(app) {
    this.app = app;
  }

  /**
  * Create a plaintext cipher
  * @returns {Promises<CipherOpt>}
  * @example
  * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
  * const asyncFn = async () => {
  *     const cipherOpt = await app.cipherOpt.newPlainText();
  *     const immdWriter = await app.immutableData.create();
  *     await idWriter.write('<public file buffer data>');
  *     const idAddress = await idWriter.close(cipherOpt);
  * };
  */
  newPlainText() {
    return lib.cipher_opt_new_plaintext(this.app.connection)
      .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }

  /**
  * Create a new symmetric cipher
  * @returns {Promises<CipherOpt>}
  * @example
  * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
  * const asyncFn = async () => {
  *     const cipherOpt = await app.cipherOpt.newSymmetric();
  *     const immdWriter = await app.immutableData.create();
  *     await idWriter.write('Data for my eyes only.');
  *     const idAddress = await idWriter.close(cipherOpt);
  * };
  */
  newSymmetric() {
    return lib.cipher_opt_new_symmetric(this.app.connection)
      .then((c) => h.autoref(new CipherOpt(this.app, c)));
  }
  /**
  * Create a new asymmetric cipher for the given public encryption key
  * @param {PubEncKey} pubEncKey
  * @throws {MISSING_PUB_ENC_KEY}
  * @returns {Promises<CipherOpt>}
  * @example
  * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
  * const asyncFn = async () => {
  *     // For this example you're encrypting data with our own public encryption key,
  *     // which only you will be able to deciper, however,
  *     // the use case is for encrypting with the intended recipient's public encryption key.
  *     const pubEncKey = await app.crypto.getAppPubEncKey();
  *     const cipherOpt = await app.cipherOpt.newAsymmetric(pubEncKey);
  *     const immdWriter = await app.immutableData.create();
  *     const data = 'Data only decipherable by the holder of the private encryption key
  *     which is paired to the public encryption key supplied to asymmetric cipher.';
  *     await idWriter.write(data);
  *     const idAddress = await idWriter.close(cipherOpt);
  * };
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

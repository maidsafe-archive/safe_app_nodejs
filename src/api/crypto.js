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


const lib = require('../native/lib');
const h = require('../helpers');
const errConst = require('../error_const');
const makeError = require('../native/_error.js');

/**
 * Holds the public part of an encryption key pair
 * @hideconstructor
 */
class PubEncKey extends h.NetworkObject {

  /**
   * Generate raw buffer of public encryption key
   * @returns {Promise<Buffer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const encKeyPair = await app.crypto.generateEncKeyPair();
   *     const pubEncKey = encKeyPair.pubEncKey;
   *     const rawPubEncKey = await pubEncKey.getRaw();
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  getRaw() {
    return lib.enc_pub_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  */
  static free(app, ref) {
    return lib.enc_pub_key_free(app.connection, ref);
  }

  /**
   * Encrypt the input using recipient's public key. Only recipient will be able to decrypt data. Read more about [sealed boxes]{@link https://libsodium.gitbook.io/doc/public-key_cryptography/sealed_boxes}.
   * @param {String|Buffer} data
   * @returns {Promise<Buffer>} Encrypted data
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const stringOrBuffer = 'plain string to be encrypted';
   *     try {
   *       const rawPubEncKey = Buffer.from(<recipient's public encryption key>);
   *       const pubEncKey = await app.crypto.pubEncKeyFromRaw(rawPubEncKey.buffer);
   *       const encryptedData = await pubEncKey.encryptSealed(data);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  encryptSealed(data) {
    return lib.encrypt_sealed_box(this.app.connection, data, this.ref);
  }

  /**
   * Decrypt the given cipher text using the sender's public encryption key and the recipient's secret encryption key. Read more about [authenticated encryption]{@link https://libsodium.gitbook.io/doc/public-key_cryptography/authenticated_encryption}.
   *
   * @arg {Buffer} cipher Encrypted data
   * @arg {SecEncKey} secretEncKey Recipient's secret encryption key
   * @returns {Promise<Buffer>} Decrypted data
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const cipher = 'plain text to be encrypted';
   *     try {
   *       const encKeyPair = await app.crypto.generateEncKeyPair();
   *       const rawPubEncKey = Buffer.from(<sender's public encryption key>);
   *       const pubEncKey = await app.crypto.pubEncKeyFromRaw(rawPubEncKey.buffer);
   *       const secretEncKey = encKeyPair.secEncKey;
   *       const decryptedData = await pubEncKey.decrypt(cipher, secretEncKey)
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  decrypt(cipher, secretEncKey) {
    return lib.decrypt(this.app.connection, cipher, this.ref, secretEncKey.ref);
  }

  /**
   * Encrypt the input using recipient's public encryption key and sender's secret encryption key, such that each party can generate a shared secret key to verify the integrity of ciphers and to also decrypt them. Read more about [authenticated encryption]{@link https://libsodium.gitbook.io/doc/public-key_cryptography/authenticated_encryption}.
   *
   * @param {Buffer|String} data
   * @param {SecEncKey} secretEncKey Sender's secret encryption key
   * @throws {MISSING_SEC_ENC_KEY}
   * @returns {Promise<Buffer>} Encrypted data
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const data = 'plain text to be encrypted';
   *     try {
   *       const encKeyPair = await app.crypto.generateEncKeyPair();
   *       const rawPubEncKey = Buffer.from(<recipient's public encryption key>);
   *       const pubEncKey = await app.crypto.pubEncKeyFromRaw(rawPubEncKey.buffer);
   *       const secretEncKey = encKeyPair.secEncKey;
   *       const encryptedBuffer = await pubEncKey.encrypt(data, secretEncKey)
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  encrypt(data, secretEncKey) {
    if (!secretEncKey) {
      throw makeError(errConst.MISSING_SEC_ENC_KEY.code, errConst.MISSING_SEC_ENC_KEY.msg(32));
    }
    return lib.encrypt(this.app.connection, data, this.ref, secretEncKey.ref);
  }
}


/**
* Holds the secret part of an encryption key
* @hideconstructor
*/
class SecEncKey extends h.NetworkObject {

  /**
   * Generate raw buffer of secret encryption key
   * @returns {Promise<Buffer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const encKeyPair = await app.crypto.generateEncKeyPair();
   *     const secEncKey = encKeyPair.secEncKey;
   *     const rawSecEncKey = await secEncKey.getRaw();
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  getRaw() {
    return lib.enc_secret_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  */
  static free(app, ref) {
    return lib.enc_secret_key_free(app.connection, ref);
  }

  /**
   * Decrypt the given encrypted data using the sender's public encryption key and the recipient's secret encryption key. Read more about [authenticated encryption]{@link https://libsodium.gitbook.io/doc/public-key_cryptography/authenticated_encryption}.
   *
   * An example use case for this method is if you have received messages from multiple
   * senders, you may fetch your secret key once, then iterate over the messages
   * passing each associated public encryption key to decrypt each message.
   *
   * @arg {Buffer} cipher Encrypted data
   * @arg {PubEncKey} publicEncKey Sender's public encryption key
   * @throws {MISSING_PUB_ENC_KEY}
   * @returns {Promise<Buffer>} Decrypted data
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const cipher = 'plain text to be encrypted';
   *     try {
   *       const encKeyPair = await app.crypto.generateEncKeyPair();
   *       const rawPubEncKey = Buffer.from(<sender's public encryption key>);
   *       const pubEncKey = await app.crypto.pubEncKeyFromRaw(rawPubEncKey.buffer);
   *       const secretEncKey = encKeyPair.secEncKey;
   *       const decryptedData = await pubEncKey.decrypt(cipher, secretEncKey)
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  decrypt(cipher, publicEncKey) {
    if (!publicEncKey) {
      throw makeError(errConst.MISSING_PUB_ENC_KEY.code, errConst.MISSING_PUB_ENC_KEY.msg);
    }
    return lib.decrypt(this.app.connection, cipher, publicEncKey.ref, this.ref);
  }

  /**
   * Encrypt the input using recipient's public encryption key and sender's secret encryption key, such that each party can generate a shared secret key to verify the integrity of ciphers and to also decrypt them. Read more about [authenticated encryption]{@link https://libsodium.gitbook.io/doc/public-key_cryptography/authenticated_encryption}.
   *
   * @param {Buffer|String} data
   * @param {PubEncKey} recipientPubKey Recipient's public encryption key
   * @returns {Promise<Buffer>} Encrypted data
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const data = 'plain text to be encrypted';
   *     try {
   *       const encKeyPair = await app.crypto.generateEncKeyPair();
   *       const rawPubEncKey = Buffer.from(<recipient's public encryption key>);
   *       const recipientPubKey = await app.crypto.pubEncKeyFromRaw(rawPubEncKey.buffer);
   *       const secEncKey = encKeyPair.secEncKey;
   *       const encryptedBuffer = await secEncKey.encrypt(data, recipientPubKey)
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  encrypt(data, recipientPubKey) {
    return lib.encrypt(this.app.connection, data, recipientPubKey.ref, this.ref);
  }
}


/**
* Asymmetric encryption keypair
*/
class EncKeyPair {

  /**
  * @hideconstructor
  */
  constructor(app, pub, secret) {
    this.app = app;
    this._public = pub;
    this._secret = secret;
  }


  /**
   * Get the public encryption key instance of this keypair
   * @returns {PubEncKey}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const encKeyPair = await app.crypto.generateEncKeyPair();
   *     const pubEncKey = encKeyPair.pubEncKey;
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  get pubEncKey() {
    return this._public;
  }


  /**
   * Get the secret encryption key instance of this keypair
   * @returns {secEncKey}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const encKeyPair = await app.crypto.generateEncKeyPair();
   *     const secEncKey = encKeyPair.secEncKey;
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  get secEncKey() {
    return this._secret;
  }

  /**
   * Decrypt the input using this generated encryption key pair. Only recipient will be able to decrypt data. Read more about [sealed boxes]{@link https://libsodium.gitbook.io/doc/public-key_cryptography/sealed_boxes}.
   * @param {String|Buffer} cipher Encrypted data
   * @returns {Promise<Buffer>} Decrypted data
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const cipher = <Encrypted data as sealed box>;
   *     try {
  *        const encKeyPair = await app.crypto.generateEncKeyPair();
   *       const decryptedData = await encKeyPair.decryptSealed(cipher);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  decryptSealed(cipher) {
    return lib.decrypt_sealed_box(this.app.connection, cipher,
                                  this.pubEncKey.ref, this.secEncKey.ref);
  }
}

/**
* Holds the public part of a sign key pair
* @hideconstructor
*/
class PubSignKey extends h.NetworkObject {

  /**
   * Generate raw buffer of public sign key.
   * @returns {Promise<Buffer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const signKeyPair = await app.crypto.generateSignKeyPair();
   *         const pubSignKey = signKeyPair.pubSignKey;
   *         const rawPubSignKey = await pubSignKey.getRaw();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getRaw() {
    return lib.sign_pub_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  */
  static free(app, ref) {
    return lib.sign_pub_key_free(app.connection, ref);
  }

  /**
   * Verify the given signed data using the public sign key
   * @param {Buffer} data Signed data to be verified
   * @returns {Promise<Buffer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *       const signKeyPair = await app.crypto.generateSignKeyPair();
   *       const pubSignKey = signKeyPair.pubSignKey;
   *       const verifiedData = await pubSignKey.verify(data);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  verify(data) {
    return lib.verify(this.app.connection, data, this.ref);
  }
}

/**
* Holds the secret part of a sign key pair
* @hideconstructor
*/
class SecSignKey extends h.NetworkObject {

  /**
   * Generate raw buffer of secret sign key
   * @returns {Promise<Buffer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const encKeyPair = await app.crypto.generateEncKeyPair();
   *     const secSignKey = encKeyPair.secSignKey;
   *     const rawSecSignKey = await secSignKey.getRaw();
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  getRaw() {
    return lib.sign_sec_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  */
  static free(app, ref) {
    return lib.sign_sec_key_free(app.connection, ref);
  }

  /**
   * Sign the given data (buffer or string) using the secret sign key
   * @param {Buffer} data to sign
   * @returns {Promise<Buffer>} signed data
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const data = 'Information to be signed';
   *     try {
   *       const encKeyPair = await app.crypto.generateEncKeyPair();
   *       const secSignKey = encKeyPair.secSignKey;
   *       const signedData = await secSignKey.sign(data);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  sign(data) {
    return lib.sign(this.app.connection, data, this.ref);
  }
}

/**
* Signing keypair
* @hideconstructor
*/
class SignKeyPair {

  constructor(app, pub, secret) {
    this.app = app;
    this._public = pub;
    this._secret = secret;
  }


  /**
   * get the public sign key instance of this key pair
   * @returns {PubSignKey}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const encKeyPair = await app.crypto.generateEncKeyPair();
   *     const pubSignKey = signKeyPair.pubSignKey;
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  get pubSignKey() {
    return this._public;
  }


  /**
   * get the secrect sign key instance of this key pair
   * @returns {SecSignKey}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const encKeyPair = await app.crypto.generateEncKeyPair();
   *     const secSignKey = await signKeyPair.secSignKey;
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  get secSignKey() {
    return this._secret;
  }
}

/**
 * Contains all cryptographic related functionality
 */
class CryptoInterface {

  /**
   * @hideconstructor
   */
  constructor(app) {
    this.app = app;
  }

  /**
   * Hash the given input with SHA3 Hash
   * @returns {Promise<Buffer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const hashedString = await app.crypto.sha3Hash('1010101010101')
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  sha3Hash(data) { // eslint-disable-line class-methods-use-this
    return lib.sha3_hash(data);
  }

  /**
   * Get current app's public signing key
   * @returns {Promise<PubSignKey>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const pubSignKey = await app.crypto.getAppPubSignKey();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getAppPubSignKey() {
    return lib.app_pub_sign_key(this.app.connection)
        .then((c) => h.autoref(new PubSignKey(this.app, c)));
  }

  /**
   * Get current app's public encryption key
   * @returns {Promise<PubEncKey>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const pubEncKey = await app.crypto.getAppPubEncKey();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getAppPubEncKey() {
    return lib.app_pub_enc_key(this.app.connection)
        .then((c) => h.autoref(new PubEncKey(this.app, c)));
  }

  /**
   * Generate a new asymmetric encryption key pair
   * @returns {Promise<EncKeyPair>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const encKeyPair = await app.crypto.generateEncKeyPair();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  generateEncKeyPair() {
    return lib.enc_generate_key_pair(this.app.connection)
        .then((r) => new EncKeyPair(this.app,
            h.autoref(new PubEncKey(this.app, r[0])),
            h.autoref(new SecEncKey(this.app, r[1]))
          ));
  }

  /**
   * Generate a new sign key pair
   * @returns {Promise<SignKeyPair>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const signKeyPair = await app.crypto.generateSignKeyPair();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  generateSignKeyPair() {
    return lib.sign_generate_key_pair(this.app.connection)
        .then((r) => new SignKeyPair(this.app,
            h.autoref(new PubSignKey(this.app, r[0])),
            h.autoref(new SecSignKey(this.app, r[1]))
          ));
  }

  /**
   * Generate asymmetric encryption key pair instance from raw keys
   * @returns {Promise<EncKeyPair>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         let encKeyPair = await app.crypto.generateEncKeyPair();
   *         const pubEncKey = encKeyPair.pubEncKey;
   *         const secEncKey = encKeyPair.secEncKey;
   *         const rawPubEncKey = await pubEncKey.getRaw();
   *         const rawSecEncKey = await secEncKey.getRaw();
   *         encKeyPair = await app.crypto.generateEncKeyPairFromRaw(
   *             rawPubEncKey.buffer,
   *             rawSecEncKey.buffer
   *         );
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  generateEncKeyPairFromRaw(rawPublicKey, rawSecretkey) {
    let pubKey;
    return this.pubEncKeyFromRaw(rawPublicKey)
        .then((pk) => { pubKey = pk; })
        .then(() => this.secEncKeyFromRaw(rawSecretkey))
        .then((sk) => new EncKeyPair(this.app, pubKey, sk));
  }

  /**
   * Generate sign key pair from raw keys
   * @returns {Promise<SignKeyPair>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         let signKeyPair = await app.crypto.generateSignKeyPair();
   *         const pubSignKey = signKeyPair.pubSignKey;
   *         const secSignKey = signKeyPair.secSignKey;
   *         const rawPubSignKey = await pubSignKey.getRaw();
   *         const rawSecSignKey = await secSignKey.getRaw();
   *         signKeyPair = await app.crypto.generateSignKeyPairFromRaw(
   *             rawPubSignKey.buffer,
   *             rawSecSignKey.buffer
   *         );
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  generateSignKeyPairFromRaw(rawPublicKey, rawSecretkey) {
    let pubKey;
    return this.pubSignKeyFromRaw(rawPublicKey)
        .then((pk) => { pubKey = pk; })
        .then(() => this.secSignKeyFromRaw(rawSecretkey))
        .then((sk) => new SignKeyPair(this.app, pubKey, sk));
  }

  /**
   * Generates a public sign key instance from a raw buffer
   * @param {Buffer} rawPubSignKey
   * @returns {Promise<PubSignKey>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const signKeyPair = await app.crypto.generateSignKeyPair();
   *         let pubSignKey = signKeyPair.pubSignKey;
   *         const rawPubSignKey = await pubSignKey.getRaw();
   *         pubSignKey = await app.crypto.pubSignKeyFromRaw(rawPubSignKey.buffer);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  pubSignKeyFromRaw(rawPubSignKey) {
    return lib.sign_pub_key_new(this.app.connection, rawPubSignKey)
        .then((c) => h.autoref(new PubSignKey(this.app, c)));
  }

  /**
   * Generates a secret sign key from a raw buffer
   * @param {Buffer} rawSecSignKey
   * @returns {Promise<SecSignKey>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const signKeyPair = await app.crypto.generateSignKeyPair();
   *         let secSignKey = signKeyPair.secSignKey;
   *         const rawSecSignKey = await secSignKey.getRaw();
   *         secSignKey = await app.crypto.secSignKeyFromRaw(rawSecSignKey.buffer);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  secSignKeyFromRaw(rawSecSignKey) {
    return lib.sign_sec_key_new(this.app.connection, rawSecSignKey)
        .then((c) => h.autoref(new SecSignKey(this.app, c)));
  }

  /**
   * Generates a public encryption key instance from raw buffer
   * @arg {Buffer} rawPubEncKey
   * @returns {Promise<PubEncKey>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const encKeyPair = await app.crypto.generateEncKeyPair();
   *         let pubEncKey = encKeyPair.pubEncKey;
   *         const rawPubEncKey = await pubEncKey.getRaw();
   *         pubEncKey = await app.crypto.pubEncKeyFromRaw(rawPubEncKey.buffer);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  pubEncKeyFromRaw(rawPubEncKey) {
    return lib.enc_pub_key_new(this.app.connection, rawPubEncKey)
        .then((c) => h.autoref(new PubEncKey(this.app, c)));
  }

  /**
   * Generates a secret encryption key instance from raw buffer
   * @arg {Buffer} raw secret encryption key raw bytes as string
   * @returns {Promise<SecEncKey>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const encKeyPair = await app.crypto.generateEncKeyPair();
   *         let secEncKey = encKeyPair.secEncKey;
   *         const rawSecEncKey = await secEncKey.getRaw();
   *         secEncKey = await app.crypto.secEncKeyFromRaw(rawSecEncKey.buffer);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  secEncKeyFromRaw(raw) {
    return lib.enc_secret_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new SecEncKey(this.app, c)));
  }

  /**
   * Generate a nonce that can be used when creating private {@link MutableData}
   * @returns {Promise<Nonce>} the nonce generated
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const nonce = await app.crypto.generateNonce();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  generateNonce() { // eslint-disable-line class-methods-use-this
    return lib.generate_nonce();
  }
}


module.exports = {
  PubEncKey,
  SecEncKey,
  EncKeyPair,
  PubSignKey,
  SecSignKey,
  SignKeyPair,
  CryptoInterface
};

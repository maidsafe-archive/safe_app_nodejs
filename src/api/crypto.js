// Copyright 2017 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under (1) the MaidSafe.net
// Commercial License, version 1.0 or later, or (2) The General Public License
// (GPL), version 3, depending on which licence you accepted on initial access
// to the Software (the "Licences").
//
// By contributing code to the SAFE Network Software, or to this project
// generally, you agree to be bound by the terms of the MaidSafe Contributor
// Agreement, version 1.0.
// This, along with the Licenses can be found in the root directory of this
// project at LICENSE, COPYING and CONTRIBUTOR.
//
// Unless required by applicable law or agreed to in writing, the SAFE Network
// Software distributed under the GPL Licence is distributed on an "AS IS"
// BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied.
//
// Please review the Licences for the specific language governing permissions
// and limitations relating to use of the SAFE Network Software.


const lib = require('../native/lib');
const h = require('../helpers');
const errConst = require('../error_const');
const makeError = require('../native/_error.js');

/**
* Holds the public part of an encryption key
*/
class PubEncKey extends h.NetworkObject {

  /**
  * generate raw string copy of public encryption key
  * @returns {Promise<Buffer>}
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
  * Encrypt the input (buffer or string) using the private and public key with a seal
  * @returns {Promise<Buffer>} Ciphertext
  */
  encryptSealed(str) {
    return lib.encrypt_sealed_box(this.app.connection, str, this.ref);
  }

  /**
  * Decrypt the given cipher text (buffer or string) using this public
  * encryption key and the given secret key
  *
  * @arg {Buffer} cipher to decrypt
  * @arg {SecEncKey} secretEncKey secret encryption key
  * @returns {Promise<Buffer>} plain text
  */
  decrypt(cipher, secretEncKey) {
    return lib.decrypt(this.app.connection, cipher, this.ref, secretEncKey.ref);
  }

  /**
  * Encrypt the input (buffer or string) using this public encryption key
  * and the given secret key.
  *
  * @param {Buffer} data to be encrypted
  * @param {SecEncKey} secretEncKey secret encrpytion key
  * @returns {Promise<Buffer>} cipher text
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
*/
class SecEncKey extends h.NetworkObject {

  /**
  * generate raw string copy of secret encryption key
  * @returns {Promise<Buffer>}
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
  * Decrypt the given cipher text (buffer or string) using this secret
  * encryption key and the given public key
  *
  * An example use case for this method is if you have received messages from multiple
  * senders, you may fetch your secret key once, then iterate over the messages along
  * with passing associated public encryption key to decrypt each message.
  *
  * @arg {Buffer} cipher to decrypt
  * @arg {PubEncKey} publicEncKey public encryption key
  * @returns {Promise<Buffer>} plain text
  */
  decrypt(cipher, publicEncKey) {
    if (!publicEncKey) {
      throw makeError(errConst.MISSING_PUB_ENC_KEY.code, errConst.MISSING_PUB_ENC_KEY.msg);
    }
    return lib.decrypt(this.app.connection, cipher, publicEncKey.ref, this.ref);
  }

  /**
  * Encrypt the input (buffer or string) using this secret encryption key
  * and the recipient's public key
  *
  * An example use case for this method is if you have multiple intended recipients.
  * You can fetch your secret key once, then use this method to iterate over
  * recipient public encryption keys, encrypting data for each key.
  *
  * @param {Buffer} data to be encrypted
  * @param {PubEncKey} recipientPubKey recipient's public encryption key
  * @returns {Promise<Buffer>} cipher text
  */
  encrypt(data, recipientPubKey) {
    return lib.encrypt(this.app.connection, data, recipientPubKey.ref, this.ref);
  }
}


/**
* Holds an asymmetric encryption keypair
*/
class EncKeyPair {

  constructor(app, pub, secret) {
    this.app = app;
    this._public = pub;
    this._secret = secret;
  }


  /**
  * get the Public Encryption key instance of this keypair
  * @returns {PubEncKey}
  */
  get pubEncKey() {
    return this._public;
  }


  /**
  * get the Secrect Encryption key instance of this keypair
  * @returns {secEncKey}
  */
  get secEncKey() {
    return this._secret;
  }

  /**
  * Decrypt the given cipher text with a seal (buffer or string) using
  * this encryption key pair
  * @returns {Promise<Buffer>} plain text
  */
  decryptSealed(cipher) {
    return lib.decrypt_sealed_box(this.app.connection, cipher,
                                  this.pubEncKey.ref, this.secEncKey.ref);
  }
}

/**
* Holds the public part of a sign key
*/
class PubSignKey extends h.NetworkObject {

  /**
  * generate raw string copy of public sign key
  * @returns {Promise<Buffer>}
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
  * Verify the given signed data (buffer or string) using the public sign key
  * @param {Buffer} data to verify signature
  * @returns {Promise<Buffer>}
  */
  verify(data) {
    return lib.verify(this.app.connection, data, this.ref);
  }
}

/**
* Holds the secret part of a sign key
*/
class SecSignKey extends h.NetworkObject {

  /**
  * generate raw string copy of secret sign key
  * @returns {Promise<Buffer>}
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
  */
  sign(data) {
    return lib.sign(this.app.connection, data, this.ref);
  }
}

/**
* Holds a sign key pair
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
  */
  get pubSignKey() {
    return this._public;
  }


  /**
  * get the secrect sign key instance of this key pair
  * @returns {SecSignKey}
  */
  get secSignKey() {
    return this._secret;
  }
}

/**
* Encryption functionality for the app
*
* Access it through your {SAFEApp} instance under `app.crypto`
*/
class CryptoInterface {

  /**
  * @private
  * @param {SAFEApp} app
  */
  constructor(app) {
    this.app = app;
  }

  /**
  * Hash the given input with SHA3 Hash
  * @returns {Promise<Buffer>}
  */
  /* eslint-disable class-methods-use-this */
  sha3Hash(data) {
    return lib.sha3_hash(data);
  }

  /* eslint-enable class-methods-use-this */


  /**
  * Get the public signing key of this session
  * @returns {Promise<SignKey>}
  */
  getAppPubSignKey() {
    return lib.app_pub_sign_key(this.app.connection)
        .then((c) => h.autoref(new PubSignKey(this.app, c)));
  }

  /**
  * Get the public encryption key of this session
  * @returns {Promise<PubEncKey>}
  */
  getAppPubEncKey() {
    return lib.app_pub_enc_key(this.app.connection)
        .then((c) => h.autoref(new PubEncKey(this.app, c)));
  }

  /**
  * Generate a new Asymmetric Encryption Key Pair
  * @returns {Promise<EncKeyPair>}
  */
  generateEncKeyPair() {
    return lib.enc_generate_key_pair(this.app.connection)
        .then((r) => new EncKeyPair(this.app,
            h.autoref(new PubEncKey(this.app, r[0])),
            h.autoref(new SecEncKey(this.app, r[1]))
          ));
  }

  /**
  * Generate a new Sign Key Pair (public & private keys).
  * @returns {Promise<SignKeyPair>}
  */
  generateSignKeyPair() {
    return lib.sign_generate_key_pair(this.app.connection)
        .then((r) => new SignKeyPair(this.app,
            h.autoref(new PubSignKey(this.app, r[0])),
            h.autoref(new SecSignKey(this.app, r[1]))
          ));
  }

  /**
  * Generate a new Asymmetric Encryption Key Pair from raw secret and public keys
  * @returns {Promise<EncKeyPair>}
  */
  generateEncKeyPairFromRaw(rawPublicKey, rawSecretkey) {
    let pubKey;
    return this.pubEncKeyFromRaw(rawPublicKey)
        .then((pk) => { pubKey = pk; })
        .then(() => this.secEncKeyFromRaw(rawSecretkey))
        .then((sk) => new EncKeyPair(this.app, pubKey, sk));
  }

  /**
  * Generate a new Sign Key Pair from raw secret and public keys
  * @returns {Promise<SignKeyPair>}
  */
  generateSignKeyPairFromRaw(rawPublicKey, rawSecretkey) {
    let pubKey;
    return this.pubSignKeyFromRaw(rawPublicKey)
        .then((pk) => { pubKey = pk; })
        .then(() => this.secSignKeyFromRaw(rawSecretkey))
        .then((sk) => new SignKeyPair(this.app, pubKey, sk));
  }

  /**
  * Interprete the Public Sign Key from a given raw string
  * @param {String} raw public sign key raw bytes as string
  * @returns {Promise<PubSignKey>}
  */
  pubSignKeyFromRaw(raw) {
    return lib.sign_pub_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new PubSignKey(this.app, c)));
  }

  /**
  * Interprete the Secret Sign Key from a given raw string
  * @param {String} raw secret sign key raw bytes as string
  * @returns {Promise<SecSignKey>}
  */
  secSignKeyFromRaw(raw) {
    return lib.sign_sec_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new SecSignKey(this.app, c)));
  }

  /**
  * Interprete the public encryption Key from a given raw string
  * @arg {String} raw public encryption key raw bytes as string
  * @returns {Promise<PubEncKey>}
  */
  pubEncKeyFromRaw(raw) {
    return lib.enc_pub_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new PubEncKey(this.app, c)));
  }

  /**
  * Interprete the secret encryption Key from a given raw string
  * @arg {String} raw secret encryption key raw bytes as string
  * @returns {Promise<SecEncKey>}
  */
  secEncKeyFromRaw(raw) {
    return lib.enc_secret_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new SecEncKey(this.app, c)));
  }

  /**
  * Generate a nonce that can be used when creating private MutableData
  * @returns {Promise<Nonce>} the nonce generated
  */
  /* eslint-disable class-methods-use-this */
  generateNonce() {
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

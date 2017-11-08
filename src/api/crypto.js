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

/**
* Holds signature key
*/
class SignKey extends h.NetworkObject {

  /**
  * generate raw string copy of signature key
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
}

/**
* Holds the public part of an encryption key
*/
class PubEncKey extends h.NetworkObject {

  /**
  * generate raw string copy of encryption key
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
    return lib.enc_key_free(app.connection, ref);
  }

  /**
  * Encrypt the input (buffer or string) using the private and public key with a seal
  * @returns {Promise<Buffer>} Ciphertext
  */
  encryptSealed(str) {
    return lib.encrypt_sealed_box(this.app.connection, str, this.ref);
  }


  /**
  * Encrypt the input (buffer or string) using the private and public key and the given privateKey
  * @returns {Promise<Buffer>} Ciphertext
  */
  encrypt(str, secretKey) {
    return lib.encrypt(this.app.connection, str, this.ref, secretKey.ref);
  }
}


/**
* Holds the secret part of an encryption key
*/
class SecEncKey extends h.NetworkObject {

  /**
  * generate raw string copy of encryption key
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
    return lib.enc_key_free(app.connection, ref);
  }

  /**
  * Decrypt the given ciphertext (buffer or string) using the private and public key
  * @arg theirPubKey {PubEncKey} the others public key
  * @returns {Promise<Buffer>} Plaintext
  */
  decrypt(cipher, theirPubKey) {
    return lib.decrypt(this.app.connection, cipher, theirPubKey.ref, this.ref);
  }
}


/**
* Holds an asymmetric keypair
*/
class KeyPair {

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
  * Decrypt the given ciphertext with a seal (buffer or string) using the private and public key
  * @returns {Promise<Buffer>} Plaintext
  */
  decryptSealed(cipher) {
    return lib.decrypt_sealed_box(this.app.connection, cipher,
                                  this.pubEncKey.ref, this.secEncKey.ref);
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
  sha3Hash(inpt) {
    return lib.sha3_hash(inpt);
  }

  /* eslint-enable class-methods-use-this */


  /**
  * Get the public signing key of this session
  * @returns {Promise<SignKey>}
  */
  getAppPubSignKey() {
    return lib.app_pub_sign_key(this.app.connection)
        .then((c) => h.autoref(new SignKey(this.app, c)));
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
  * Generate a new Asymmetric EncryptionKeyPair
  * @returns {Promise<KeyPair>}
  */
  generateEncKeyPair() {
    return lib.enc_generate_key_pair(this.app.connection)
        .then((r) => new KeyPair(this.app,
            h.autoref(new PubEncKey(this.app, r[0])),
            h.autoref(new SecEncKey(this.app, r[1]))
          ));
  }

  /**
  * Generate a new Asymmetric EncryptionKeyPair from raw secret and public keys
  * @returns {Promise<KeyPair>}
  */
  generateEncKeyPairFromRaw(rawPublicKey, rawSecretkey) {
    let pubKey;
    return this.pubEncKeyKeyFromRaw(rawPublicKey)
        .then((pk) => { pubKey = pk; })
        .then(() => this.secEncKeyKeyFromRaw(rawSecretkey))
        .then((sk) => new KeyPair(this.app, pubKey, sk));
  }

  /**
  * Interprete the SignKey from a given raw string
  * @param {String} raw sign key raw bytes as string
  * @returns {Promise<SignKey>}
  */
  getSignKeyFromRaw(raw) {
    return lib.sign_pub_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new SignKey(this.app, c)));
  }

  /**
  * Interprete the public encryption Key from a given raw string
  * @arg {String} raw public encryption key raw bytes as string
  * @returns {Promise<PubEncKey>}
  */
  pubEncKeyKeyFromRaw(raw) {
    return lib.enc_pub_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new PubEncKey(this.app, c)));
  }

  /**
  * Interprete the secret encryption Key from a given raw string
  * @arg {String} raw secret encryption key raw bytes as string
  * @returns {Promise<SecEncKey>}
  */
  secEncKeyKeyFromRaw(raw) {
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
  SignKey,
  PubEncKey,
  SecEncKey,
  KeyPair,
  CryptoInterface
};

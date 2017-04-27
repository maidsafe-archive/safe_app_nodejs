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
**/
class SignKey extends h.NetworkObject {

  /**
  * generate raw string copy of signature key
  * @returns {Promise<String>}
  **/
  getRaw() {
    return lib.sign_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.sign_key_free(app.connection, ref);
  }
}

/**
* Holds a the public part of an encryption key
**/
class PubEncKey extends h.NetworkObject {

  /**
  * generate raw string copy of encryption key
  * @returns {Promise<String>}
  **/
  getRaw() {
    return lib.enc_pub_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.enc_key_free(app.connection, ref);
  }

}


/**
* Holds a the secret part of an encryption key
**/
class SecEncKey extends h.NetworkObject {

  /**
  * generate raw string copy of encryption key
  * @returns {Promise<String>}
  **/
  getRaw() {
    return lib.enc_secret_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.enc_key_free(app.connection, ref);
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
  **/
  constructor(app) {
    this.app = app;
  }

  /**
  * Hash the given input with SHA3 Hash
  * @returns {Promise<Buffer>}
  **/
  sha3Hash(inpt) {
    return lib.sha3_hash(inpt);
  }


  /**
  * Get the public signing key of this session
  * @returns {Promise<SignKey>}
  **/
  getAppPubSignKey() {
    return lib.app_pub_sign_key(this.app.connection)
        .then((c) => h.autoref(new SignKey(this.app, c)));
  }

  /**
  * Get the public encryption key of this session
  * May only works if 
  * @returns {Promise<PubEncKey>}
  **/
  getAppPubEncKey() {
    return lib.app_pub_enc_key(this.app.connection)
        .then((c) => h.autoref(new PubEncKey(this.app, c)));
  }

  /**
  * Generate a new Asymmetric EncryptionKeyPair
  * @returns {Promise<[PubEncKey, SecEncKey]>}
  **/
  generateEncKeyPair() {
    return lib.enc_generate_key_pair(this.app.connection)
        .then(r => [
            h.autoref(new PubEncKey(this.app, r[0])),
            h.autoref(new SecEncKey(this.app, r[1]))
          ]);
  }

  /**
  * Interprete the SignKey from a given raw string
  * FIXME: is this expected to be Base64 encoded?
  * @param {String} raw
  * @returns {Promise<SignKey>}
  **/
  getSignKeyFromRaw(raw) {
    return lib.sign_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new SignKey(this.app, c)));
  }

  /**
  * Interprete the encryption Key from a given raw string
  * FIXME: is this expected to be Base64 encoded?
  * @arg {String} raw
  * @returns {Promise<PubEncKey>}
  **/
  PubEncKeyKeyFromRaw(raw) {
    return lib.enc_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new PubEncKey(this.app, c)));
  }
}


module.exports = {
  SignKey,
  PubEncKey,
  SecEncKey,
  CryptoInterface
};
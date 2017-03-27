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
* Holds an encryption key
**/
class EncKey extends h.NetworkObject {

  /**
  * generate raw string copy of encryption key
  * @returns {Promise<String>}
  **/
  getRaw() {
    return lib.enc_key_get(this.app.connection, this.ref);
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

module.exports = { SignKey, EncKey };

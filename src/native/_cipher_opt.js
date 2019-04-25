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


const ffi = require('ffi-napi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const { types } = require('./_crypto');
const EncryptKeyHandle = types.EncryptKeyHandle;
const t = base.types;
const h = base.helpers;

const CipherOptHandle = t.ObjectHandle;

module.exports = {
  types: {
    CipherOptHandle,
    EncryptKeyHandle
  },
  functions: {
    cipher_opt_new_plaintext: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    cipher_opt_new_symmetric: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    cipher_opt_new_asymmetric: [t.Void, [t.AppPtr, EncryptKeyHandle, 'pointer', 'pointer']],
    cipher_opt_free: [t.Void, [t.AppPtr, CipherOptHandle, 'pointer', 'pointer']]
  },
  api: {
    cipher_opt_new_plaintext: h.Promisified(null, CipherOptHandle),
    cipher_opt_new_symmetric: h.Promisified(null, CipherOptHandle),
    cipher_opt_new_asymmetric: h.Promisified(null, CipherOptHandle),
    cipher_opt_free: h.Promisified(null, [])
  }
};

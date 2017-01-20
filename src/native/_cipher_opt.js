const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const t = base.types;
const h = base.helpers;

const CipherOptHandle = t.ObjectHandle;

module.exports = {
  types: {
    CipherOptHandle
  },
  functions: {
    cipher_opt_new_plaintext: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    cipher_opt_free: [t.Void, [t.AppPtr, CipherOptHandle, 'pointer', 'pointer']]
  },
  api: {
    cipher_opt_new_plaintext: h.Promisified(null, CipherOptHandle),
    cipher_opt_free: h.Promisified(null, [])
  }
}
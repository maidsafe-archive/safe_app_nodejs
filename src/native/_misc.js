const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const EncryptKeyHandle = require('./_cipher_opt').types.EncryptKeyHandle;
const t = base.types;
const h = base.helpers;

const SignKeyHandle = t.ObjectHandle;

module.exports = {
  types: {
    SignKeyHandle
  },
  functions: {
    app_pub_sign_key: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    sign_key_new: [t.Void, [t.AppPtr, t.KEYBYTES, 'pointer', 'pointer']],
    sign_key_get: [t.Void, [t.AppPtr, SignKeyHandle, 'pointer', 'pointer']],
    sign_key_free: [t.Void, [t.AppPtr, SignKeyHandle, 'pointer', 'pointer']],
    app_pub_enc_key: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    enc_key_new: [t.Void, [t.AppPtr, t.KEYBYTES, 'pointer', 'pointer']],
    enc_key_get: [t.Void, [t.AppPtr, EncryptKeyHandle, 'pointer', 'pointer']],
    enc_key_free: [t.Void, [t.AppPtr, EncryptKeyHandle, 'pointer', 'pointer']]
  },
  api: {
    app_pub_sign_key: h.Promisified(null, SignKeyHandle),
    sign_key_new: h.Promisified(null, SignKeyHandle),
    sign_key_get: h.Promisified(null, t.KEYBYTES),
    sign_key_free: h.Promisified(null, []),
    app_pub_enc_key: h.Promisified(null, EncryptKeyHandle),
    enc_key_new: h.Promisified(null, EncryptKeyHandle),
    enc_key_get: h.Promisified(null, t.KEYBYTES),
    enc_key_free: h.Promisified(null, [])
  }
}

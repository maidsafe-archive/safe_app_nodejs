const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const t = base.types;
const h = base.helpers;

const SignKeyHandle = t.ObjectHandle;
const EncryptPubKeyHandle = t.ObjectHandle;
const EncryptSecKeyHandle = t.ObjectHandle;
const EncryptKeyHandle = t.ObjectHandle;


function strToBuffer(str) {
  let res = str;
  if (!Buffer.isBuffer(str)) {
    res = new Buffer(str);
  }
  return [res, res.length]
}

function toBuffer(app, key) {
  let keyArr = key;
  if (!Buffer.isBuffer(key)) {
    const b = new Buffer(key);
    if (b.length != 32) throw Error("Sign/Enc Keys _must be_ 32 bytes long.")
    keyArr = t.KEYBYTES(b).ref().readPointer(0);
  }
  return [app, keyArr];
}

function appStrToBuffer(appPtr, str) {
  return [appPtr].concat(strToBuffer(str)).concat(Array.prototype.slice.call(arguments, 2))
}

// Helper to create a copy of the received KEYBYTES array as it might
// be overwritten after the callback finishes.
function copyKeyBytesArray(res) {
  return t.KEYBYTES(ref.reinterpret(res[0], 32));
}

module.exports = {
  types: {
    SignKeyHandle,
    EncryptPubKeyHandle,
    EncryptSecKeyHandle,
    EncryptKeyHandle
  },
  functions: {
    app_pub_sign_key: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    sign_pub_key_new: [t.Void, [t.AppPtr, ref.refType(t.KEYBYTES), 'pointer', 'pointer']],
    sign_pub_key_get: [t.Void, [t.AppPtr, SignKeyHandle, 'pointer', 'pointer']],
    sign_pub_key_free: [t.Void, [t.AppPtr, SignKeyHandle, 'pointer', 'pointer']],

    app_pub_enc_key: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    enc_generate_key_pair: [t.Void, [t.AppPtr, 'pointer', 'pointer']],

    enc_pub_key_new: [t.Void, [t.AppPtr, ref.refType(t.KEYBYTES), 'pointer', 'pointer']],
    enc_pub_key_get: [t.Void, [t.AppPtr, EncryptPubKeyHandle, 'pointer', 'pointer']],
    enc_secret_key_free: [t.Void, [t.AppPtr, EncryptPubKeyHandle, 'pointer', 'pointer']],

    enc_secret_key_new: [t.Void, [t.AppPtr, ref.refType(t.KEYBYTES), 'pointer', 'pointer']],
    enc_secret_key_get: [t.Void, [t.AppPtr, EncryptSecKeyHandle, 'pointer', 'pointer']],
    enc_secret_key_free: [t.Void, [t.AppPtr, EncryptSecKeyHandle, 'pointer', 'pointer']],

    encrypt: [t.Void, [t.AppPtr, 'pointer', t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],
    decrypt: [t.Void, [t.AppPtr, 'pointer', t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],

    encrypt_sealed_box: [t.Void, [t.AppPtr, 'pointer', t.usize, EncryptPubKeyHandle, 'pointer', 'pointer']],
    decrypt_sealed_box: [t.Void, [t.AppPtr, 'pointer', t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],

    sha3_hash: [t.Void, ['pointer', t.usize, 'pointer', 'pointer']],
    generate_nonce: [t.Void, ['pointer', 'pointer']]
  },
  api: {
    app_pub_sign_key: h.Promisified(null, SignKeyHandle),
    sign_pub_key_new: h.Promisified(toBuffer, SignKeyHandle),
    sign_pub_key_get: h.Promisified(null, ['pointer'], copyKeyBytesArray),
    sign_pub_key_free: h.Promisified(null, []),

    app_pub_enc_key: h.Promisified(null, EncryptKeyHandle),
    enc_generate_key_pair: h.Promisified(null, [EncryptPubKeyHandle, EncryptSecKeyHandle]),

    enc_pub_key_new: h.Promisified(toBuffer, EncryptPubKeyHandle),
    enc_pub_key_get: h.Promisified(null, ['pointer'], copyKeyBytesArray),

    enc_secret_key_new: h.Promisified(toBuffer, EncryptPubKeyHandle),
    enc_secret_key_get: h.Promisified(null, ['pointer'], copyKeyBytesArray),

    encrypt: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    decrypt: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),

    encrypt_sealed_box: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    decrypt_sealed_box: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),

    sha3_hash: h.Promisified(strToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    generate_nonce: h.Promisified(null, t.NONCEBYTES)
  }
};

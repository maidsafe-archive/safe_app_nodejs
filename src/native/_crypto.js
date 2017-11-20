const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const t = base.types;
const h = base.helpers;

const SignPubKeyHandle = t.ObjectHandle;
const SignSecKeyHandle = t.ObjectHandle;
const EncryptPubKeyHandle = t.ObjectHandle;
const EncryptSecKeyHandle = t.ObjectHandle;
const EncryptKeyHandle = t.ObjectHandle;


const strToBuffer = (str) => {
  let res = str;
  if (!Buffer.isBuffer(str)) {
    res = new Buffer(str);
  }
  return [res, res.length]
}

const toBuffer = (app, key) => {
  let keyArr = key;
  if (!Buffer.isBuffer(key)) {
    const b = new Buffer(key);
    if (b.length != 32) throw Error("Sign/Enc Keys _must be_ 32 bytes long.")
    keyArr = t.KEYBYTES(b).ref().readPointer(0);
  }
  return [app, keyArr];
}

const appStrToBuffer = (appPtr, str, ...varArgs) => {
  const buf = strToBuffer(str);
  return [appPtr, ...buf, ...varArgs];
}

// Helper to create a copy of the received KEYBYTES array as it might
// be overwritten after the callback finishes.
const copyKeyBytesArray = (res) => t.KEYBYTES(ref.reinterpret(res[0], 32));

module.exports = {
  types: {
    SignPubKeyHandle,
    SignSecKeyHandle,
    EncryptPubKeyHandle,
    EncryptSecKeyHandle,
    EncryptKeyHandle
  },
  functions: {
    app_pub_sign_key: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    app_pub_enc_key: [t.Void, [t.AppPtr, 'pointer', 'pointer']],

    sign_generate_key_pair: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    sign_pub_key_new: [t.Void, [t.AppPtr, ref.refType(t.KEYBYTES), 'pointer', 'pointer']],
    sign_pub_key_get: [t.Void, [t.AppPtr, SignPubKeyHandle, 'pointer', 'pointer']],
    sign_pub_key_free: [t.Void, [t.AppPtr, SignPubKeyHandle, 'pointer', 'pointer']],

    sign_sec_key_new: [t.Void, [t.AppPtr, ref.refType(t.KEYBYTES), 'pointer', 'pointer']],
    sign_sec_key_get: [t.Void, [t.AppPtr, SignSecKeyHandle, 'pointer', 'pointer']],
    sign_sec_key_free: [t.Void, [t.AppPtr, SignSecKeyHandle, 'pointer', 'pointer']],

    enc_generate_key_pair: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    enc_pub_key_new: [t.Void, [t.AppPtr, ref.refType(t.KEYBYTES), 'pointer', 'pointer']],
    enc_pub_key_get: [t.Void, [t.AppPtr, EncryptPubKeyHandle, 'pointer', 'pointer']],
    enc_pub_key_free: [t.Void, [t.AppPtr, EncryptPubKeyHandle, 'pointer', 'pointer']],

    enc_secret_key_new: [t.Void, [t.AppPtr, ref.refType(t.KEYBYTES), 'pointer', 'pointer']],
    enc_secret_key_get: [t.Void, [t.AppPtr, EncryptSecKeyHandle, 'pointer', 'pointer']],
    enc_secret_key_free: [t.Void, [t.AppPtr, EncryptSecKeyHandle, 'pointer', 'pointer']],

    encrypt: [t.Void, [t.AppPtr, t.u8Pointer, t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],
    decrypt: [t.Void, [t.AppPtr, t.u8Pointer, t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],

    encrypt_sealed_box: [t.Void, [t.AppPtr, t.u8Pointer, t.usize, EncryptPubKeyHandle, 'pointer', 'pointer']],
    decrypt_sealed_box: [t.Void, [t.AppPtr, t.u8Pointer, t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],

    sign: [t.Void, [t.AppPtr, t.u8Pointer, t.usize, SignSecKeyHandle, 'pointer', 'pointer']],
    verify: [t.Void, [t.AppPtr, t.u8Pointer, t.usize, SignPubKeyHandle, 'pointer', 'pointer']],

    sha3_hash: [t.Void, [t.u8Pointer, t.usize, 'pointer', 'pointer']],
    generate_nonce: [t.Void, ['pointer', 'pointer']]
  },
  api: {
    app_pub_sign_key: h.Promisified(null, SignPubKeyHandle),
    app_pub_enc_key: h.Promisified(null, EncryptKeyHandle),

    sign_generate_key_pair: h.Promisified(null, [SignPubKeyHandle, SignSecKeyHandle]),
    sign_pub_key_new: h.Promisified(toBuffer, SignPubKeyHandle),
    sign_pub_key_get: h.Promisified(null, ['pointer'], copyKeyBytesArray),
    sign_pub_key_free: h.Promisified(null, []),

    sign_sec_key_new: h.Promisified(toBuffer, SignSecKeyHandle),
    sign_sec_key_get: h.Promisified(null, ['pointer'], copyKeyBytesArray),
    sign_sec_key_free: h.Promisified(null, []),

    enc_generate_key_pair: h.Promisified(null, [EncryptPubKeyHandle, EncryptSecKeyHandle]),
    enc_pub_key_new: h.Promisified(toBuffer, EncryptPubKeyHandle),
    enc_pub_key_get: h.Promisified(null, ['pointer'], copyKeyBytesArray),
    enc_pub_key_free: h.Promisified(null, []),

    enc_secret_key_new: h.Promisified(toBuffer, EncryptPubKeyHandle),
    enc_secret_key_get: h.Promisified(null, ['pointer'], copyKeyBytesArray),
    enc_secret_key_free: h.Promisified(null, []),

    encrypt: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    decrypt: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),

    encrypt_sealed_box: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    decrypt_sealed_box: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),

    sign: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    verify: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),

    sha3_hash: h.Promisified(strToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    generate_nonce: h.Promisified(null, t.NONCEBYTES)
  }
};

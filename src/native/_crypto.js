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

function appStrToBuffer(appPtr, str) {
  return [appPtr].concat(strToBuffer(str)).concat(Array.prototype.slice.call(arguments, 2))
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
    sign_key_new: [t.Void, [t.AppPtr, t.KEYBYTES, 'pointer', 'pointer']],
    sign_key_get: [t.Void, [t.AppPtr, SignKeyHandle, 'pointer', 'pointer']],
    sign_key_free: [t.Void, [t.AppPtr, SignKeyHandle, 'pointer', 'pointer']],

    app_pub_enc_key: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    enc_generate_key_pair: [t.Void, [t.AppPtr, 'pointer', 'pointer']],

    enc_pub_key_new: [t.Void, [t.AppPtr, t.KEYBYTES, 'pointer', 'pointer']],
    enc_pub_key_get: [t.Void, [t.AppPtr, EncryptPubKeyHandle, 'pointer', 'pointer']],
    enc_secret_key_free: [t.Void, [t.AppPtr, EncryptPubKeyHandle, 'pointer', 'pointer']],

    enc_secret_key_new: [t.Void, [t.AppPtr, t.KEYBYTES, 'pointer', 'pointer']],
    enc_secret_key_get: [t.Void, [t.AppPtr, EncryptSecKeyHandle, 'pointer', 'pointer']],
    enc_secret_key_free: [t.Void, [t.AppPtr, EncryptSecKeyHandle, 'pointer', 'pointer']],

    encrypt: [t.Void, [t.AppPtr, 'pointer', t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],
    decrypt: [t.Void, [t.AppPtr, 'pointer', t.usize, EncryptPubKeyHandle, EncryptSecKeyHandle, 'pointer', 'pointer']],

    sha3_hash: [t.Void, ['pointer', t.usize, 'pointer', 'pointer']]
  },
  api: {
    app_pub_sign_key: h.Promisified(null, SignKeyHandle),
    sign_key_new: h.Promisified(null, SignKeyHandle),
    sign_key_get: h.Promisified(null, t.KEYBYTES),
    sign_key_free: h.Promisified(null, []),

    app_pub_enc_key: h.Promisified(null, EncryptKeyHandle),
    enc_generate_key_pair: h.Promisified(null, [EncryptPubKeyHandle, EncryptSecKeyHandle]),

    enc_pub_key_new: h.Promisified(null, EncryptPubKeyHandle),
    enc_pub_key_get: h.Promisified(null, t.KEYBYTES),

    enc_secret_key_new: h.Promisified(null, EncryptPubKeyHandle),
    enc_secret_key_get: h.Promisified(null, t.KEYBYTES),

    encrypt: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
    decrypt: h.Promisified(appStrToBuffer, [t.u8Pointer, t.usize], h.asBuffer),

    sha3_hash: h.Promisified(strToBuffer, [t.u8Pointer, t.usize], h.asBuffer),
  }
};


// TODO : still need to be implemented

// /// Encrypts arbitrary data using a given key pair.
// /// You should provide a recipient's public key and a sender's secret key.
// pub unsafe extern "C" fn encrypt(app: *const App,
//                                  data: *const u8,
//                                  len: usize,
//                                  pk_h: EncryptPubKeyHandle,
//                                  sk_h: EncryptSecKeyHandle,
//                                  user_data: *mut c_void,
//                                  o_cb: extern "C" fn(*mut c_void, i32, *const u8, usize)) {

// /// Decrypts arbitrary data using a given key pair.
// /// You should provide a sender's public key and a recipient's secret key.
// pub unsafe extern "C" fn decrypt(app: *const App,
//                                  data: *const u8,
//                                  len: usize,
//                                  pk_h: EncryptPubKeyHandle,
//                                  sk_h: EncryptSecKeyHandle,
//                                  user_data: *mut c_void,
//                                  o_cb: extern "C" fn(*mut c_void, i32, *const u8, usize)) {

// /// Encrypts arbitrary data for a single recipient.
// /// You should provide a recipient's public key.
// pub unsafe extern "C" fn encrypt_sealed_box(app: *const App,
//                                             data: *const u8,
//                                             len: usize,
//                                             pk_h: EncryptPubKeyHandle,
//                                             user_data: *mut c_void,
//                                             o_cb: extern "C" fn(*mut c_void,
//                                                                 i32,
//                                                                 *const u8,
//                                                                 usize)) {
// /// Decrypts arbitrary data for a single recipient.
// /// You should provide a recipients's private and public key.
// pub unsafe extern "C" fn decrypt_sealed_box(app: *const App,
//                                             data: *const u8,
//                                             len: usize,
//                                             pk_h: EncryptPubKeyHandle,
//                                             sk_h: EncryptSecKeyHandle,
//                                             user_data: *mut c_void,
//                                             o_cb: extern "C" fn(*mut c_void,
//                                                                 i32,
//                                                                 *const u8,
//                                                                 usize)) {

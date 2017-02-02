const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const CipherOptHandle = require('./_cipher_opt').types.CipherOptHandle;
const t = base.types;
const h = base.helpers;

const SEWriteHandle = t.ObjectHandle; 
const SEReadHandle = t.ObjectHandle;

module.exports = {
  types: {
    SEWriteHandle,
    SEReadHandle
  },
  functions: {
    idata_new_self_encryptor: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    idata_write_to_self_encryptor: [t.Void, [t.AppPtr, SEWriteHandle, 'pointer', t.usize, 'pointer', 'pointer']],
    idata_close_self_encryptor: [t.Void, [t.AppPtr, SEWriteHandle, CipherOptHandle, 'pointer', 'pointer']],
    idata_fetch_self_encryptor: [t.Void, [t.AppPtr, t.XOR_NAME, 'pointer', 'pointer']],
    idata_size: [t.Void, [t.AppPtr, SEReadHandle, 'pointer', 'pointer']],
    idata_read_from_self_encryptor: [t.Void, [t.AppPtr, SEReadHandle, t.u64, t.u64, 'pointer', 'pointer']],
    idata_self_encryptor_writer_free: [t.Void, [t.AppPtr, SEWriteHandle, 'pointer', 'pointer']],
    idata_self_encryptor_reader_free: [t.Void, [t.AppPtr, SEReadHandle, 'pointer', 'pointer']],
  },
  api: {
    idata_new_self_encryptor: h.Promisified(null, [SEWriteHandle]),
    idata_write_to_self_encryptor: h.Promisified((appPtr, handle, str) => {
      let b = Buffer.isBuffer(str) ? str : Buffer.from(str);
      return [appPtr, handle, b, b.length]
    }, null),
    idata_close_self_encryptor: h.Promisified(null, 'pointer', 
      // make a copy to ensure the data stays around
      resp => t.XOR_NAME(ref.reinterpret(resp[0], 32))),
    idata_fetch_self_encryptor: h.Promisified(null, SEReadHandle),
    idata_size: h.Promisified(null, t.u64),
    idata_read_from_self_encryptor: h.Promisified(null, [t.u8Pointer, t.usize, t.usize], h.asBuffer),
    idata_self_encryptor_writer_free: h.Promisified(null, null),
    idata_self_encryptor_reader_free: h.Promisified(null,  null),
  }
}
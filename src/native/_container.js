const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');

const helpers = base.helpers;
const t = base.types;
const makeFfiString = base.helpers.makeFfiString;

const MDataInfoHandle = ref.refType(t.Void);

module.exports = {
  types: {
    MDataInfoHandle
  },
  functions: {
    mdata_info_new_public: [t.Void, [t.AppPtr, t.XOR_NAME, t.u64, 'pointer', 'pointer']],
    mdata_info_new_private: [t.Void, [t.AppPtr, t.XOR_NAME, t.u64, 'pointer', 'pointer']],
    mdata_info_random_public: [t.Void, [t.AppPtr, t.u64, 'pointer', 'pointer']],
    mdata_info_random_private: [t.Void, [t.AppPtr, t.u64, 'pointer', 'pointer']],
    mdata_info_encrypt_entry_key: [t.Void, [t.AppPtr, MDataInfoHandle, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    mdata_info_encrypt_entry_value: [t.Void, [t.AppPtr, MDataInfoHandle, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    mdata_info_extract_name_and_type_tag: [t.Void ,[t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_info_serialise: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_info_deserialise: [t.Void, [t.AppPtr, t.u8Pointer, t.usize, 'pointer', 'pointer']]
  },
  api: {
    mdata_info_new_public: helpers.Promisified(null, MDataInfoHandle),
    mdata_info_new_private: helpers.Promisified(null, MDataInfoHandle),
    mdata_info_random_public: helpers.Promisified(null, MDataInfoHandle),
    mdata_info_random_private: helpers.Promisified(null, MDataInfoHandle),
    mdata_info_encrypt_entry_key: helpers.Promisified(null, [t.u8Pointer, t.usize, t.usize]),
    mdata_info_encrypt_entry_value: helpers.Promisified(null, [t.u8Pointer, t.usize, t.usize]),
    mdata_info_extract_name_and_type_tag: helpers.Promisified(null, [t.u8Array, t.u64]),
    mdata_info_serialise: helpers.Promisified(null, [t.u8Pointer, t.usize, t.usize]),
    mdata_info_deserialise: helpers.Promisified(null, MDataInfoHandle)
  }
};

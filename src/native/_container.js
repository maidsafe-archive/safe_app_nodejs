const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');

const helpers = base.helpers;
const t = base.types;
const makeFfiString = base.helpers.makeFfiString;

const MDataInfoHandle = ref.refType(t.Void);

module.exports = {
  functions: {
    mdata_info_extract_name_and_type_tag: [t.Void ,[t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
  },
  api: {
    mdata_info_extract_name_and_type_tag: helpers.Promisified(null, [t.u8Array, t.u64])
  }
}
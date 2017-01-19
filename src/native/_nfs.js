const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const MDataInfoHandle = require('./_container').types.MDataInfoHandle;
const t = base.types;
const h = base.helpers;

const File = Struct({
  size: t.u64,
  created: t.usize, // TODO fix it for TM
  modified: t.usize, // TODO fix it for TM
  user_metadata_ptr: t.u8Pointer,
  user_metadata_len: t.usize,
  user_metadata_cap: t.usize,
  data_map_name: t.XOR_NAME
});

module.exports = {
  types: {
    File
  },
  functions: {
    file_free: [t.Void, [File]],
    file_fetch: [t.Void, [t.AppPtr, MDataInfoHandle, t.FfiString, 'pointer', 'pointer']],
    file_insert: [t.Void, [t.AppPtr, MDataInfoHandle, t.FfiString, File, 'pointer', 'pointer']],
    file_update: [t.Void, [t.AppPtr, MDataInfoHandle, t.FfiString, File, t.u64,'pointer', 'pointer']]
  },
  api: {
    file_free: function(lib, fn) {
      return (function(fileHandle) {
        fn(fileHandle);
        return Promise.resolve();
      });
    },
    file_fetch: h.Promisified(null, [File, t.u64]),
    file_insert: h.Promisified(null, []),
    file_update: h.Promisified(null, [])
  }
}
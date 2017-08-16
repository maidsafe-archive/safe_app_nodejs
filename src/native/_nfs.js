const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const MDataInfoHandle = require('./_mutable').types.MDataInfoHandle;
const t = base.types;
const h = base.helpers;

const File = Struct({
  size: t.u64,
  created_sec: t.i64,
  created_nsec: t.u32,
  modified_sec: t.i64,
  modified_nsec: t.u32,
  user_metadata_ptr: t.u8Pointer,
  user_metadata_len: t.usize,
  user_metadata_cap: t.usize,
  data_map_name: t.XOR_NAME
});

const FilePtr = ref.refType(File);
const FileContextHandle = t.ObjectHandle;
const readFileInfo = (fileInfo) => {
  const file = fileInfo[0].deref();
  let b = new Buffer(file.data_map_name);
  const data_map_name = t.XOR_NAME(b);
  const size = file.size;
  const created_sec = file.created_sec;
  const created_nsec = file.created_nsec;
  const modified_sec = file.modified_sec;
  const modified_nsec = file.modified_nsec;
  const user_metadata_len = file.user_metadata_len;
  const user_metadata_cap = file.user_metadata_cap;

  let user_metadata_ptr = file.user_metadata_len === 0 ? new Buffer(0) : new Buffer(ref.reinterpret(file.user_metadata_ptr, file.user_metadata_len));

  if (user_metadata_ptr) {
    try {
      if(typeof user_metadata_ptr === 'object') {
        user_metadata_ptr = user_metadata_ptr;
      } else {
        user_metadata_ptr = JSON.parse(user_metadata_ptr.toString());
      }

    } catch (e) {
      // we can safely ignore this
      if (console && console.warn) {
        console.warn(`Parsing user metadata '${user_metadata_ptr}' of '${data_map_name}' failed: ${e}`)
      }
    }
  }

  let retFile = {
    data_map_name,
    size,
    created_sec,
    created_nsec,
    modified_sec,
    modified_nsec,
    user_metadata_ptr,
    user_metadata_len,
    user_metadata_cap
  }
  if (typeof fileInfo[1] === 'number') {
    retFile.version = fileInfo[1];
  }

  return retFile;
}

module.exports = {
  types: {
    File,
    FilePtr,
    FileContextHandle
  },
  functions: {
    dir_fetch_file: [t.Void, [t.AppPtr, MDataInfoHandle, 'string', 'pointer', 'pointer']],
    dir_insert_file: [t.Void, [t.AppPtr, MDataInfoHandle, 'string', FilePtr, 'pointer', 'pointer']],
    dir_update_file: [t.Void, [t.AppPtr, MDataInfoHandle, 'string', FilePtr, t.u64, 'pointer', 'pointer']],
    dir_delete_file: [t.Void, [t.AppPtr, MDataInfoHandle, 'string', t.u64, 'pointer', 'pointer']],
    file_open: [t.Void, [t.AppPtr, MDataInfoHandle, FilePtr, t.u64, 'pointer', 'pointer']],
    file_size: [t.Void, [t.AppPtr, FileContextHandle, 'pointer', 'pointer']],
    file_read: [t.Void, [t.AppPtr, FileContextHandle, t.u64, t.u64, 'pointer', 'pointer']],
    file_write: [t.Void, [t.AppPtr, FileContextHandle, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    file_close: [t.Void, [t.AppPtr, FileContextHandle, 'pointer', 'pointer']]

  },
  api: {
    dir_fetch_file: h.Promisified(null, [FilePtr, t.u64], readFileInfo),
    dir_insert_file: h.Promisified(null, []),
    dir_update_file: h.Promisified(null, []),
    dir_delete_file: h.Promisified(null, []),
    file_open: h.Promisified(null, FileContextHandle),
    file_size: h.Promisified(null, [t.u64]),
    file_read: h.Promisified(null, [t.u8Pointer, t.usize], h.asBuffer),
    file_write: h.Promisified((appPtr, fileCtxHandle, data) => {
      let dataAsBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      return [appPtr, fileCtxHandle, dataAsBuffer, dataAsBuffer.length];
    }, null),
    file_close: h.Promisified(null, [FilePtr], readFileInfo)
  }
}

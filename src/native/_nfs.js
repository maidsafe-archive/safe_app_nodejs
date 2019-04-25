// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under 
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or 
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms. 
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const ffi = require('ffi-napi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const { types, helpersForNative } = require('./_mutable');

const MDataInfoPtr = types.MDataInfoPtr;
const toMDataInfo = helpersForNative.toMDataInfo;
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
  let b = Buffer.from(file.data_map_name);
  const data_map_name = t.XOR_NAME(b);
  const size = file.size;
  const created_sec = file.created_sec;
  const created_nsec = file.created_nsec;
  const modified_sec = file.modified_sec;
  const modified_nsec = file.modified_nsec;
  const user_metadata_len = file.user_metadata_len;
  const user_metadata_cap = file.user_metadata_cap;

  let user_metadata_ptr = file.user_metadata_len === 0 
        ? Buffer.alloc(0)
        : Buffer.from(ref.reinterpret(file.user_metadata_ptr, file.user_metadata_len));

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
    dir_fetch_file: [t.Void, [t.AppPtr, MDataInfoPtr, 'string', 'pointer', 'pointer']],
    dir_insert_file: [t.Void, [t.AppPtr, MDataInfoPtr, 'string', FilePtr, 'pointer', 'pointer']],
    dir_update_file: [t.Void, [t.AppPtr, MDataInfoPtr, 'string', FilePtr, t.u64, 'pointer', 'pointer']],
    dir_delete_file: [t.Void, [t.AppPtr, MDataInfoPtr, 'string', t.u64, 'pointer', 'pointer']],
    file_open: [t.Void, [t.AppPtr, MDataInfoPtr, FilePtr, t.u64, 'pointer', 'pointer']],
    file_size: [t.Void, [t.AppPtr, FileContextHandle, 'pointer', 'pointer']],
    file_read: [t.Void, [t.AppPtr, FileContextHandle, t.u64, t.u64, 'pointer', 'pointer']],
    file_write: [t.Void, [t.AppPtr, FileContextHandle, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    file_close: [t.Void, [t.AppPtr, FileContextHandle, 'pointer', 'pointer']]
  },
  api: {
    dir_fetch_file: h.Promisified(toMDataInfo, [FilePtr, t.u64], readFileInfo),
    dir_insert_file: h.Promisified(toMDataInfo, []),
    dir_update_file: h.Promisified(toMDataInfo, [t.u64]),
    dir_delete_file: h.Promisified(toMDataInfo, [t.u64]),
    file_open: h.Promisified(toMDataInfo, FileContextHandle),
    file_size: h.Promisified(null, [t.u64]),
    file_read: h.Promisified(null, [t.u8Pointer, t.usize], h.asBuffer),
    file_write: h.Promisified((appPtr, fileCtxHandle, data) => {
      let dataAsBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      return [appPtr, fileCtxHandle, dataAsBuffer, dataAsBuffer.length];
    }, null),
    file_close: h.Promisified(null, FilePtr, readFileInfo)
  }
}

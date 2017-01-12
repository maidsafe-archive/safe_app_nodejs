const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');

const t = base.types;
const h = base.helpers;
const Promisified = base.helpers.Promisified;
const makeFfiString = base.helpers.makeFfiString;


const MDataInfo = Struct({});
const MDataInfoHandle = ref.refType(MDataInfo);
const bufferTypes = [t.u8Pointer, t.usize, t.usize];


function bufferLastEntry() {
  let str = new Buffer(arguments[arguments.length - 1]);
  return Array.prototype.slice(arguments, 0, arguments.length -1)
        .concat([str, str.length]);
}
function translateXorName(appPtr, str, tag) {
  const b = new Buffer(str);
  if (b.length != 32) throw Error("XOR Names _must be_ 32 bytes long.")
  const name = t.XOR_NAME(b);
  return [appPtr, name.ref(), tag]
}

function remap() {
  let names = arguments;
  return (function (resps) {
    let map = {};
    for (var i = 0; i < resps.length; i++) {
      map[names[i]] = resps[i]
    }
    return map;
  })
}

module.exports = {
  types: {
    MDataInfo,
    MDataInfoHandle,
  },
  functions: {
    mdata_info_new_public: [t.Void, [t.AppPtr, ref.refType(t.XOR_NAME), t.u64, "pointer", "pointer"]],
    mdata_info_new_private: [t.Void, [t.AppPtr, ref.refType(t.XOR_NAME), t.u64,  "pointer", "pointer"]],
    mdata_info_random_public: [t.Void, [t.AppPtr, t.u64, "pointer", "pointer"]],
    mdata_info_random_private: [t.Void, [t.AppPtr, t.u64, "pointer", "pointer"]],
    mdata_info_encrypt_entry_key: [t.Void, [t.AppPtr, MDataInfoHandle, "pointer", t.usize, "pointer", "pointer"]],
    mdata_info_encrypt_entry_value: [t.Void, [t.AppPtr, MDataInfoHandle, "pointer", t.usize, "pointer", "pointer"]],
    mdata_info_extract_name_and_type_tag: [t.Void ,[t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_info_serialise: [t.Void, [t.AppPtr, MDataInfoHandle, "pointer", "pointer"]],
    mdata_info_deserialise: [t.Void, [t.AppPtr, t.u8Array, t.usize, "pointer", "pointer"]],
  },
  api: {
    // creation
    mdata_info_new_public: Promisified(translateXorName, MDataInfoHandle),
    mdata_info_new_private: Promisified(translateXorName, MDataInfoHandle),
    mdata_info_random_public: Promisified(null, MDataInfoHandle),
    mdata_info_random_private: Promisified(null, MDataInfoHandle),
    mdata_info_encrypt_entry_key: Promisified(bufferLastEntry, bufferTypes, h.asBuffer),
    mdata_info_encrypt_entry_value: Promisified(bufferLastEntry, bufferTypes, h.asBuffer),
    mdata_info_extract_name_and_type_tag: Promisified(null, [ref.refType(t.XOR_NAME), t.u64], remap('name', 'tag')),
    mdata_info_serialise: Promisified(null, bufferTypes, h.asBuffer),
    mdata_info_deserialise: Promisified(bufferLastEntry, MDataInfoHandle)
  }
}
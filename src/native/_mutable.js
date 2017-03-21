const fastcall = require('fastcall');
const ffi = fastcall.ffi;
const ref = fastcall.ref;
const Struct = fastcall.StructType;
const Enum = require('enum');
const base = require('./_base');

const t = base.types;
const h = base.helpers;
const Promisified = h.Promisified;
const simplePromise = h.simplePromise;

const valueVersionType = [t.u8Pointer, t.usize, t.u64];

/**
* One of: `Insert`, `Update`, `Delete`, `ManagePermissions`
* @typedef {String} MDataAction
**/
const MDataAction = new Enum({
  Insert: 0,
  Update: 1,
  Delete: 2,
  ManagePermissions: 3
});

function bufferLastEntry() {
  let str = new Buffer(arguments[arguments.length - 1]);
  return Array.prototype.slice.call(arguments, 0, arguments.length - 1)
        .concat([str, str.length]);
}

function keyValueCallBackLastEntry(types) {
  let fn = arguments[arguments.length - 1];
  if (typeof fn !== 'function') throw Error('A function parameter _must be_ provided')

  let cb = ffi.Callback("void", types, function(uctx) {
    let args = [];
    if (arguments.length === 3) {
      // the callback is only for an entry's key
      args.push(ref.reinterpret(arguments[1], arguments[2], 0));
    } else if (arguments.length === 4) {
      // the callback is only for an entry's value (with its version)
      args.push(readValueToBuffer([arguments[1], arguments[2], arguments[3]]));
    } else { // arguments.length === 6
      // the callback is for both entry's key and value (with its version)
      args.push(ref.reinterpret(arguments[1], arguments[2], 0));
      args.push(readValueToBuffer([arguments[3], arguments[4], arguments[5]]));
    }
    fn.apply(fn, args);
  });

  return Array.prototype.slice.call(arguments, 1, arguments.length - 1)
            .concat(cb);
}

function translateXorName(appPtr, str, tag) {
  let name = str;
  if (!Buffer.isBuffer(str)) {
    const b = new Buffer(str);
    if (b.length != 32) throw Error("XOR Names _must be_ 32 bytes long.")
    name = t.XOR_NAME(b).ref();
  }
  return [appPtr, name, tag]
}

function strToBuffer(app, mdata) {
    const args = [app, mdata];
    Array.prototype.slice.call(arguments, 2).forEach(item => {
      const buf = Buffer.isBuffer(item) ? item : (item.buffer || new Buffer(item));
      args.push(buf);
      args.push(buf.length);
    });
    return args;
}

// keep last entry as is
function strToBufferButLastEntry(app, mdata) {
    let lastArg = arguments[arguments.length - 1];
    const args = [app, mdata];
    Array.prototype.slice.call(arguments, 2, arguments.length - 1).forEach(item => {
      const buf = Buffer.isBuffer(item) ? item : (item.buffer || new Buffer(item));
      args.push(buf);
      args.push(buf.length);
    });
    args.push(lastArg);
    return args;
}

// args[2] is expected to be content version
function readValueToBuffer(args) {
    return {
        buf: new Buffer(ref.reinterpret(args[0], args[1], 0)),
        version: args[2]
    }
}

module.exports = {
  callbacks : {
    NameAndTagCB: h.expectCallback("pointer", 'int'),
    ValueVersionCB: h.expectCallback(valueVersionType)
  },
  functions: {
    mdata_info_new_public: [t.Void, [t.AppPtr, ref.refType(t.XOR_NAME), t.u64, "pointer", 'ObjectHandleCB']],
    mdata_info_new_private: [t.Void, [t.AppPtr, ref.refType(t.XOR_NAME), t.u64,  "pointer", 'ObjectHandleCB']],
    mdata_info_random_public: [t.Void, [t.AppPtr, t.u64, "pointer", 'ObjectHandleCB']],
    mdata_info_random_private: [t.Void, [t.AppPtr, t.u64, "pointer", 'ObjectHandleCB']],

    mdata_info_encrypt_entry_key: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, "pointer", "BufferCB"]],
    mdata_info_encrypt_entry_value: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, "pointer", "BufferCB"]],
    mdata_info_extract_name_and_type_tag: [t.Void ,[t.AppPtr, t.ObjectHandle, 'pointer', 'NameAndTagCB']],

    mdata_info_serialise: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'BufferCB']],
    mdata_info_deserialise: [t.Void, [t.AppPtr, t.u8Array, t.usize, 'pointer', 'ObjectHandleCB']],

    mdata_permission_set_new: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    mdata_permissions_set_allow: [t.Void, [t.AppPtr, t.ObjectHandle, t.i32, 'pointer', 'EmptyCB']],
    mdata_permissions_set_deny: [t.Void, [t.AppPtr, t.ObjectHandle, t.i32, 'pointer', 'EmptyCB']],
    mdata_permissions_set_clear: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_permissions_set_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],

    mdata_permissions_new: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],

    mdata_permissions_len: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'SizeCB']],
    mdata_permissions_get: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_permissions_for_each: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_permissions_insert: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_permissions_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_put: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_get_version: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_get_value: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, 'pointer', 'EmptyCB']],
    mdata_list_entries: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_list_keys: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_list_values: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_mutate_entries: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_list_permissions: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_list_user_permissions: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_set_user_permissions: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, t.ObjectHandle, t.u64, 'pointer', 'EmptyCB']],
    mdata_del_user_permissions: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, t.u64, 'pointer', 'EmptyCB']],
    mdata_change_owner: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, t.u64, 'pointer', 'EmptyCB']],
    mdata_entry_actions_new: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    mdata_entry_actions_insert: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, t.u8Pointer, t.usize, 'pointer', 'EmptyCB']],
    mdata_entry_actions_update: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, t.u8Pointer, t.usize, t.u64, 'pointer', 'EmptyCB']],
    mdata_entry_actions_delete: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, t.u64, 'pointer', 'EmptyCB']],
    mdata_entry_actions_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_entries_new: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    mdata_entries_insert: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, t.u8Pointer, t.usize, 'pointer', 'EmptyCB']],
    mdata_entries_len: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'SizeCB']],
    mdata_entries_get: [t.Void, [t.AppPtr, t.ObjectHandle, t.u8Pointer, t.usize, 'pointer', 'EmptyCB']],
    mdata_entries_for_each: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'pointer', 'EmptyCB']],
    mdata_entries_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_keys_len: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'SizeCB']],
    mdata_keys_for_each: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'pointer', 'EmptyCB']],
    mdata_keys_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    mdata_values_len: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'SizeCB']],
    mdata_values_for_each: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'pointer', 'EmptyCB']],
    mdata_values_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
  },
  api: {
    // creation
    mdata_info_new_public: Promisified(translateXorName),
    mdata_info_new_private: Promisified(translateXorName),

    mdata_info_encrypt_entry_key: Promisified(bufferLastEntry, h.asBuffer),
    mdata_info_encrypt_entry_value: Promisified(bufferLastEntry, h.asBuffer),
    mdata_info_extract_name_and_type_tag: Promisified(null,
      // make sure to create a copy of this as it might be overwritten
      // after the callback finishes
      resp => { return { name: t.XOR_NAME(ref.reinterpret(resp[0], 32)), tag: resp[1] } }),

    mdata_info_serialise: h.bufferPromise,
    mdata_info_deserialise: Promisified(bufferLastEntry),

    mdata_permissions_set_allow: Promisified((appPtr, handle, action) => {
      console.log('aa', appPtr, handle, action);
      const mA = MDataAction.get(action);
      if (!mA) throw Error(`"${action}" is not a valid Mdata Action!`)
      return [appPtr, handle, mA]
      }),
    mdata_permissions_set_deny: Promisified((appPtr, handle, action) =>
        [appPtr, handle, MDataAction.get(action)]),

    mdata_get_value: Promisified(strToBuffer, readValueToBuffer),
    mdata_entry_actions_insert: Promisified(strToBuffer),
    mdata_entry_actions_update: Promisified(strToBufferButLastEntry),
    mdata_entry_actions_delete: Promisified(strToBufferButLastEntry),
    mdata_entries_insert: Promisified(strToBuffer),
    mdata_entries_get: Promisified(strToBuffer, readValueToBuffer),
    mdata_entries_for_each: Promisified(keyValueCallBackLastEntry.bind(null,
          ['pointer', t.u8Pointer, t.usize, t.u8Pointer, t.usize, t.u64])),
    mdata_keys_for_each: Promisified(keyValueCallBackLastEntry.bind(null,
          ['pointer', t.u8Pointer, t.usize])),
    mdata_values_for_each: Promisified(keyValueCallBackLastEntry.bind(null,
          ['pointer', t.u8Pointer, t.usize, t.u64])),
  }
};

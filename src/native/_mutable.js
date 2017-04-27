const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const Enum = require('enum');
const base = require('./_base');

const t = base.types;
const h = base.helpers;
const Promisified = base.helpers.Promisified;
const SignKeyHandle = require('./_crypto').types.SignKeyHandle;

const MDataInfo = Struct({});
const MDataInfoHandle = ref.refType(MDataInfo);
const MDataPermissionsHandle = t.ObjectHandle;
const MDataPermissionSetHandle = t.ObjectHandle;
const MDataEntriesHandle = t.ObjectHandle;
const MDataKeysHandle = t.ObjectHandle;
const MDataValuesHandle = t.ObjectHandle;
const MDataEntryActionsHandle = t.ObjectHandle;
const bufferTypes = [t.u8Pointer, t.usize, t.usize];
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

function permissionsCallBackLastEntry(types) {
  let fn = arguments[arguments.length - 1];
  if (typeof fn !== 'function') throw Error('A function parameter _must be_ provided')

  let cb = ffi.Callback("void", types, function(uctx) {
    fn(arguments[1], arguments[2]);
  });

  return Array.prototype.slice.call(arguments, 1, arguments.length - 1)
            .concat(cb);
}

function translateXorName(appPtr, str, tag) {
  let name = str;
  if (!Buffer.isBuffer(str)) {
    const b = new Buffer(str);
    if (b.length != 32) throw Error("XOR Names _must be_ 32 bytes long.")
    name = t.XOR_NAME(b).ref().readPointer(0);
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
        buf: ref.isNull(args[0]) ? args[0] : new Buffer(ref.reinterpret(args[0], args[1], 0)),
        version: args[2]
    }
}

module.exports = {
  types: {
    MDataInfo,
    MDataInfoHandle,
    MDataPermissionSetHandle,
    MDataAction,
    MDataEntriesHandle,
    MDataKeysHandle,
    MDataValuesHandle,
    MDataEntryActionsHandle
  },
  functions: {
    mdata_info_new_public: [t.Void, [t.AppPtr, ref.refType(t.XOR_NAME), t.u64, "pointer", "pointer"]],
    mdata_info_new_private: [t.Void, [t.AppPtr, ref.refType(t.XOR_NAME), t.u64,  "pointer", "pointer"]],
    mdata_info_random_public: [t.Void, [t.AppPtr, t.u64, "pointer", "pointer"]],
    mdata_info_random_private: [t.Void, [t.AppPtr, t.u64, "pointer", "pointer"]],
    mdata_info_encrypt_entry_key: [t.Void, [t.AppPtr, MDataInfoHandle, t.u8Pointer, t.usize, "pointer", "pointer"]],
    mdata_info_encrypt_entry_value: [t.Void, [t.AppPtr, MDataInfoHandle, t.u8Pointer, t.usize, "pointer", "pointer"]],
    mdata_info_extract_name_and_type_tag: [t.Void ,[t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_info_serialise: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_info_deserialise: [t.Void, [t.AppPtr, t.u8Array, t.usize, 'pointer', 'pointer']],
    mdata_permission_set_new: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    mdata_permissions_set_allow: [t.Void, [t.AppPtr, MDataPermissionSetHandle, t.i32, 'pointer', 'pointer']],
    mdata_permissions_set_deny: [t.Void, [t.AppPtr, MDataPermissionSetHandle, t.i32, 'pointer', 'pointer']],
    mdata_permissions_set_clear: [t.Void, [t.AppPtr, MDataPermissionSetHandle, 'pointer', 'pointer']],
    mdata_permissions_set_free: [t.Void, [t.AppPtr, MDataPermissionSetHandle, 'pointer', 'pointer']],
    mdata_permissions_new: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    mdata_permissions_len: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer']],
    mdata_permissions_get: [t.Void, [t.AppPtr, MDataPermissionsHandle, SignKeyHandle, 'pointer', 'pointer']],
    mdata_permissions_for_each: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer', 'pointer']],
    mdata_permissions_insert: [t.Void, [t.AppPtr, MDataPermissionsHandle, SignKeyHandle, MDataPermissionSetHandle, 'pointer', 'pointer']],
    mdata_permissions_free: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer']],
    mdata_put: [t.Void, [t.AppPtr, MDataInfoHandle, MDataPermissionsHandle, MDataEntriesHandle, 'pointer', 'pointer']],
    mdata_get_version: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_get_value: [t.Void, [t.AppPtr, MDataInfoHandle, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    mdata_list_entries: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_list_keys: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_list_values: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_mutate_entries: [t.Void, [t.AppPtr, MDataInfoHandle, MDataEntryActionsHandle, 'pointer', 'pointer']],
    mdata_list_permissions: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_list_user_permissions: [t.Void, [t.AppPtr, MDataInfoHandle, SignKeyHandle, 'pointer', 'pointer']],
    mdata_set_user_permissions: [t.Void, [t.AppPtr, MDataInfoHandle, SignKeyHandle, MDataPermissionSetHandle, t.u64, 'pointer', 'pointer']],
    mdata_del_user_permissions: [t.Void, [t.AppPtr, MDataInfoHandle, SignKeyHandle, t.u64, 'pointer', 'pointer']],
    mdata_change_owner: [t.Void, [t.AppPtr, MDataInfoHandle, SignKeyHandle, t.u64, 'pointer', 'pointer']],
    mdata_entry_actions_new: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    mdata_entry_actions_insert: [t.Void, [t.AppPtr, MDataEntryActionsHandle, t.u8Pointer, t.usize, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    mdata_entry_actions_update: [t.Void, [t.AppPtr, MDataEntryActionsHandle, t.u8Pointer, t.usize, t.u8Pointer, t.usize, t.u64, 'pointer', 'pointer']],
    mdata_entry_actions_delete: [t.Void, [t.AppPtr, MDataEntryActionsHandle, t.u8Pointer, t.usize, t.u64, 'pointer', 'pointer']],
    mdata_entry_actions_free: [t.Void, [t.AppPtr, MDataEntryActionsHandle, 'pointer', 'pointer']],
    mdata_entries_new: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    mdata_entries_insert: [t.Void, [t.AppPtr, MDataEntriesHandle, t.u8Pointer, t.usize, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    mdata_entries_len: [t.Void, [t.AppPtr, MDataEntriesHandle, 'pointer', 'pointer']],
    mdata_entries_get: [t.Void, [t.AppPtr, MDataEntriesHandle, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    mdata_entries_for_each: [t.Void, [t.AppPtr, MDataEntriesHandle, 'pointer', 'pointer', 'pointer']],
    mdata_entries_free: [t.Void, [t.AppPtr, MDataEntriesHandle, 'pointer', 'pointer']],
    mdata_keys_len: [t.Void, [t.AppPtr, MDataKeysHandle, 'pointer', 'pointer']],
    mdata_keys_for_each: [t.Void, [t.AppPtr, MDataKeysHandle, 'pointer', 'pointer', 'pointer']],
    mdata_keys_free: [t.Void, [t.AppPtr, MDataKeysHandle, 'pointer', 'pointer']],
    mdata_values_len: [t.Void, [t.AppPtr, MDataValuesHandle, 'pointer', 'pointer']],
    mdata_values_for_each: [t.Void, [t.AppPtr, MDataValuesHandle, 'pointer', 'pointer', 'pointer']],
    mdata_values_free: [t.Void, [t.AppPtr, MDataValuesHandle, 'pointer', 'pointer']],
  },
  api: {
    // creation
    mdata_info_new_public: Promisified(translateXorName, MDataInfoHandle),
    mdata_info_new_private: Promisified(translateXorName, MDataInfoHandle),
    mdata_info_random_public: Promisified(null, MDataInfoHandle),
    mdata_info_random_private: Promisified(null, MDataInfoHandle),
    mdata_info_encrypt_entry_key: Promisified(bufferLastEntry, bufferTypes, h.asBuffer),
    mdata_info_encrypt_entry_value: Promisified(bufferLastEntry, bufferTypes, h.asBuffer),
    mdata_info_extract_name_and_type_tag: Promisified(null, ['pointer', t.u64],
      // make sure to create a copy of this as it might be overwritten
      // after the callback finishes
      resp => { return { name: t.XOR_NAME(ref.reinterpret(resp[0], 32)), tag: resp[1] } }),
    mdata_info_serialise: Promisified(null, bufferTypes, h.asBuffer),
    mdata_info_deserialise: Promisified(bufferLastEntry, MDataInfoHandle),
    mdata_permission_set_new: Promisified(null, MDataPermissionSetHandle),
    mdata_permissions_set_allow: Promisified((appPtr, handle, action) => {
      const mA = MDataAction.get(action);
      if (!mA) throw Error(`"${action}" is not a valid Mdata Action!`)
      return [appPtr, handle, mA]
      } , []),
    mdata_permissions_set_deny: Promisified((appPtr, handle, action) => [appPtr, handle, MDataAction.get(action)] , []),
    mdata_permissions_set_clear: Promisified(null, []),
    mdata_permissions_set_free: Promisified(null, []),
    mdata_permissions_new: Promisified(null, MDataPermissionsHandle),
    mdata_permissions_len: Promisified(null, t.usize),
    mdata_permissions_get: Promisified(null, MDataPermissionSetHandle),
    mdata_permissions_for_each: Promisified(permissionsCallBackLastEntry.bind(null,
          ['pointer', SignKeyHandle, MDataPermissionSetHandle]), []),
    mdata_permissions_insert: Promisified(null, []),
    mdata_permissions_free: Promisified(null, []),
    mdata_put: Promisified(null, []),
    mdata_get_version: Promisified(null, t.u64),
    mdata_get_value: Promisified(strToBuffer, valueVersionType, readValueToBuffer),
    mdata_list_entries: Promisified(null, MDataEntriesHandle),
    mdata_list_keys: Promisified(null, MDataKeysHandle),
    mdata_list_values: Promisified(null, MDataValuesHandle),
    mdata_mutate_entries: Promisified(null, []),
    mdata_list_permissions: Promisified(null, MDataPermissionsHandle),
    mdata_list_user_permissions: Promisified(null, MDataPermissionSetHandle),
    mdata_set_user_permissions: Promisified(null, []),
    mdata_del_user_permissions: Promisified(null, []),
    mdata_change_owner: Promisified(null, []),
    mdata_entry_actions_new: Promisified(null, MDataEntryActionsHandle),
    mdata_entry_actions_insert: Promisified(strToBuffer, []),
    mdata_entry_actions_update: Promisified(strToBufferButLastEntry, []),
    mdata_entry_actions_delete: Promisified(strToBufferButLastEntry, []),
    mdata_entry_actions_free: Promisified(null, []),
    mdata_entries_new: Promisified(null, MDataEntriesHandle),
    mdata_entries_insert: Promisified(strToBuffer, []),
    mdata_entries_len: Promisified(null, t.usize),
    mdata_entries_get: Promisified(strToBuffer, valueVersionType, readValueToBuffer),
    mdata_entries_for_each: Promisified(keyValueCallBackLastEntry.bind(null,
          ['pointer', t.u8Pointer, t.usize, t.u8Pointer, t.usize, t.u64]), []),
    mdata_entries_free: Promisified(null, []),
    mdata_keys_len: Promisified(null, t.usize),
    mdata_keys_for_each: Promisified(keyValueCallBackLastEntry.bind(null,
          ['pointer', t.u8Pointer, t.usize]), []),
    mdata_keys_free: Promisified(null, []),
    mdata_values_len: Promisified(null, t.usize),
    mdata_values_for_each: Promisified(keyValueCallBackLastEntry.bind(null,
          ['pointer', t.u8Pointer, t.usize, t.u64]), []),
    mdata_values_free: Promisified(null, []),
  }
};

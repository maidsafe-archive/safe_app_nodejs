const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const Enum = require('enum');
const base = require('./_base');

const t = base.types;
const h = base.helpers;
const Promisified = base.helpers.Promisified;
const SignKeyHandle = require('./_misc').types.SignKeyHandle;

const MDataInfo = Struct({});
const MDataInfoHandle = ref.refType(MDataInfo);
const MDataPermissionsHandle = t.ObjectHandle;
const MDataPermissionSetHandle = t.ObjectHandle;
const MDataEntriesHandle = t.ObjectHandle;
const MDataKeysHandle = t.ObjectHandle;
const MDataValuesHandle = t.ObjectHandle;
const MDataEntryActionsHandle = t.ObjectHandle;
const bufferTypes = [t.u8Pointer, t.usize, t.usize];
const MDataAction = new Enum({
  Insert: 0,
  Update: 1,
  Delete: 2,
  ManagePermissions: 3
});



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
    for (let i = 0; i < resps.length; i++) {
      map[names[i]] = resps[i]
    }
    return map;
  })
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
    mdata_info_encrypt_entry_key: [t.Void, [t.AppPtr, MDataInfoHandle, "pointer", t.usize, "pointer", "pointer"]],
    mdata_info_encrypt_entry_value: [t.Void, [t.AppPtr, MDataInfoHandle, "pointer", t.usize, "pointer", "pointer"]],
    mdata_info_extract_name_and_type_tag: [t.Void ,[t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_info_serialise: [t.Void, [t.AppPtr, MDataInfoHandle, 'pointer', 'pointer']],
    mdata_info_deserialise: [t.Void, [t.AppPtr, t.u8Array, t.usize, 'pointer', 'pointer']],
    mdata_permission_set_new: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    // mdata_permissions_set_allow: [t.Void, [t.AppPtr, MDataPermissionSetHandle, MDataAction, 'pointer', 'pointer']],
    // mdata_permissions_set_deny: [t.Void, [t.AppPtr, MDataPermissionSetHandle, MDataAction, 'pointer', 'pointer']],
    // mdata_permissions_set_clear: [t.Void, [t.AppPtr, MDataPermissionSetHandle, MDataAction, 'pointer', 'pointer']],
    mdata_permissions_set_free: [t.Void, [t.AppPtr, MDataPermissionSetHandle, 'pointer', 'pointer']],
    mdata_permissions_new: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    mdata_permissions_len: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer', 'pointer']],
    mdata_permissions_get: [t.Void, [t.AppPtr, MDataPermissionsHandle, SignKeyHandle, 'pointer', 'pointer']],
    mdata_permissions_for_each: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer']],
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
    mdata_info_extract_name_and_type_tag: Promisified(null, [ref.refType(t.XOR_NAME), t.u64], remap('name', 'tag')),
    mdata_info_serialise: Promisified(null, bufferTypes, h.asBuffer),
    mdata_info_deserialise: Promisified(bufferLastEntry, MDataInfoHandle),
    mdata_permission_set_new: Promisified(null, MDataPermissionSetHandle),
    // mdata_permissions_set_allow: Promisified(null, []),
    // mdata_permissions_set_deny: Promisified(null, []),
    // mdata_permissions_set_clear: Promisified(null, []),
    mdata_permissions_set_free: Promisified(null, []),
    mdata_permissions_new: Promisified(null, MDataPermissionsHandle),
    mdata_permissions_len: Promisified(null, t.usize),
    mdata_permissions_get: Promisified(null, MDataPermissionSetHandle),
    mdata_permissions_for_each: Promisified(null, []),
    mdata_permissions_insert: Promisified(null, []),
    mdata_permissions_free: Promisified(null, []),
    mdata_put: Promisified(null, []),
    mdata_get_version: Promisified(null, t.u64),
    mdata_get_value: Promisified(null, [t.u8Pointer, t.usize, t.usize, t.u64]),
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
    mdata_entry_actions_insert: Promisified(null, []),
    mdata_entry_actions_update: Promisified(null, []),
    mdata_entry_actions_delete: Promisified(null, []),
    mdata_entry_actions_free: Promisified(null, []),
    mdata_entries_new: Promisified(null, MDataEntriesHandle),
    mdata_entries_insert: Promisified(null, []),
    mdata_entries_len: Promisified(null, t.usize),
    mdata_entries_get: Promisified(null, [t.u8Pointer, t.usize, t.u64]),
    mdata_entries_for_each: Promisified(null, []),
    mdata_entries_free: Promisified(null, []),
    mdata_keys_len: Promisified(null, t.usize),
    mdata_keys_for_each: Promisified(null, []),
    mdata_keys_free: Promisified(null, []),
    mdata_values_len: Promisified(null, t.usize),
    mdata_values_for_each: Promisified(null, []),
    mdata_values_free: Promisified(null, []),
  }
};

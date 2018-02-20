const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const Enum = require('enum');
const ArrayType = require('ref-array');
const { SignPubKeyHandle } = require('./_crypto').types;
const { types: t, helpers: h } = require('./_base');
const errConst = require('../error_const');

const PromisifiedForEachCb = h.PromisifiedForEachCb;
const Promisified = h.Promisified;

const MDataPermissionsHandle = t.ObjectHandle;
const MDataEntriesHandle = t.ObjectHandle;
const MDataEntryActionsHandle = t.ObjectHandle;
const bufferTypes = [t.u8Pointer, t.usize, t.usize];
const valueVersionType = [t.u8Pointer, t.usize, t.u64];

const MDataKey = Struct({
  /// Key value pointer.
  val_ptr: t.u8Pointer,
  /// Key length.
  val_len: t.usize,
});
const MDataKeysArray = new ArrayType(MDataKey);

const MDataValue = Struct({
    /// Content pointer.
    content_ptr: t.u8Pointer,
    /// Content length.
    content_len: t.usize,
    /// Entry version.
    entry_version: t.u64,
});
const MDataValuesArray = new ArrayType(MDataValue);

const UserPermissionSet = Struct({
    /// User's sign key handle.
    user_h: SignPubKeyHandle,
    /// User's permission set.
    perm_set: t.PermissionSet,
});
const UserPermissionSetArray = new ArrayType(UserPermissionSet);

const MDataInfo = Struct({
  /// Name of the mutable data.
  name: t.XOR_NAME,
  /// Type tag of the mutable data.
  type_tag: t.u64,

  /// Flag indicating whether the encryption info (`enc_key` and `enc_nonce`).
  /// is set.
  has_enc_info: t.bool,
  /// Encryption key. Meaningful only if `has_enc_info` is `true`.
  enc_key: t.SYM_SECRET_KEY,
  /// Encryption nonce. Meaningful only if `has_enc_info` is `true`.
  enc_nonce: t.SYM_NONCE,

  /// Flag indicating whether the new encryption info is set.
  has_new_enc_info: t.bool,
  /// New encryption key (used for two-phase reencryption). Meaningful only if
  /// `has_new_enc_info` is `true`.
  new_enc_key: t.SYM_SECRET_KEY,
  /// New encryption nonce (used for two-phase reencryption). Meaningful only if
  /// `has_new_enc_info` is `true`.
  new_enc_nonce: t.SYM_NONCE,
});

const MDataInfoPtr = ref.refType(MDataInfo);

const makeMDataInfo = (mDataInfoObj) => {
  // let's make sure we send empty arrays if there is no enc key
  let enc_key = t.SYM_SECRET_KEY(Buffer.alloc(64));
  let enc_nonce = t.SYM_NONCE(Buffer.alloc(24));
  if (mDataInfoObj.has_enc_info) {
    enc_key = mDataInfoObj.enc_key;
    enc_nonce = mDataInfoObj.enc_nonce;
  }

  // let's make sure we send empty arrays if there is no new enc info
  let new_enc_key = t.SYM_SECRET_KEY(Buffer.alloc(64));
  let new_enc_nonce = t.SYM_NONCE(Buffer.alloc(24));
  if (mDataInfoObj.has_new_enc_info) {
    new_enc_key = mDataInfoObj.new_enc_key;
    new_enc_nonce = mDataInfoObj.new_enc_nonce;
  }
  return new MDataInfo({
    name: mDataInfoObj.name,
    type_tag: mDataInfoObj.type_tag,
    has_enc_info: mDataInfoObj.has_enc_info,
    enc_key,
    enc_nonce,
    has_new_enc_info: mDataInfoObj.has_new_enc_info,
    new_enc_key,
    new_enc_nonce,
  });
}

const UserMetadata = Struct({
  name: t.CString,
  description: t.CString
});

const UserMetadataPtr = ref.refType(UserMetadata);

const bufferLastEntry = (...varArgs) => {
  let str = new Buffer(varArgs[varArgs.length - 1]);
  return Array.prototype.slice.call(varArgs, 0, varArgs.length - 1)
        .concat([str, str.length]);
}

const keyValueCallBackLastEntry = (types, ...varArgs) => {
  let fn = varArgs[varArgs.length - 1];
  if (typeof fn !== 'function') throw Error('A function parameter _must be_ provided')

  let cb = ffi.Callback("void", types, (uctx, ...cbVarArgs) => {
    let args = [];
    args.push(ref.reinterpret(cbVarArgs[0], cbVarArgs[1], 0));
    args.push(readValueToBuffer([cbVarArgs[2], cbVarArgs[3], cbVarArgs[4]]));
    fn.apply(fn, args);
  });

  return Array.prototype.slice.call(varArgs, 0, varArgs.length - 1)
            .concat(cb);
}

const translatePrivMDInput = (xorname, tag, secKey, nonce) => {
  if(!Number.isInteger(tag)) throw Error(errConst.TYPE_TAG_NAN.msg);
  let name = xorname;
  if (!Buffer.isBuffer(xorname)) {
    const b = new Buffer(xorname);
    if (b.length != 32) throw Error(errConst.XOR_NAME.msg)
    name = t.XOR_NAME(b).ref().readPointer(0);
  }

  let sk = secKey;
  if (!Buffer.isBuffer(secKey)) {
    const b = new Buffer(secKey);
    if (b.length != 32) throw Error(errConst.MISSING_SEC_ENC_KEY.msg)
    sk = t.SYM_SECRET_KEY(b).ref().readPointer(0);
  }

  let n = nonce;
  if (!Buffer.isBuffer(nonce)) {
    const b = new Buffer(nonce);
    if (b.length != 24) throw Error(errConst.NONCE.msg)
    n = t.SYM_NONCE(b).ref().readPointer(0);
  }

  return [name, tag, sk, n]
}

const toMDataInfo = (appPtr, mDataInfoObj, ...varArgs) => {
  const mDataInfo = makeMDataInfo(mDataInfoObj);
  return [appPtr, mDataInfo.ref(), ...varArgs]
}

const firstToMDataInfo = (mDataInfoObj, ...varArgs) => {
  const mDataInfo = makeMDataInfo(mDataInfoObj);
  return [mDataInfo.ref(), ...varArgs]
}

const firstToMDataInfoLastToBuffer = (...varArgs) => {
  const mDataInfo = firstToMDataInfo(...varArgs);
  return bufferLastEntry(...mDataInfo);
}

const strToBuffer = (appPtr, mdata, ...varArgs) => {
    const args = [appPtr, mdata];
    varArgs.forEach(item => {
      const buf = Buffer.isBuffer(item) ? item : (item.buffer || new Buffer(item));
      args.push(buf);
      args.push(buf.length);
    });
    return args;
}

// keep last entry as is
const strToBufferButLastEntry = (appPtr, mdata, ...varArgs) => {
    let lastArg = varArgs[varArgs.length - 1];
    const args = [appPtr, mdata];
    Array.prototype.slice.call(varArgs, 0, varArgs.length - 1).forEach(item => {
      const buf = Buffer.isBuffer(item) ? item : (item.buffer || new Buffer(item));
      args.push(buf);
      args.push(buf.length);
    });
    args.push(lastArg);
    return args;
}

const readValueToBuffer = (argsArr) => {
    return {
        buf: ref.isNull(argsArr[0]) ? argsArr[0] : new Buffer(ref.reinterpret(argsArr[0], argsArr[1], 0)),
        version: argsArr[2] // argsArr[2] is expected to be the content's version in the container
    }
}

const lastToPermissionSet = (...varArgs) => {
  let permsList = varArgs[varArgs.length - 1];
  const permSet = h.makePermissionSet(permsList);
  return Array.prototype.slice.call(varArgs, 0, varArgs.length - 1)
    .concat(permSet.ref());
}

const makeMDataInfoObj = (mDataInfo) => {
  let name;
  try {
    name = t.XOR_NAME(new Buffer(mDataInfo.name));
  } catch (err) {
    throw new Error(errConst.XOR_NAME.msg);
  }
  const type_tag = mDataInfo.type_tag;
  if(!Number.isInteger(type_tag)) throw new Error(errConst.TYPE_TAG_NAN.msg); 
  const has_enc_info = mDataInfo.has_enc_info;
  const enc_key = t.SYM_SECRET_KEY(mDataInfo.enc_key ? new Buffer(mDataInfo.enc_key) : null);
  const enc_nonce = t.SYM_NONCE(mDataInfo.enc_nonce ? new Buffer(mDataInfo.enc_nonce) : null);

  const has_new_enc_info = mDataInfo.has_new_enc_info;
  const new_enc_key = t.SYM_SECRET_KEY(mDataInfo.enc_key ? new Buffer(mDataInfo.enc_key) : null);
  const new_enc_nonce = t.SYM_NONCE(mDataInfo.enc_key ? new Buffer(mDataInfo.enc_nonce) : null);

  let retMDataInfo = {
    name,
    type_tag,
    has_enc_info,
    enc_key,
    enc_nonce,
    has_new_enc_info,
    new_enc_key,
    new_enc_nonce
  }
  return retMDataInfo;
}

const readMDataInfoPtr = (mDataInfoPtr) => {
  return mDataInfoPtr[0] ? makeMDataInfoObj(mDataInfoPtr[0].deref()) : null;
}

const readPermissionSetPtr = (permSetPtr) => {
  const permSet = permSetPtr[0].deref();
  return {
    Read: permSet.Read,
    Insert: permSet.Insert,
    Update: permSet.Update,
    Delete: permSet.Delete,
    ManagePermissions: permSet.ManagePermissions
  }
}

module.exports = {
  types: {
    MDataInfo,
    MDataInfoPtr,
    MDataEntriesHandle,
    MDataEntryActionsHandle,
    UserMetadata
  },
  helpersToExport: {
    makeMDataInfoObj,
    toMDataInfo,
    readMDataInfoPtr,
  },
  functions: {
    mdata_info_new_private: [t.Void, [ref.refType(t.XOR_NAME), t.u64, ref.refType(t.SYM_SECRET_KEY), ref.refType(t.SYM_NONCE), "pointer", "pointer"]],
    mdata_info_random_public: [t.Void, [t.u64, "pointer", "pointer"]],
    mdata_info_random_private: [t.Void, [t.u64, "pointer", "pointer"]],
    mdata_info_encrypt_entry_key: [t.Void, [MDataInfoPtr, t.u8Pointer, t.usize, "pointer", "pointer"]],
    mdata_info_encrypt_entry_value: [t.Void, [MDataInfoPtr, t.u8Pointer, t.usize, "pointer", "pointer"]],
    mdata_info_decrypt: [t.Void, [MDataInfoPtr, t.u8Pointer, t.usize, "pointer", "pointer"]],
    mdata_info_serialise: [t.Void, [MDataInfoPtr, 'pointer', 'pointer']],
    mdata_info_deserialise: [t.Void, [t.u8Array, t.usize, 'pointer', 'pointer']],
    mdata_serialised_size: [t.Void, [t.AppPtr, MDataInfoPtr, 'pointer', 'pointer']],
    mdata_permissions_new: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    mdata_permissions_len: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer']],
    mdata_permissions_get: [t.Void, [t.AppPtr, MDataPermissionsHandle, SignPubKeyHandle, 'pointer', 'pointer']],
    mdata_list_permission_sets: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer']],
    mdata_permissions_insert: [t.Void, [t.AppPtr, MDataPermissionsHandle, SignPubKeyHandle, t.PermissionSetPtr, 'pointer', 'pointer']],
    mdata_permissions_free: [t.Void, [t.AppPtr, MDataPermissionsHandle, 'pointer', 'pointer']],
    mdata_put: [t.Void, [t.AppPtr, MDataInfoPtr, MDataPermissionsHandle, MDataEntriesHandle, 'pointer', 'pointer']],
    mdata_get_version: [t.Void, [t.AppPtr, MDataInfoPtr, 'pointer', 'pointer']],
    mdata_get_value: [t.Void, [t.AppPtr, MDataInfoPtr, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    mdata_list_entries: [t.Void, [t.AppPtr, MDataInfoPtr, 'pointer', 'pointer']],
    mdata_list_keys: [t.Void, [t.AppPtr, MDataInfoPtr, 'pointer', 'pointer']],
    mdata_list_values: [t.Void, [t.AppPtr, MDataInfoPtr, 'pointer', 'pointer']],
    mdata_mutate_entries: [t.Void, [t.AppPtr, MDataInfoPtr, MDataEntryActionsHandle, 'pointer', 'pointer']],
    mdata_list_permissions: [t.Void, [t.AppPtr, MDataInfoPtr, 'pointer', 'pointer']],
    mdata_list_user_permissions: [t.Void, [t.AppPtr, MDataInfoPtr, SignPubKeyHandle, 'pointer', 'pointer']],
    mdata_set_user_permissions: [t.Void, [t.AppPtr, MDataInfoPtr, SignPubKeyHandle, t.PermissionSetPtr, t.u64, 'pointer', 'pointer']],
    mdata_del_user_permissions: [t.Void, [t.AppPtr, MDataInfoPtr, SignPubKeyHandle, t.u64, 'pointer', 'pointer']],
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
    mdata_encode_metadata: [t.Void, [UserMetadataPtr, 'pointer', 'pointer']]
  },
  api: {
    mdata_info_new_private: Promisified(translatePrivMDInput, MDataInfoPtr, readMDataInfoPtr),
    mdata_info_random_public: Promisified(null, MDataInfoPtr, readMDataInfoPtr),
    mdata_info_random_private: Promisified(null, MDataInfoPtr, readMDataInfoPtr),
    mdata_info_encrypt_entry_key: Promisified(firstToMDataInfoLastToBuffer, bufferTypes, h.asBuffer),
    mdata_info_encrypt_entry_value: Promisified(firstToMDataInfoLastToBuffer, bufferTypes, h.asBuffer),
    mdata_info_decrypt: Promisified(firstToMDataInfoLastToBuffer, bufferTypes, h.asBuffer),
    mdata_info_serialise: Promisified(firstToMDataInfo, bufferTypes, h.asBuffer),
    mdata_info_deserialise: Promisified(bufferLastEntry, MDataInfoPtr, readMDataInfoPtr),
    mdata_serialised_size: Promisified(toMDataInfo, t.u64),
    mdata_permissions_new: Promisified(null, MDataPermissionsHandle),
    mdata_permissions_len: Promisified(null, t.usize),
    mdata_permissions_get: Promisified(null, t.PermissionSetPtr, readPermissionSetPtr),
    mdata_list_permission_sets: Promisified(null, [ref.refType(UserPermissionSetArray), t.usize], (args) => {
      const ptr = args[0];
      const len = args[1];
      const userPermList = [];
      if (len > 0) {
        let arrPtr = ref.reinterpret(ptr, UserPermissionSet.size * len);
        let arr = UserPermissionSetArray(arrPtr);
        for (let i = 0; i < len ; i++) {
          const currUserPerm = arr[i];
          const permSet =  {
            Read: currUserPerm.perm_set.Read,
            Insert: currUserPerm.perm_set.Insert,
            Update: currUserPerm.perm_set.Update,
            Delete: currUserPerm.perm_set.Delete,
            ManagePermissions: currUserPerm.perm_set.ManagePermissions
          }
          userPermList.push({ signKey: currUserPerm.user_h, permSet });
        }
      }
      return userPermList;
    }),
    mdata_permissions_insert: Promisified(lastToPermissionSet, []),
    mdata_permissions_free: Promisified(null, []),
    mdata_put: Promisified(toMDataInfo, []),
    mdata_get_version: Promisified(toMDataInfo, t.u64),
    mdata_get_value: Promisified((...varArgs) => {
        const mDataInfo = toMDataInfo(...varArgs);
        return strToBuffer(...mDataInfo);
      }, valueVersionType, readValueToBuffer),
    mdata_list_entries: Promisified(toMDataInfo, MDataEntriesHandle),
    mdata_list_keys: Promisified(toMDataInfo, [ref.refType(MDataKeysArray), t.usize], (args) => {
      const ptr = args[0];
      const len = args[1];
      const keysList = [];
      if (len > 0) {
        let arrPtr = ref.reinterpret(ptr, MDataKey.size * len);
        let arr = MDataKeysArray(arrPtr);
        for (let i = 0; i < len ; i++) {
          const currKey = arr[i];
          const keyStr = ref.reinterpret(currKey.val_ptr, currKey.val_len, 0);
          keysList.push(keyStr);
        }
      }
      return keysList;
    }),
    mdata_list_values: Promisified(toMDataInfo, [ref.refType(MDataValuesArray), t.usize], (args) => {
      const ptr = args[0];
      const len = args[1];
      const valuesList = [];
      if (len > 0) {
        let arrPtr = ref.reinterpret(ptr, MDataValue.size * len);
        let arr = MDataValuesArray(arrPtr);
        for (let i = 0; i < len ; i++) {
          const currValue = arr[i];
          const valueStr = ref.reinterpret(currValue.content_ptr, currValue.content_len, 0);
          valuesList.push({ buf: valueStr, version: currValue.entry_version });
        }
      }
      return valuesList;
    }),
    mdata_mutate_entries: Promisified(toMDataInfo, []),
    mdata_list_permissions: Promisified(toMDataInfo, MDataPermissionsHandle),
    mdata_list_user_permissions: Promisified(toMDataInfo, t.PermissionSetPtr, readPermissionSetPtr),
    mdata_set_user_permissions: Promisified((appPtr, mDataInfoObj, signKeyHandle, permSet, version) => {
        const permSetObj = h.makePermissionSet(permSet);
        const mDataInfo = makeMDataInfo(mDataInfoObj);
        return [appPtr, mDataInfo.ref(), signKeyHandle, permSetObj.ref(), version];
      }, []),
    mdata_del_user_permissions: Promisified(toMDataInfo, []),
    mdata_entry_actions_new: Promisified(null, MDataEntryActionsHandle),
    mdata_entry_actions_insert: Promisified(strToBuffer, []),
    mdata_entry_actions_update: Promisified(strToBufferButLastEntry, []),
    mdata_entry_actions_delete: Promisified(strToBufferButLastEntry, []),
    mdata_entry_actions_free: Promisified(null, []),
    mdata_entries_new: Promisified(null, MDataEntriesHandle),
    mdata_entries_insert: Promisified(strToBuffer, []),
    mdata_entries_len: Promisified(null, t.usize),
    mdata_entries_get: Promisified(strToBuffer, valueVersionType, readValueToBuffer),
    mdata_entries_for_each: PromisifiedForEachCb(keyValueCallBackLastEntry.bind(null,
          ['pointer', t.u8Pointer, t.usize, t.u8Pointer, t.usize, t.u64]), []),
    mdata_entries_free: Promisified(null, []),
    mdata_encode_metadata: Promisified((metadata) => {
      return [ref.alloc(UserMetadata, metadata)];
    }, [t.u8Pointer, t.usize], (args) => {
      return ref.isNull(args[0]) ? args[0] : new Buffer(ref.reinterpret(args[0], args[1], 0))
    }),
  }
};

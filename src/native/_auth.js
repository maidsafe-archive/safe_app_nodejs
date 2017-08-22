const ffi = require('ffi');
const Enum = require('enum');
const ArrayType = require('ref-array');
const ref = require('ref');
const Struct = require('ref-struct');
const base = require('./_base.js');
const makeFfiError = require('./_error.js');

const t = base.types;
const AppPtr = t.AppPtr;
const helpers = base.helpers;

const AppExchangeInfo = Struct({
  id: 'string',
  scope: 'string',
  name: 'string',
  vendor: 'string'
});

const PermissionSet = Struct({
  Read: t.bool,
  Insert: t.bool,
  Update: t.bool,
  Delete: t.bool,
  ManagePermissions: t.bool
});

const ContainerPermissions = Struct({
  cont_name: 'string',
  access: PermissionSet
});

const ContainerPermissionsArray = new ArrayType(ContainerPermissions);

/// For use in `ShareMDataReq`. Represents a specific `MutableData` that is being shared.
const ShareMData = Struct({
  type_tag: t.u64,
  name: t.XOR_NAME,
  access: PermissionSet
});

const ShareMDataArray = new ArrayType(ShareMData);

const AuthReq = Struct({
  app: AppExchangeInfo,
  app_container: ref.types.bool,
  containers: ContainerPermissionsArray,
  containers_len: t.usize,
  containers_cap: t.usize
});

const ContainerReq = Struct({
  app: AppExchangeInfo,
  containers: ContainerPermissionsArray,
  containers_len: t.usize,
  containers_cap: t.usize
});

/// Represents a request to share mutable data
const ShareMDataReq = Struct({
  /// Info about the app requesting shared access
  app: AppExchangeInfo,
  /// List of MD names & type tags and permissions that need to be shared
  mdata: ShareMDataArray,
  /// Length of the mdata array
  mdata_len: t.usize,
});

const AppKeys = Struct({
  // /// Owner signing public key
  // pub owner_key: [u8; sign::PUBLICKEYBYTES],
  owner_key: t.KEYBYTES,
  // /// Data symmetric encryption key
  // pub enc_key: [u8; secretbox::KEYBYTES],
  enc_key: t.KEYBYTES,
  // /// Asymmetric sign public key.
  // ///
  // /// This is the identity of the App in the Network.
  // pub sign_pk: [u8; sign::PUBLICKEYBYTES],
  sign_pk: t.KEYBYTES,
  // /// Asymmetric sign private key.
  // pub sign_sk: [u8; sign::SECRETKEYBYTES],
  sign_sk: t.SIGN_SECRETKEYBYTES,
  // /// Asymmetric enc public key.
  // pub enc_pk: [u8; box_::PUBLICKEYBYTES],
  enc_pk: t.KEYBYTES,
  // /// Asymmetric enc private key.
  // pub enc_sk: [u8; box_::SECRETKEYBYTES],
  enc_sk: t.KEYBYTES
})

const AccessContInfo = Struct({
  // /// ID
  // pub id: [u8; XOR_NAME_LEN],
  id: t.XOR_NAME,
  // /// Type tag
  // pub tag: u64,
  tag: t.u64,
  // /// Nonce
  // pub nonce: [u8; secretbox::NONCEBYTES],
  nonce: t.NONCEBYTES

});

const AuthGranted = Struct({
  app_keys: AppKeys,
  access_container: AccessContInfo,
  // /// Crust's bootstrap config
  //pub bootstrap_config_ptr: *mut u8,
  bootstrap_config_ptr: t.u8Pointer,
  // /// `bootstrap_config`'s length
  //pub bootstrap_config_len: usize,
  bootstrap_config_len: t.usize,
  // /// Used by Rust memory allocator
  //pub bootstrap_config_cap: usize,
  bootstrap_config_cap: t.usize
});

function makeAppInfo(appInfo) {
  return new AppExchangeInfo({
    id: appInfo.id,
    scope: appInfo.scope || ref.NULL,
    name: appInfo.name,
    vendor: appInfo.vendor
  });
}

function translateXorName(str) {
  const b = new Buffer(str);
  if (b.length != 32) throw Error("XOR Names _must be_ 32 bytes long.")
  return t.XOR_NAME(b);
}

function makePermissionsSet(perms) {
  const permsObj = new PermissionSet({
    Read: false,
    Insert: false,
    Update: false,
    Delete: false,
    ManagePermissions: false
  });
  perms.map((x) => {
    permsObj[x] = true;
  });
  return permsObj;
}

function makePermissions(perms) {
  return new ContainerPermissionsArray(Object.getOwnPropertyNames(perms).map((key) => {
    const permArray = makePermissionsSet(perms[key]);
    return ContainerPermissions({
      cont_name: key,
      access: permArray
    });
  }));
}

function makeShareMDataPermissions(permissions) {
  return new ShareMDataArray(permissions.map((perm) => {
    const permsArray = makePermissionsSet(perm.perms);
    return ShareMData({
      type_tag: perm.type_tag,
      name: translateXorName(perm.name),
      access: permsArray
    });
  }));
}

function remapEncodeValues(resp) {
  return {
    'req_id': resp[0],
    'uri': helpers.fromCString(resp[1])
  }
}

module.exports = {
  types : {
    // request
    AuthReq,
    ContainerReq,
    ShareMDataReq,
    // response
    AuthGranted,
    AccessContInfo,
    AppKeys,
  },
  functions: {
    encode_auth_req: [t.Void, [ ref.refType(AuthReq), 'pointer', 'pointer'] ],
    encode_containers_req: [t.Void, [ref.refType(ContainerReq), 'pointer', 'pointer'] ],
    encode_share_mdata_req: [t.Void, [ref.refType(ShareMDataReq), 'pointer', 'pointer'] ],
    encode_unregistered_req: [t.Void, ['pointer', 'pointer'] ],
    decode_ipc_msg: [t.Void, [
                      'string', //  (msg: *const c_char,
                      t.VoidPtr, // user_data: *mut c_void,
                      'pointer', // o_auth: extern "C" fn(*mut c_void, u32, FfiAuthGranted),
                      'pointer', // o_unregistered: extern "C" fn(*mut c_void, u32, *const u8, usize),
                      'pointer', // o_containers: extern "C" fn(*mut c_void, u32),
                      'pointer', // o_share_mdata: extern "C" fn(*mut c_void, u32),
                      'pointer', // o_revoked: extern "C" fn(*mut c_void),
                      'pointer'  // o_err: extern "C" fn(*mut c_void, i32, u32)
                      ] ],
    // access container:
    // app: *const App, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32, *const ContainerPermissions, usize))
    access_container_fetch: [t.Void, [AppPtr, 'pointer', 'pointer']],
    // app: *const App, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32)
    access_container_refresh_access_info: [t.Void, [AppPtr, 'pointer', 'pointer']],
    // app: *const App, name: FfiString, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32, MDataInfoHandle)
    access_container_get_container_mdata_info: [t.Void, [AppPtr, 'string', 'pointer', 'pointer']],
  },
  helpers: {
    makeAppInfo,
    makePermissions,
    makeShareMDataPermissions,
  },
  api: {
    access_container_fetch: helpers.Promisified(null, [ref.refType(ContainerPermissions), t.usize], (args) => {
      const ptr = args[0];
      const len = args[1];
      let arrPtr = ref.reinterpret(ptr, ContainerPermissions.size * len);
      let arr = ContainerPermissionsArray(arrPtr)
      const contsPerms = {};
      for (let i = 0; i < len ; i++) {
        let cont = arr[i];
        contsPerms[cont.cont_name] = {
          Read: cont.access.Read,
          Insert: cont.access.Insert,
          Update: cont.access.Update,
          Delete: cont.access.Delete,
          ManagePermissions: cont.access.ManagePermissions
        }
      }
      return contsPerms;
    }),
    access_container_refresh_access_info: helpers.Promisified(),
    access_container_get_container_mdata_info: helpers.Promisified((app, str) =>
      [app, str], 'pointer'),
    encode_containers_req: helpers.Promisified(null, ['uint32', 'char *'], remapEncodeValues),
    encode_auth_req: helpers.Promisified(null, ['uint32', 'char *'], remapEncodeValues),
    encode_share_mdata_req: helpers.Promisified(null, ['uint32', 'char *'], remapEncodeValues),
    encode_unregistered_req: helpers.Promisified(null, ['uint32', 'char *'], remapEncodeValues),
    decode_ipc_msg: function(lib, fn) {
      return (function(str) {
        return new Promise(function(resolve, reject) {
          fn.async(str,
                   ref.NULL,
                   ffi.Callback('void', [t.VoidPtr, 'uint32', ref.refType(AuthGranted)], function(user_data, req_id, authGranted) {
                      resolve(["granted", authGranted])
                   }),
                   ffi.Callback('void', [t.VoidPtr, 'uint32', t.u8Pointer, t.usize], function(user_data, req_id, connUri, connUriLen) {
                      resolve(["unregistered", new Buffer(ref.reinterpret(connUri, connUriLen, 0))])
                   }),
                   ffi.Callback('void', [t.VoidPtr, 'uint32'], function(user_data, req_id) {
                      resolve(["containers", req_id])
                   }),
                   ffi.Callback('void', [t.VoidPtr, 'uint32'], function(user_data, req_id) {
                      resolve(["share_mdata", req_id])
                   }),
                   ffi.Callback('void', [t.VoidPtr], function(user_data) {
                      resolve(["revoked"])
                   }),
                   ffi.Callback('void', [t.VoidPtr, t.FfiResult, 'uint32'], function(user_data, result, req_id) {
                      reject(makeFfiError(result.error_code, result.error_description))
                   }),
                   function () {}
              )
        })
      })
    }
  }
}

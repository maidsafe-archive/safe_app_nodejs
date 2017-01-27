const ffi = require('ffi');
const Enum = require('enum');
const ArrayType = require('ref-array');
const ref = require('ref');
const Struct = require('ref-struct');
const base = require('./_base.js');

const t = base.types;
const AppPtr = t.AppPtr;
const helpers = base.helpers;

const Permission = new Enum({
  Read: 0,
  Insert: 1,
  Update: 2,
  Delete: 3,
  ManagePermissions: 4
});

const AppExchangeInfo = Struct({
  id: 'string',
  scope: 'string',
  name: 'string',
  vendor: 'string'
});

const Permissions = new ArrayType(Permission);

const ContainerPermissions = Struct({
  cont_name: 'string',
  access: Permissions,
  // /// Number of elements
  access_len: t.usize,
  // /// Reserved by Rust allocator
  access_cap: t.usize
});

const ContainerPermissionsArray = new ArrayType(ContainerPermissions);

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

const AppKeys = Struct({
  // /// Owner signing public key
  // pub owner_key: [u8; sign::PUBLICKEYBYTES],
  owner_key: t.u8Array,
  // /// Data symmetric encryption key
  // pub enc_key: [u8; secretbox::KEYBYTES],
  enc_key: t.u8Array,
  // /// Asymmetric sign public key.
  // ///
  // /// This is the identity of the App in the Network.
  // pub sign_pk: [u8; sign::PUBLICKEYBYTES],
  sign_pk: t.u8Array,
  // /// Asymmetric sign private key.
  // pub sign_sk: [u8; sign::SECRETKEYBYTES],
  sign_sk: t.u8Array,
  // /// Asymmetric enc public key.
  // pub enc_pk: [u8; box_::PUBLICKEYBYTES],
  enc_pk: t.u8Array,
  // /// Asymmetric enc private key.
  // pub enc_sk: [u8; box_::SECRETKEYBYTES],
  enc_sk: t.u8Array
})

const AccessContInfo = Struct({
  // /// ID
  // pub id: [u8; XOR_NAME_LEN],
  id: t.u8Array,
  // /// Type tag
  // pub tag: u64,
  tag: t.u64,
  // /// Nonce
  // pub nonce: [u8; secretbox::NONCEBYTES],
  nonce: t.u8Array

});

const AuthGranted = Struct({
  app_keys: AppKeys,
  access_container: AccessContInfo
});

function makeAppInfo(appInfo) {
  return new AppExchangeInfo({
    id: appInfo.id,
    scope: appInfo.scope || ref.NULL,
    name: appInfo.name,
    vendor: appInfo.vendor
  });
}

function makePermissions(perms) {
  return new ContainerPermissionsArray(Object.getOwnPropertyNames(perms).map((key) => {
    // map to the proper enum
    const permArray = new Permissions(perms[key].map((x) => Permission.get(x)));
    return ContainerPermissions({
      cont_name: key,
      access: permArray,
      access_len: permArray.length, 
      access_cap: permArray.length
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
    // response
    AuthGranted,
    AccessContInfo,
    AppKeys,
  },
  functions: {
    encode_auth_req: [t.i32, [ ref.refType(AuthReq), 'pointer', 'pointer'] ],
    encode_containers_req: [t.i32, [ref.refType(ContainerReq), 'pointer', 'pointer'] ],
    decode_ipc_msg: [t.Void, [
                      "string", //  (msg: *const c_char,
                      "pointer", // user_data: *mut c_void,
                      "pointer", // o_auth: extern "C" fn(*mut c_void, u32, FfiAuthGranted),
                      "pointer", // o_containers: extern "C" fn(*mut c_void, u32),
                      "pointer", // o_revoked: extern "C" fn(*mut c_void),
                      "pointer"  // o_err: extern "C" fn(*mut c_void, i32, u32)
                      ] ],
    // access container:
    // app: *const App, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32)
    access_container_refresh_access_info: [t.Void, [AppPtr, "pointer", "pointer"]],
    // app: *const App, name: FfiString, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32, MDataInfoHandle)
    access_container_get_container_mdata_info: [t.Void, [AppPtr, 'string', "pointer", "pointer"]],
    // (app: *const App, name: FfiString, permission: Permission, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32, bool)) {
    access_container_is_permitted: [t.Void, [AppPtr, 'string', ContainerPermissionsArray, "pointer", "pointer"]],
  },
  helpers: {
    makeAppInfo,
    makePermissions,
  },
  api: {
    access_container_refresh_access_info: helpers.Promisified(),
    access_container_get_container_mdata_info: helpers.Promisified((app, str) =>
      [app, str], 'pointer'),
    access_container_is_permitted: helpers.Promisified((app, str, perms) => {
      const v = new PermissionsType((perms, ['Read']).map((x) => Permission.get(x)));
      const permArray = Permissions({ ptr: v, len: v.length, cap: v.length });
      return [app, str, permArray]
    }, t.bool),
    encode_containers_req: helpers.Promisified(null, ['uint32', 'char *'], remapEncodeValues),
    encode_auth_req: helpers.Promisified(null, ['uint32', 'char *'], remapEncodeValues),
    decode_ipc_msg: function(lib, fn) {
      return (function(str) {
        return new Promise(function(resolve, reject) {
          fn.async(str,
                   ref.NULL,
                   ffi.Callback("void", ["uint32", FfiAuthGranted], function(e, authGranted) {
                      resolve(["granted", authGranted])
                   }),
                   ffi.Callback("void", ["uint32"], function(e) {
                      resolve(["containers", e])
                   }),
                   ffi.Callback("void", [], function() {
                      resolve(["revoked"])
                   }),

                   ffi.Callback("void", ["uint32", "i32"], function(code, msg) {
                      reject([code, msg])
                   })
              )
        })
      })
    }
  }
}

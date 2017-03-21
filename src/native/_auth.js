const fastcall = require('fastcall');
const ffi = fastcall.ffi;
const Enum = require('enum');
const ArrayType = fastcall.ArrayType;
const ref = fastcall.ref;
const Struct = fastcall.StructType;
const base = require('./_base.js');

const t = base.types;
const h = base.helpers;
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
  callbacks: {
    EncodedStrCB: h.expectCallback('uint32', 'char *'),
    BoolCB: h.expectCallback('bool')
  },
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
    encode_auth_req: [t.i32, [ ref.refType(AuthReq), 'pointer', 'EncodedStrCB'] ],
    encode_containers_req: [t.i32, [ref.refType(ContainerReq), 'pointer', 'EncodedStrCB'] ],
    decode_ipc_msg: [t.Void, [
                      "string", //  (msg: *const c_char,
                      t.VoidPtr, // user_data: *mut c_void,
                      "pointer", // o_auth: extern "C" fn(*mut c_void, u32, FfiAuthGranted),
                      "pointer", // o_containers: extern "C" fn(*mut c_void, u32),
                      "pointer", // o_revoked: extern "C" fn(*mut c_void),
                      "pointer"  // o_err: extern "C" fn(*mut c_void, i32, u32)
                      ] ],
    // access container:
    // app: *const App, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32)
    access_container_refresh_access_info: [t.Void, [AppPtr, "pointer", "EmptyCB"]],
    // app: *const App, name: FfiString, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32, MDataInfoHandle)
    access_container_get_container_mdata_info: [t.Void, [AppPtr, 'string', "pointer", "ObjectHandleCB"]],
    // (app: *const App, name: FfiString, permission: Permission, user_data: *mut c_void, o_cb: extern "C" fn(*mut c_void, i32, bool)) {
    access_container_is_permitted: [t.Void, [AppPtr, 'string', ContainerPermissionsArray, "pointer", "BoolCB"]],
  },
  helpers: {
    makeAppInfo,
    makePermissions,
  },
  api: {
    access_container_is_permitted: helpers.Promisified((app, str, perms) => {
      const permArray = new Permissions((perms, ['Read']).map((x) => Permission.get(x)));
      return [app, str, permArray]
    }, t.bool),
    encode_containers_req: helpers.Promisified(null, remapEncodeValues),
    encode_auth_req: helpers.Promisified(null, remapEncodeValues),
    decode_ipc_msg: function(lib, fn) {
      return (function(str) {
        return new Promise(function(resolve, reject) {
          fn.async(str,
                   ref.NULL,
                   ffi.Callback("void", [t.VoidPtr, "uint32", ref.refType(AuthGranted)], function(user_data, req_id, authGranted) {
                      resolve(["granted", authGranted])
                   }),
                   ffi.Callback("void", [t.VoidPtr, "uint32"], function(user_data, req_id) {
                      resolve(["containers", req_id])
                   }),
                   ffi.Callback("void", [t.VoidPtr], function(user_data) {
                      resolve(["revoked"])
                   }),
                   ffi.Callback("void", [t.VoidPtr, t.i32, "uint32"], function(user_data, code, msg) {
                      reject([code, msg])
                   }),
                   function () {}
              )
        })
      })
    }
  }
}

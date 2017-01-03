const ffi = require('ffi');
const ref = require('ref');
const Struct = require('ref-struct');
const base = require('./_base');
const t = base.types;
const make_ffi_string = base.helpers.make_ffi_string;

// FIXME: how do we do enums?

/// Permission action
// pub enum Permission {
//     /// Read
//     Read,
//     /// Insert
//     Insert,
//     /// Update
//     Update,
//     /// Delete
//     Delete,
//     /// Modify permissions
//     ManagePermissions,
// }

const AppExchangeInfo = Struct({
  id: t.FfiString,
  scope: t.u8,
  scope_len: t.usize,
  scope_cap: t.usize,
  name: t.FfiString,
  vendor: t.FfiString
});

const PermissionArray = Struct({
  // /// Pointer to first byte
  // pub ptr: *mut Permission,
  // /// Number of elements
  len: t.usize,
  // pub len: usize,
  // /// Reserved by Rust allocator
  // pub cap: usize,
  cap: t.usize
})

const ContainerPermissions = Struct({
  cont_name: t.FfiString,
  access: PermissionArray

});

const ContainerPermissionsArray = Struct({
  // /// Pointer to first byte
  // pub ptr: *mut ContainerPermissions,
  // /// Number of elements
  // pub len: usize,
  // /// Reserved by Rust allocator
  // pub cap: usize,
  len: t.usize,
  cap: t.usize
});


const AuthReq = Struct({
  app: AppExchangeInfo,
  app_container: ref.types.bool,
  containers: ContainerPermissionsArray
});

const ContainerReq = Struct({
  app: AppExchangeInfo,
  containers: ContainerPermissionsArray
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




module.exports = {
  types : {
    // request
    AuthReq: AuthReq,
    ContainerReq: ContainerReq,
    PermissionArray: PermissionArray,
    ContainerPermissions: ContainerPermissions,
    ContainerPermissionsArray: ContainerPermissionsArray,
    // response
    AuthGranted: AuthGranted,
    AccessContInfo: AccessContInfo,
    AppKeys: AppKeys
  },
  functions: {
    // request
    auth_request_drop: [t.Void , [AuthReq] ],
    // containers_req_drop: [t.Void  [ContainerReq] ],
    app_exchange_info_drop: [t.Void, [AppExchangeInfo] ],
    container_permissions_drop: [t.Void, [ContainerPermissions] ],
    container_permissions_array_free: [t.Void, [ContainerPermissionsArray] ],
    permission_array_free: [t.Void, [PermissionArray] ],
    // // response
    auth_granted_drop: [t.Void, [AuthGranted] ],
    app_keys_drop: [t.Void, [AppKeys] ],
    access_container_drop: [t.Void, [AccessContInfo] ],
    // // ipc
    // encode_auth_req: [t.i32, [AuthReq, t.u32Ptr, t.FfiString ] ],
    // encode_containers_req: [t.i32, [ContainerReq, t.u32Ptr, t.FfiString] ],
    decode_ipc_msg: [t.Void, [
                      "pointer", //  (msg: FfiString,
                      "pointer", // user_data: *mut c_void,
                      "pointer", // o_auth: extern "C" fn(*mut c_void, u32, FfiAuthGranted),
                      "pointer", // o_containers: extern "C" fn(*mut c_void, u32),
                      "pointer", // o_revoked: extern "C" fn(*mut c_void),
                      "pointer"  // o_err: extern "C" fn(*mut c_void, i32, u32)
                      ] ]
  },
  api: {
    decode_ipc_msg: function(lib, fn) {
      return (function(str) {
        let ffi_str = make_ffi_string(str);
        return new Promise(function(resolve, reject) {
          fn.async(ffi_str,
                   ref.NULL,
                   ffi.Callback("void", ["u32", FfiAuthGranted], function(e, authGranted) {
                      resolve("granted", authGranted)
                   }),
                   ffi.Callback("void", ["u32"], function(e) {
                      resolve("containers", e)
                   }),
                   ffi.Callback("void", [], function() {
                      resolve("revoked")
                   }),

                   ffi.Callback("void", ["u32", "i32"], function(code, msg) {
                      reject(code, msg)
                   })
              )
        }).done(res => {
          lib.ffi_string_free(ffi_str);
          res;
        }, reason => {
          lib.ffi_string_free(ffi_str);
          Promise.reject(reason);
        })
      })
    }
  // },
  // helpers : {
  // 
  }
}

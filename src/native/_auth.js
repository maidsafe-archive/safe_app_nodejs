const ffi = require('ffi');
const Enum = require('enum');
const ArrayType = require('ref-array');
const ref = require('ref');
const Struct = require('ref-struct');
const base = require('./_base.js');
const t = base.types;
const helpers = base.helpers;
const makeFfiString = base.helpers.makeFfiString;

const Permission = new Enum({
  Read: 0,
  Insert: 1,
  Update: 2,
  Delete: 3,
  ManagePermissions: 4
});

const AppExchangeInfo = Struct({
  id: t.FfiString,
  scope: t.u8Pointer,
  scope_len: t.usize,
  scope_cap: t.usize,
  name: t.FfiString,
  vendor: t.FfiString
});

const PermissionArrayType = new ArrayType(Permission);

const PermissionArray = Struct({
  // /// Pointer to first byte
  ptr: PermissionArrayType,
  // /// Number of elements
  len: t.usize,
  // /// Reserved by Rust allocator
  cap: t.usize
});

const ContainerPermissions = Struct({
  cont_name: t.FfiString,
  access: PermissionArray
});

const ContainersPermissionArrayType = new ArrayType(ContainerPermissions);

const ContainerPermissionsArray = Struct({
  // /// Pointer to first byte
  ptr: ContainersPermissionArrayType,
  // /// Number of elements
  len: t.usize,
  // /// Reserved by Rust allocator
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

function makeAppInfo(appInfo) {
  if (appInfo.scope) {
    const scope = new Buffer(appInfo.scope);
    return new AppExchangeInfo({
      id: makeFfiString(appInfo.id),
      scope: scope,
      scope_len: scope.length,
      scope_cap: scope.length,
      name: makeFfiString(appInfo.name),
      vendor: makeFfiString(appInfo.vendor)
    });
  }

  return new AppExchangeInfo({
    id: makeFfiString(appInfo.id),
    scope: ref.NULL,
    scope_len: 0,
    scope_cap: 0,
    name: makeFfiString(appInfo.name),
    vendor: makeFfiString(appInfo.vendor)
  });
}

function makePermissions(perms) {
  const permissions = new ContainersPermissionArrayType(Object.getOwnPropertyNames(perms).map((key) => {
    // map to the proper enum
    const v = new PermissionArrayType(perms[key].map((x) => Permission.get(x)));
    const permArray = PermissionArray({ ptr: v, len: v.length, cap: v.length });
    return ContainerPermissions({
      cont_name: makeFfiString(key),
      access: permArray
    });
  }));

  return ContainerPermissionsArray({
    ptr: permissions,
    len: permissions.length,
    cap: permissions.length
  });
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
    encode_auth_req: [t.i32, [ AuthReq, ref.refType(ref.types.uint32), t.FfiStringPointer ] ],
    encode_containers_req: [t.i32, [ContainerReq, ref.refType(ref.types.uint32), t.FfiStringPointer] ],
    decode_ipc_msg: [t.Void, [
                      "pointer", //  (msg: FfiString,
                      "pointer", // user_data: *mut c_void,
                      "pointer", // o_auth: extern "C" fn(*mut c_void, u32, FfiAuthGranted),
                      "pointer", // o_containers: extern "C" fn(*mut c_void, u32),
                      "pointer", // o_revoked: extern "C" fn(*mut c_void),
                      "pointer"  // o_err: extern "C" fn(*mut c_void, i32, u32)
                      ] ]
  },
  helpers: {
    makeAppInfo,
    makePermissions,
  },
  api: {
    encode_containers_req: function(lib, fn) {
      return (function(ctnrs) {
        const reqId = ref.alloc(ref.types.uint32);
        const b = ref.alloc(t.FfiString);
        fn(ctnrs, reqId, b);
        return helpers.read_string(b);
      });
    },
    encode_auth_req: function(lib, fn) {
      return (function(auth) {
        const reqId = ref.alloc(ref.types.uint32);
        const b = ref.alloc(t.FfiString);
        fn(auth, reqId, b);
        return helpers.read_string(b);
      });
    },
    decode_ipc_msg: function(lib, fn) {
      return (function(str) {
        let ffi_str = makeFfiString(str);
        return new Promise(function(resolve, reject) {
          fn.async(ffi_str,
                   ref.NULL,
                   ffi.Callback("void", ["u32", FfiAuthGranted], function(e, authGranted) {
                      resolve(["granted", authGranted])
                   }),
                   ffi.Callback("void", ["u32"], function(e) {
                      resolve(["containers", e])
                   }),
                   ffi.Callback("void", [], function() {
                      resolve(["revoked"])
                   }),

                   ffi.Callback("void", ["u32", "i32"], function(code, msg) {
                      reject([code, msg])
                   })
              )
        }).done(res => {
          // FIXME: freeing strings fails currently
          // lib.ffi_string_free(ffi_str);
          res;
        }, reason => {
          // FIXME: freeing strings fails currently
          // lib.ffi_string_free(ffi_str);
          Promise.reject(reason);
        })
      })
    }
  }
}

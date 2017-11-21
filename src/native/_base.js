const makeFfiError = require('./_error.js');
const ffi = require('ffi');
const ref = require('ref');
const Enum = require('enum');
const Struct = require('ref-struct');
const ArrayType = require('ref-array');

const i32 = ref.types.int32;
const u32 = ref.types.uint32;
const u8 = ref.types.uint8;
const i64 = ref.types.int64;
const u64 = ref.types.uint64;
const u8Pointer = ref.refType(u8);
const Void = ref.types.void;
const VoidPtr = ref.refType(Void);
const usize = ref.types.size_t;
const bool = ref.types.bool;
const NULL = ref.types.NULL;
const CString = ref.types.CString;

const u8Array = ArrayType(u8);
const XOR_NAME = ArrayType(u8, 32);
const KEYBYTES = ArrayType(u8, 32);
const SIGN_SECRETKEYBYTES = ArrayType(u8, 64);
const NONCEBYTES = ArrayType(u8, 24);
const SYM_SECRET_KEY = ArrayType(u8, 64);
const SYM_NONCE = ArrayType(u8, 24);

const ObjectHandle = u64;
const App = Struct({});
const AppPtr = ref.refType(App);

const validPerms = new Enum({
  Read: 0,
  Insert: 1,
  Update: 2,
  Delete: 3,
  ManagePermissions: 4
});

const validatePermission = (perm) => {
  if (!validPerms.get(perm)) throw Error(`'${perm}' is not a valid permission`);
}

const FfiResult = Struct({
  error_code: i32,
  error_description: 'string'
});

const FfiResultPtr = ref.refType(FfiResult);

const PermissionSet = Struct({
  Read: bool,
  Insert: bool,
  Update: bool,
  Delete: bool,
  ManagePermissions: bool
});

const PermissionSetPtr = ref.refType(PermissionSet);

const makeFfiResult = (resultPtr) => {
  const ffiResult = resultPtr.deref();
  return {
    error_code: ffiResult.error_code,
    error_description: ffiResult.error_description
  };
}

// Internal helper functions
const normaliseTypes = (rTypes) => {
  let types = ['pointer', FfiResultPtr]; // we always have: user_data and FfiResultPtr
  if (Array.isArray(rTypes)) {
    types = [...types, ...rTypes];
  } else if (rTypes) {
    types.push(rTypes);
  }
  return types;
}

const callLibFn = (fn, args, types, postProcess) => {
  return new Promise((resolve, reject) => {
    // append the callback to receive the result to the args
    args.push(ffi.Callback("void", types,
        (uctx, resultPtr, ...restArgs) => {
          const result = makeFfiResult(resultPtr);
          if (result.error_code !== 0) {
            // error found, errback with translated error
            return reject(makeFfiError(result.error_code, result.error_description));
          }

          let res;
          if (postProcess) {
            // we are post-processing the entry
            res = postProcess(restArgs);
          } else if (types.length === 3){
            // no post-processing but given only one
            // item given, use instead of array.
            res = restArgs[0];
          } else {
            res = [...restArgs];
          }
          resolve(res);
        }));

    // and call the function
    fn(...args);
  });
}
module.exports = {
  types: {
    App,
    AppPtr,
    FfiResult,
    FfiResultPtr,
    PermissionSet,
    PermissionSetPtr,
    ObjectHandle,
    XOR_NAME,
    KEYBYTES,
    SIGN_SECRETKEYBYTES,
    NONCEBYTES,
    SYM_SECRET_KEY,
    SYM_NONCE,
    VoidPtr,
    i32,
    u32,
    bool,
    i64,
    u64,
    u8,
    u8Array,
    u8Pointer,
    Void,
    usize,
    NULL,
    CString
  },
  helpers: {
    fromCString: (cstr) => cstr.readCString(),
    asBuffer: (res) => {
      let b = ref.isNull(res[0]) ? new Buffer(0) : new Buffer(ref.reinterpret(res[0], res[1]));
      return b;
    },
    toSafeLibTime: (now) => {
      const now_msec = now.getTime();
      const now_msec_part = (now_msec % 1000);
      const now_sec_part = (now_msec - now_msec_part) / 1000;
      const now_nsec_part = 1000000 * now_msec_part;
      return {now_sec_part, now_nsec_part};
    },
    fromSafeLibTime: (sec, nsec_part) => {
      let d = new Date();
      d.setTime((sec * 1000) + (nsec_part / 1000000));
      return d;
    },
    makePermissionSet: (perms) => {
      const permsObj = new PermissionSet({
        Read: false,
        Insert: false,
        Update: false,
        Delete: false,
        ManagePermissions: false
      });
      perms.map((perm) => {
        validatePermission(perm);
        permsObj[perm] = true;
      });
      return permsObj;
    },
    makeFfiResult,
    Promisified: (formatter, rTypes, after) => {
      // create internal function that will be
      // invoked on top of the direct binding
      // mixing a callback into the arguments
      // and returning a promise
      return (lib, fn) => ((...varArgs) => {
        // the internal function that wraps the actual function call
        // compile the callback-types-definiton
        let args;
        let types = normaliseTypes(rTypes);

        return new Promise((resolve, reject) => {
          // if there is a formatter, we are reformatting
          // the incoming arguments first
          try {
            args = formatter ? formatter(...varArgs): [...varArgs];
          } catch(err) {
            // reject promise if error is thrown by the formatter
            return reject(err);
          }

          // append just user-context to the argument since the
          // result callback is appended and handled by callLibFn
          args.push(ref.NULL);
          return callLibFn(fn, args, types, after)
            .then(resolve)
            .catch(reject);
        });
      });
    },
    PromisifiedForEachCb: (formatter, rTypes) => {
      // This is similar to the function returned by the Promisifed function
      // above, with the difference being that it expects a callback function
      // as the last parameter which is passed down to the lib's function
      // as the next to last parameter, and it doesn't support a post-processing
      // function for the returned values.
      return (lib, fn) => ((...varArgs) => {
        // the internal function that wraps the actual function call
        // compile the callback-types-definiton
        let args;
        let types = normaliseTypes(rTypes);

        return new Promise((resolve, reject) => {
          // if there is a formatter, we are reformatting
          // the incoming arguments first
          try {
            args = formatter ? formatter(...varArgs): [...varArgs];
          } catch(err) {
            // reject promise if error is thrown by the formatter
            return reject(err);
          }

          // append user-context and callbacks to the arguments,
          // and the last argument we receive is the callback function
          // to be passed as argument right after the user-context pointer but
          // before the result calback (which is added and handlded by callLibFn)
          let callback = args[args.length - 1];
          args = Array.prototype.slice.call(args, 0, args.length - 1);
          args.push(ref.NULL);
          args.push(callback);
          return callLibFn(fn, args, types, null)
            .then(resolve)
            .catch(reject);
        });
      });
    }
  }
}

const makeFfiError = require('./_error.js');
const ffi = require('ffi');
const ref = require('ref');
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

const ObjectHandle = u64;
const App = Struct({});
const AppPtr = ref.refType(App);

const FfiResult = Struct({
  error_code: i32,
  error_description: 'string'
});

module.exports = {
  types: {
    App,
    AppPtr,
    FfiResult,
    ObjectHandle,
    XOR_NAME,
    KEYBYTES,
    SIGN_SECRETKEYBYTES,
    NONCEBYTES,
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
    Promisified: function(formatter, rTypes, after) {
      // create internal function that will be
      // invoked ontop of the direct binding
      // mixing a callback into the arguments
      // and returning a promise
      return (lib, fn) => (function() {
        // the internal function that wraps the
        // actual function call

        // compile the callback-types-definiton
        let args;
        let types = ['pointer', FfiResult]; // we always have: user_context and FfiResult
        if (Array.isArray(rTypes)) {
          types = types.concat(rTypes);
        } else if (rTypes) {
          types.push(rTypes);
        }
        return new Promise((resolve, reject) => {
          // if there is a formatter, we are reformatting
          // the incoming arguments first
          try {
            args = formatter ? formatter.apply(formatter, arguments): Array.prototype.slice.call(arguments);
          } catch(err) {
            // reject promise if error is thrown by the formatter
            return reject(err);
          }

          // append user-context and callback
          // to the arguments
          args.push(ref.NULL);
          args.push(ffi.Callback("void", types,
              function(uctx, err) {
                // error found, errback with translated error
                if (err.error_code !== 0) return reject(makeFfiError(err.error_code, err.error_description));

                // take off the ctx and error
                let res = Array.prototype.slice.call(arguments, 2)
                if (after) {
                  // we are post-processing the entry
                  res = after(res);
                } else if (types.length === 3){
                  // no post-processing but given only one
                  // item given, use instead of array.
                  res = arguments[2]
                }
                resolve(res);
              }));
          // and call the function
          fn.apply(fn, args);
        });
      });
    }
  }
}

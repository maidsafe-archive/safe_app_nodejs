const makeFfiError = require('./_error.js');
const ffi = require('ffi');
const ref = require('ref');
const Struct = require('ref-struct');
const ArrayType = require('ref-array');

const i32 = ref.types.int32;
const u8 = ref.types.uint8;
const u64 = ref.types.uint64;
const u8Pointer = ref.refType(u8);
const Void = ref.types.void;
const VoidPtr = ref.refType(Void);
const usize = ref.types.size_t;
const bool = ref.types.bool;
const NULL = ref.types.NULL;

const u8Array = new ArrayType(u8);
const XOR_NAME = new ArrayType(u8, 32); // FIXME: use exported const instead
const KEYBYTES = ArrayType(u8, 32); // FIXME: use exported const instead
const SIGN_SECRETKEYBYTES = ArrayType(u8, 64);
const NONCEBYTES = ArrayType(u8, 32); // I'm not sure if this is the right size or if it's 24

const ObjectHandle = u64;
const App = Struct({});
const AppPtr = ref.refType(App);

module.exports = {
  types: {
    App,
    AppPtr,
    ObjectHandle,
    XOR_NAME,
    KEYBYTES,
    SIGN_SECRETKEYBYTES,
    NONCEBYTES,
    VoidPtr,
    i32,
    bool,
    u64,
    u8,
    u8Array,
    u8Pointer,
    Void,
    usize,
    NULL
  },
  helpers: {
    fromCString: (cstr) => cstr.readCString(),
    asBuffer: (res) => ref.reinterpret(res[0], res[1]),
    asFFIString: function(str) {
      throw Error("Not Supported");
      return [str]
    },
    Promisified: function(formatter, rTypes, after) {
      // create internal function that will be
      // invoked ontop of the direct binding
      // mixing a callback into the arguments
      // and returning a promise
      return (lib, fn) => (function() {
        // the internal function that wraps the
        // actual function call

        // if there is a formatter, we are reformatting
        // the incoming arguments first
        const args = formatter ? formatter.apply(formatter, arguments): Array.prototype.slice.call(arguments);

        // compile the callback-types-definiton
        let types = ['pointer', i32]; // we always have: user_context, error
        if (Array.isArray(rTypes)) {
          types = types.concat(rTypes);
        } else if (rTypes) {
          types.push(rTypes);
        }
        return new Promise((resolve, reject) => {
          // append user-context and callback
          // to the arguments
          args.push(ref.NULL);
          args.push(ffi.Callback("void", types,
              function(uctx, err) {
                // error found, errback with translated error
                if(err !== 0) return reject(makeFfiError(err));

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

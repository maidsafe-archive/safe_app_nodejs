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


const Time = Struct({
  "tm_sec": i32,
  "tm_min": i32,
  "tm_hour": i32,
  "tm_mday": i32,
  "tm_mon": i32,
  "tm_year": i32,
  "tm_wday": i32,
  "tm_yday": i32,
  "tm_isdst": i32,
  "tm_utcoff": i32,
  "tm_nsec": i32,
});

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
    NULL,
    Time
  },
  helpers: {
    fromCString: (cstr) => cstr.readCString(),
    asBuffer: (res) => ref.reinterpret(res[0], res[1]),
    makeCTime: (dt) => new Time({
      "tm_sec": dt.getUTCSeconds(),
      "tm_min": dt.getUTCMinutes(),
      "tm_hour": dt.getUTCHours(),
      "tm_mday": dt.getUTCDate(),
      "tm_mon": dt.getUTCMonth(),
      "tm_year": dt.getUTCFullYear(),
      "tm_wday": dt.getUTCDay(), // yeah, this is the _week_ day
      "tm_yday": 0, // ToDo: Is this  needed?
      "tm_isdst": 0,
      "tm_utcoff": 0,
      "tm_nsec": 0,
    }),
    fromCTime: (ctime) => new Date.UTC(ctime.tm_year, ctime.tm_mon, ctime.mday,
                                  // FIXME: offset handling anyone?
                                  ctime.tm_hour, ctime.tm_min, ctime.tm_sec),
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
        let types = ['pointer', i32]; // we always have: user_context, error
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

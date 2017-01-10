const ref = require("ref");
const Struct = require('ref-struct');
const ArrayType = require('ref-array'); 

const i32 = ref.types.int32;
const u8 = ref.types.uint8; 
const u64 = ref.types.uint64; 
const u8Pointer = ref.refType(u8);
const Void = ref.types.void;
const VoidPtr = ref.refType(Void);
const usize = ref.types.size_t;

const FfiString = new Struct({
  ptr: u8Pointer,
  len: usize,
  cap: usize 
});


const FfiStringPointer = new ref.refType(FfiString);
const u8Array = new ArrayType(u8);



module.exports = {
  types: {
    FfiString: FfiString,
    FfiStringPointer: FfiStringPointer,
    VoidPtr: VoidPtr,
    i32: i32,
    u64: u64,
    u8: u8,
    u8Array: u8Array,
    u8Pointer: u8Pointer,
    Void: Void,
    usize: usize 
  },
  functions: {
    ffi_string_create: [Void, [u8Pointer, usize]],
    ffi_string_free: [Void, [FfiString] ]
  },
  helpers: {
    read_string(ffi_str) {
      const derf = ffi_str.deref();
      return ref.reinterpret(derf.ptr, derf.len).toString();
    },
    makeFfiString: function(str) {
        const b = new Buffer(str);
        return new FfiString({ptr: b, len: b.length, cap: b.length});
    }
  }
}
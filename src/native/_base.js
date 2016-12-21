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
  'ptr': u8Pointer,
  'len': usize,
  'cap': usize 
});

const u8Array = new ArrayType(u8);

function make_ffi_string(string) {
  const b = new Buffer(string);
  return new FfiString({ptr: b, len: b.length});
}

function from_ffi_string(ffi_string) {
  return ref.reinterpret(ffi_string.ptr, ffi_string.len).toString()
}

module.exports = {
  types: {
    FfiString: FfiString,
    VoidPtr: VoidPtr,
    i32: i32,
    u64: u64,
    u8: u8,
    u8Array: u8Array,
    Void: Void,
    usize: usize 
  },
  functions: {
    ffi_string_free: [Void, [FfiString] ]
  },
  helpers: {
    make_ffi_string: make_ffi_string,
    from_ffi_string: from_ffi_string
  }
}
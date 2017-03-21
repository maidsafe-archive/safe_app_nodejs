const fastcall = require('fastcall');
const ffi = fastcall.ffi;
const ref = fastcall.ref;
const Struct = fastcall.StructType;
const base = require('./_base');
const t = base.types;
const h = base.helpers;



function translateXorName(appPtr, str) {
  let name = str;
  if (str.buffer) {
    name = str.buffer;
  } else {
    const b = new Buffer(str);
    if (b.length != 32) throw Error("XOR Names _must be_ 32 bytes long.")
    name = t.XOR_NAME(b).ref();
  }
  return [appPtr, name]
}


module.exports = {
  functions: {
    idata_new_self_encryptor: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    idata_write_to_self_encryptor: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', t.usize, 'pointer', 'EmptyCB']],
    idata_close_self_encryptor: [t.Void, [t.AppPtr, t.ObjectHandle, t.ObjectHandle, 'pointer', 'XorNameCB']],
    idata_fetch_self_encryptor: [t.Void, [t.AppPtr, ref.refType(t.XOR_NAME), 'pointer', 'ObjectHandleCB']],
    idata_size: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'SizeCB']],
    idata_read_from_self_encryptor: [t.Void, [t.AppPtr, t.ObjectHandle, t.u64, t.u64, 'pointer', 'BufferCB']],
    idata_self_encryptor_writer_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    idata_self_encryptor_reader_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
  },
  api: {
    idata_write_to_self_encryptor: h.Promisified((appPtr, handle, str) => {
      let b = Buffer.isBuffer(str) ? str : Buffer.from(str);
      return [appPtr, handle, b, b.length]
    }, null),
    // idata_close_self_encryptor: h.Promisified(null, 
    //   // make a copy to ensure the data stays around
    //   resp => {console.log("reformat", resp); return t.XOR_NAME(ref.reinterpret(resp[0], 32))}),
    idata_fetch_self_encryptor: h.Promisified(translateXorName),
    idata_read_from_self_encryptor: h.bufferPromise,
  }
}

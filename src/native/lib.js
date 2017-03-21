const path = require('path');
const fastcall = require('fastcall');
const FFI = fastcall.ffi;
const LIB_FILENAME = require('../consts').LIB_FILENAME;
const os = require('os');

const dir = path.dirname(__filename);
const api = require('./api');
const simplePromise = require('./_base').helpers.simplePromise;

// const RTLD_NOW = fastcall.DynamicLibrary.FLAGS.RTLD_NOW;
// const RTLD_GLOBAL = fastcall.DynamicLibrary.FLAGS.RTLD_GLOBAL;
// const mode = RTLD_NOW | RTLD_GLOBAL;

if (os.platform() === 'win32') {
  FFI.Library(path.resolve(__dirname, 'libwinpthread-1'), {});  
}


// let defs = {};


const lib = new fastcall.Library(path.join(dir, LIB_FILENAME))
  .array('uint8[] XorName')
  .callback('void XorNameCB(int err, XorName[32]* name)');
const ffi = {};

api.forEach(function(mod) {

  let overwrites = mod.api || {};

  if (mod.callbacks) {
    // Object.assign(defs, mod.functions);
    for (const key in mod.callbacks) {
      console.log(key, mod.callbacks[key]);
      lib.callback({[key]: mod.callbacks[key]});
    }
  }
  if (mod.functions) {
    // Object.assign(defs, mod.functions);
    for (const key in mod.functions) {
      lib.function({[key]: mod.functions[key]});
      fn = lib.interface[key];
      fn.fn_name = key;

      if (overwrites[key]) {
        console.log("overwrite", key);
        fn = overwrites[key](lib, fn);
      } else {
        // SIMPLE PROMISES
        fn = simplePromise(lib, fn);
        console.log("simple promise for", key)
      }
      fn.fn_name = "[mapped]" + key;
      ffi[key] = fn;
    }
  }
});


// FIXME: As long as `safe-app` doesn't expose system uri itself, we'll
// patch it directly on it. This should later move into its own sub-module
// and take care of mobile support for other platforms, too.
require('./_system_uri')(ffi);

module.exports = ffi;
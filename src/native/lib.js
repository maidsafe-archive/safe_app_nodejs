const path = require('path');
const FFI = require('ffi');
const LIB_FILENAME = require('../consts').LIB_FILENAME;
const os = require('os');

const dir = path.dirname(__filename);

const api = require('./api');

const ffi = {};

const RTLD_NOW = FFI.DynamicLibrary.FLAGS.RTLD_NOW;
const RTLD_GLOBAL = FFI.DynamicLibrary.FLAGS.RTLD_GLOBAL;
const mode = RTLD_NOW | RTLD_GLOBAL;
let lib = null;

try {
  if (os.platform() === 'win32') {
    FFI.DynamicLibrary(path.resolve(__dirname, 'libwinpthread-1'), mode);
  }
  lib = FFI.DynamicLibrary(path.join(dir, LIB_FILENAME), mode);
  ffi['isLibLoadErr'] = null;
} catch (err) {
  console.error(`Error while loading binary => ${err}`);
  ffi['isLibLoadErr'] = err;
}

function retrieveFFI(key) {
  if (!lib) {
    return;
  }
  try {
    return lib.get(key);
  } catch(e) {
    console.log(`The following error occured for looking up function: ${key}. ->`, e);
  }
}

api.forEach(function(mod){
  if (!lib) {
    return;
  }
  if (mod.functions){
    for (const key in mod.functions) {
      const funcDefinition = mod.functions[key];

      ffi[key] = FFI.ForeignFunction(retrieveFFI(key),
                                     funcDefinition[0],
                                     funcDefinition[1])
    }
  }
  if (mod.api) {
    for (const key in mod.api) {
      ffi[key].fn_name = key;
      let fn = mod.api[key](ffi, ffi[key]);
      fn.fn_name = "[mapped]" + key;
      ffi[key] = fn;
    }
  //   Object.assign(mappings, mod.api);
  }
});


// FIXME: As long as `safe-app` doesn't expose system uri itself, we'll
// patch it directly on it. This should later move into its own sub-module
// and take care of mobile support for other platforms, too.
require('./_system_uri')(ffi);

module.exports = ffi;

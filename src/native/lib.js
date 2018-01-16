const path = require('path');
const FFI = require('ffi');
const { LIB_FILENAME } = require('../consts');
const os = require('os');

const dir = path.dirname(__filename);

const api = require('./api');
const makeFfiError = require('./_error.js');
const errConst = require('./../error_const');
const ffi = {};

const RTLD_NOW = FFI.DynamicLibrary.FLAGS.RTLD_NOW;
const RTLD_GLOBAL = FFI.DynamicLibrary.FLAGS.RTLD_GLOBAL;
const mode = RTLD_NOW | RTLD_GLOBAL;
let lib = null;

ffi.init = (options) => {
  try {
    lib = FFI.DynamicLibrary(path.join(options.libPath || dir, LIB_FILENAME), mode);

    api.forEach((mod) => {
      if (!lib) {
        throw new Error('Native library not initialised');
      }
      if (mod.functions){
        for (const key in mod.functions) {
          const funcDefinition = mod.functions[key];

          ffi[key] = FFI.ForeignFunction(lib.get(key),
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
      if (mod.helpersForNative) {
        for (const key in mod.helpersForNative) {
          let fn = mod.helpersForNative[key];
          fn.fn_name = "[mapped]" + key;
          ffi[key] = fn;
        }
      }
    });
    // FIXME: As long as `safe-app` doesn't expose system uri itself, we'll
    // patch it directly on it. This should later move into its own sub-module
    // and take care of mobile support for other platforms, too.
    require('./_system_uri')(ffi, options);
  } catch(e) {
    console.error("ERROR: ", e)
    throw makeFfiError(errConst.FAILED_TO_LOAD_LIB.code,
        errConst.FAILED_TO_LOAD_LIB.msg(e.toString()));
  }
};

module.exports = ffi;

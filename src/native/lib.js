const path = require('path');
const FFI = require('ffi');

const dir = path.dirname(__filename);

const api = require('./api');

let ffiFunctions = {};
let mappings = {}

api.forEach(function(mod){
  if (mod.functions ){
    Object.assign(ffiFunctions, mod.functions);
  }
  if (mod.api) {
    Object.assign(mappings, mod.api);
  }
});

const ffi = FFI.Library(path.join(dir, 'libsafe_app'), ffiFunctions);

for (key in mappings) {
  ffi[key] = mappings[key](ffi, ffi[key]);
}

module.exports = ffi;
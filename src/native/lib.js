const path = require('path');
const FFI = require('ffi');

const dir = path.dirname(__filename);

let ffiFunctions = {

};

module.exports = FFI.Library(path.join(dir, 'libsafe_app'), ffiFunctions);
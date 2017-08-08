const path = require('path');
const FFI = require('ffi');
const SYSTEM_URI_LIB_FILENAME = require('../consts').SYSTEM_URI_LIB_FILENAME;

const h = require('./helpers');
const t = require('./types');

const dir = path.dirname(__filename);
let ffi = null;
let isSysUriLibLoadErr = null;

try {
  ffi = FFI.Library(path.join(dir, SYSTEM_URI_LIB_FILENAME), {
    open: [t.i32, ['string'] ],
    install: [t.i32, ['string', //bundle
      'string', //vendor
      'string', //name
      'string', //exec
      'string', //icon
      'string', //schemes
    ] ],
  });
} catch (err) {
  console.error(`Failed to load system_uri binary => ${err}`);
  isSysUriLibLoadErr = err;
}

function openUri(uri) {
  if (!ffi) {
    return;
  }
  const ret = ffi.open(uri.uri || uri);
  if (ret === -1) {
    throw new Error("Error occured opening " + str + " : " + ret);
  }
}


function registerUriScheme(appInfo, schemes) {
  const bundle = appInfo.bundle || appInfo.id;
  const exec = appInfo.exec ? appInfo.exec : process.execPath;
  const vendor = appInfo.vendor;
  const name = appInfo.name;
  const icon = appInfo.icon;
  const joinedSchemes = schemes.join ? schemes.join(',') : schemes;
  if (!ffi) {
    return;
  }
  const ret = ffi.install(bundle, vendor, name, exec, icon, joinedSchemes);
  if (ret === -1) {
    throw new Error("Error occured installing: " + ret);
  }

}

// FIXME: As long as `safe-app` doesn't expose system uri itself, we'll
// patch it directly on it. This should later move into its own sub-module
// and take care of mobile support for other platforms, too.
module.exports = function(other) {
  other.openUri = openUri;
  other.registerUriScheme = registerUriScheme;
  other.isSysUriLibLoadErr = isSysUriLibLoadErr;
}

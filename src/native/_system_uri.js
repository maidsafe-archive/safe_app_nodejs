const path = require('path');
const FFI = require('ffi');
const ref = require('ref');
const SYSTEM_URI_LIB_FILENAME = require('../consts').SYSTEM_URI_LIB_FILENAME;

const h = require('./helpers');
const t = require('./types');

const dir = path.dirname(__filename);
let ffi = null;
let isSysUriLibLoadErr = null;

const init = (options) => {
  ffi = FFI.Library(path.join(options.libPath || dir, SYSTEM_URI_LIB_FILENAME), {
    open: ["void", ['string', 'pointer', 'pointer'] ],
    install: ["void", ['string', //bundle
      'string', //vendor
      'string', //name
      'string', //exec
      'string', //icon
      'string', //schemes,
      'pointer', // userdata
      'pointer'
    ] ],
  });
};

function _handleError() {
  return FFI.Callback("void", [t.VoidPtr, t.FfiResult],
    (userData, result) => {
      if (result.error_code !== 0) {
        throw new Error(result.description);
      }
    }
  );
}

function openUri(uri) {
  if (!ffi) {
    return;
  }
  try {
    const cb = _handleError();
    ffi.open(uri.uri || uri, ref.NULL, cb);
  } catch (err) {
    console.error(`Error while opening URI :: ${err}`);
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
  try {
    const cb = _handleError();
    ffi.install(bundle, vendor, name, exec, icon, joinedSchemes, ref.NULL, cb);
  } catch (err) {
    console.error(`Error while installing :: ${err}`);
  }
}

// FIXME: As long as `safe-app` doesn't expose system uri itself, we'll
// patch it directly on it. This should later move into its own sub-module
// and take care of mobile support for other platforms, too.
module.exports = function(other, options) {
  other.openUri = openUri;
  other.registerUriScheme = registerUriScheme;
  init(options);
}

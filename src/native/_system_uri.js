const path = require('path');
const FFI = require('ffi');
const ref = require('ref');
const { SYSTEM_URI_LIB_FILENAME } = require('../consts');
const makeFfiError = require('./_error.js');
const h = require('./helpers');
const t = require('./types');

const dir = path.dirname(__filename);
let ffi = null;
let isSysUriLibLoadErr = null;

const init = (options) => {
  ffi = FFI.Library(path.join(options.libPath || dir, SYSTEM_URI_LIB_FILENAME), {
    open_uri: ["void", ['string', 'pointer', 'pointer'] ],
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

const _handleError = (resolve,  reject) => {
  return FFI.Callback("void", [t.VoidPtr, t.FfiResult],
    (userData, result) => {
      if (result.error_code !== 0) {
        return reject(makeFfiError(err.error_code, err.error_description));
      }
      return resolve();
    }
  );
}

const openUri = (uri) => {
  if (!ffi) {
    return;
  }
  return new Promise((resolve,  reject) => {
    try {
      const cb = _handleError(resolve,  reject);
      ffi.open_uri(uri.uri || uri, ref.NULL, cb);
    } catch (err) {
      return reject(err);
    }
  });
}


const registerUriScheme = (appInfo, schemes) => {
  const bundle = appInfo.bundle || appInfo.id;
  const exec = appInfo.exec ? appInfo.exec : process.execPath;
  const vendor = appInfo.vendor.replace(/\s/g, '-');
  const name = appInfo.name.replace(/\s/g, '-');
  const icon = appInfo.icon;
  const joinedSchemes = schemes.join ? schemes.join(',') : schemes;
  if (!ffi) {
    return;
  }
  return new Promise((resolve, reject) => {
    try {
      const cb = _handleError(resolve, reject);
      ffi.install(bundle, vendor, name, exec, icon, joinedSchemes, ref.NULL, cb);
    } catch (err) {
      return reject(err);
    }
  });
}

// FIXME: As long as `safe-app` doesn't expose system uri itself, we'll
// patch it directly on it. This should later move into its own sub-module
// and take care of mobile support for other platforms, too.
module.exports = (other, options) => {
  other.openUri = openUri;
  other.registerUriScheme = registerUriScheme;
  init(options);
}

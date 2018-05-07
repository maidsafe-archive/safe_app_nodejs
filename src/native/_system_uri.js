// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under 
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or 
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms. 
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const path = require('path');
const FFI = require('ffi');
const ref = require('ref');
const { SYSTEM_URI_LIB_FILENAME } = require('../consts');
const makeError = require('./_error.js');
const h = require('./helpers');
const t = require('./types');
const ArrayType = require('ref-array');

const StringArray = ArrayType(ref.types.CString);

const dir = path.dirname(__filename);
let ffi = null;
let isSysUriLibLoadErr = null;

const init = (options) => {
  ffi = FFI.Library(path.join(options.libPath || dir, SYSTEM_URI_LIB_FILENAME), {
    open_uri: ["void", ['string', 'pointer', 'pointer'] ],
    install: ["void", ['string', //bundle
      'string', //vendor
      'string', //name
      StringArray, //exec args
      t.usize, //exec args length
      'string', //icon
      'string', //schemes,
      'pointer', // userdata
      'pointer'
    ] ],
  });
};

const _handleError = (resolve,  reject) => {
  return FFI.Callback("void", [t.VoidPtr, t.FfiResultPtr],
    (userData, resultPtr) => {
      const result = h.makeFfiResult(resultPtr);
      if (result.error_code !== 0) {
        return reject(makeError(result.error_code, result.error_description));
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
  if (!ffi) {
    return;
  }
  if (appInfo.exec && !Array.isArray(appInfo.exec)) {
    throw new Error("Exec command must be an array of string arguments");
  }
  const bundle = appInfo.bundle || appInfo.id;
  const exec = appInfo.exec ? new StringArray(appInfo.exec) : new StringArray([process.execPath]);
  const vendor = appInfo.vendor.replace(/\s/g, '-');
  const name = appInfo.name.replace(/\s/g, '-');
  const icon = appInfo.icon;
  const joinedSchemes = schemes.join ? schemes.join(',') : schemes;
  return new Promise((resolve, reject) => {
    try {
      const cb = _handleError(resolve, reject);
      ffi.install(bundle, vendor, name, exec, exec.length, icon, joinedSchemes, ref.NULL, cb);
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

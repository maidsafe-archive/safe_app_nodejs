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


const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const makeError = require('./_error.js');
const { types: t, helpers } = require('./_base');
const { helpersForNative } = require('./_auth.js');
const { types } = require('./_auth');
const AuthGranted = types.AuthGranted;
const consts = require('../consts');
const errConst = require('../error_const');

const AccountInfo = Struct({
  mutations_done: t.u64,
  mutations_available: t.u64
});

module.exports = {
  functions: {
    app_account_info: [t.Void, [t.AppPtr, t.VoidPtr, 'pointer']],
    app_unregistered: [t.Void ,[t.u8Pointer, t.usize, t.VoidPtr, 'pointer', 'pointer']],
    app_registered: [t.Void , ['string', ref.refType(AuthGranted), t.VoidPtr, 'pointer', 'pointer']],
    app_reconnect: [t.Void, [t.AppPtr, t.VoidPtr, 'pointer']],
    app_free: [t.Void, [t.AppPtr]],
    app_reset_object_cache: [t.Void, [t.AppPtr, 'pointer', 'pointer']],
    is_mock_build: [t.bool, []],
    app_set_additional_search_path: [t.Void, ['string', 'pointer', 'pointer']],
    app_container_name: [t.Void, ['string', t.VoidPtr, 'pointer']]
  },
  api: {
    app_account_info: helpers.Promisified(null, ref.refType(AccountInfo), (accInfoPtr) => {
      const accInfo = accInfoPtr[0].deref();
      return { mutations_done: accInfo.mutations_done, mutations_available: accInfo.mutations_available }
    }),
    app_unregistered: (lib, fn) => {
      return ((app, uri) => {
        const disconnect_notifier_cb = ffi.Callback("void", [t.VoidPtr], (user_data) => app._networkStateUpdated(user_data, consts.NET_STATE_DISCONNECTED));
        return new Promise((resolve, reject) => {
          if (!uri) reject(makeError(errConst.MISSING_AUTH_URI.code, errConst.MISSING_AUTH_URI.msg));

          const uriBuf = Buffer.isBuffer(uri) ? uri : (uri.buffer || new Buffer(uri));
          const result_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResultPtr, t.AppPtr], (user_data, resultPtr, appCon) => {
            const result = helpers.makeFfiResult(resultPtr);
            if (result.error_code !== 0) {
              reject(makeError(result.error_code, result.error_description));
              return;
            }

            app.connection = appCon;
            app._networkStateUpdated(null, consts.NET_STATE_CONNECTED);
            resolve(app);
          });

          fn.apply(fn, [uriBuf, uriBuf.length, ref.NULL, disconnect_notifier_cb, result_cb]);
        });
      })
    },
    app_registered: (lib, fn) => {
      return ((app, authGrantedObj) => {
        const disconnect_notifier_cb = ffi.Callback("void", [t.VoidPtr], (user_data) => app._networkStateUpdated(user_data, consts.NET_STATE_DISCONNECTED));
        return new Promise((resolve, reject) => {
          const result_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResultPtr, t.AppPtr], (user_data, resultPtr, appCon) => {
            const result = helpers.makeFfiResult(resultPtr);
            if (result.error_code !== 0) {
              return reject(makeError(result.error_code, result.error_description));
            }

            app.connection = appCon;
            app._networkStateUpdated(null, consts.NET_STATE_CONNECTED);
            resolve(app);
          });
          const authGranted = helpersForNative.makeAuthGrantedFfiStruct(authGrantedObj);
          fn.apply(fn, [app.appInfo.id, authGranted.ref(), ref.NULL, disconnect_notifier_cb, result_cb]);
        });
      });
    },
    app_reconnect: (lib, fn) => {
      return ((app) => {
        return new Promise((resolve, reject) => {
          const result_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResultPtr], (user_data, resultPtr) => {
            const result = helpers.makeFfiResult(resultPtr);
            if (result.error_code !== 0) {
              return reject(makeError(result.error_code, result.error_description));
            }

            app._networkStateUpdated(null, consts.NET_STATE_CONNECTED);
            resolve(result);
          });
          fn.apply(fn, [app.connection, ref.NULL, result_cb]);
        });
      });  
    },
    app_free: (lib, fn) => {
      return ((app) => {
        fn(app);
        return Promise.resolve();
      });
    },
    app_reset_object_cache: helpers.Promisified(null, []),
    is_mock_build: (lib, fn) => (() => { return fn(); }),
    app_set_additional_search_path: helpers.Promisified(null, []),
    app_container_name: helpers.Promisified(null, 'string')
  }
};

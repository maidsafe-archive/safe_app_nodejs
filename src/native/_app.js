const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const makeFfiError = require('./_error.js');
const base = require('./_base');
const t = base.types;
const { types } = require('./_auth');
const AuthGranted = types.AuthGranted;
const consts = require('../consts');

module.exports = {
  functions: {
    app_unregistered: [t.Void ,[t.u8Pointer, t.usize, t.VoidPtr, t.VoidPtr, 'pointer', 'pointer']],
    app_registered: [t.Void , ['string', ref.refType(AuthGranted), t.VoidPtr, t.VoidPtr, 'pointer', 'pointer']],
    app_reconnect: [t.Void, [t.AppPtr, t.VoidPtr, 'pointer']],
    app_free: [t.Void, [t.AppPtr]]
  },
  api: {
    app_unregistered: function(lib, fn) {
      return (function(app, uri) {
        const network_observer_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.i32], (user_data, result, state) => app._networkStateUpdated(user_data, result, state));
        return new Promise((resolve, reject) => {
          if (!uri) reject(makeFfiError(-1, "Missing connection URI"));

          const uriBuf = Buffer.isBuffer(uri) ? uri : (uri.buffer || new Buffer(uri));
          const result_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.AppPtr], function(user_data, result, appCon) {
            if (result.error_code !== 0) {
              reject(makeFfiError(result.error_code, result.error_description));
              return;
            }

            app.connection = appCon;
            app.networkState = consts.NET_STATE_CONNECTED;
            resolve(app);
          });

          fn.apply(fn, [uriBuf, uriBuf.length, ref.NULL, ref.NULL, network_observer_cb, result_cb]);
        });
      })
    },
    app_registered: function(lib, fn) {
      return (function(app, authGranted) {
        const network_observer_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.i32], (user_data, result, state) => app._networkStateUpdated(user_data, result, state));
        return new Promise((resolve, reject) => {
          const result_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.AppPtr], function(user_data, result, appCon) {
            if (result.error_code !== 0) {
              reject(makeFfiError(result.error_code, result.error_description));
              return;
            }

            app.connection = appCon;
            app.networkState = consts.NET_STATE_CONNECTED;
            resolve(app);
          });

          fn.apply(fn, [app.appInfo.id, authGranted, ref.NULL, ref.NULL, network_observer_cb, result_cb]);
        });
      });
    },
    app_reconnect: base.helpers.Promisified(null, []),
    app_free: function (lib, fn) {
      return (function (app) {
        fn(app);
        return Promise.resolve();
      });
    }
  }
};

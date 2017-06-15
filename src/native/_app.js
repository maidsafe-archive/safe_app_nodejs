const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const makeFfiError = require('./_error.js');
const base = require('./_base');
const t = base.types;
const AuthGranted = require('./_auth').types.AuthGranted;

module.exports = {
  functions: {
    app_unregistered: [t.Void ,[t.VoidPtr, t.u8Pointer, t.usize, 'pointer', 'pointer']],
    app_registered: [t.Void , ['string', ref.refType(AuthGranted), t.VoidPtr, 'pointer', 'pointer']],
    app_free: [t.Void, [t.AppPtr]]
  },
  api: {
    app_unregistered: function(lib, fn) {
      return (function(app, uri) {
        if (!uri) throw makeFfiError(-1, "Missing connection URI");

        const network_observer_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.i32], (user_data, result, state) => app._networkStateUpdated(user_data, result, state));
        const uriBuf = Buffer.isBuffer(uri) ? uri : (uri.buffer || new Buffer(uri));
        const result_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.AppPtr], function(user_data, result, appCon) {
          if (result.error_code !== 0) throw makeFfiError(result.error_code, result.error_description);

          app.connection = appCon;
        });

        fn(ref.NULL, uriBuf, uriBuf.length, network_observer_cb, result_cb);
        return Promise.resolve(app);
      })
    },
    app_registered: function(lib, fn) {
      return (function(app, authGranted) {
        const network_observer_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.i32], (user_data, result, state) => app._networkStateUpdated(user_data, result, state));
        const result_cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.AppPtr], function(user_data, result, appCon) {
          if (result.error_code !== 0) throw makeFfiError(result.error_code, result.error_description);

          app.connection = appCon;
        });

        fn(app.appInfo.id, authGranted, ref.NULL, network_observer_cb, result_cb);
        return Promise.resolve(app);
      });
    },
    app_free: function (lib, fn) {
      return (function (app) {
        fn(app.connection);
        return Promise.resolve();
      });
    }
  }
};

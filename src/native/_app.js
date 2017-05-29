const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const makeFfiError = require('./_error.js');
const base = require('./_base');
const t = base.types;
const AuthGranted = require('./_auth').types.AuthGranted;

module.exports = {
  functions: {
    app_unregistered: [t.i32 ,['pointer', 'pointer', t.AppPtr]],
    app_registered: [t.i32 , ['string', ref.refType(AuthGranted), t.VoidPtr, 'pointer', t.AppPtr]],
    app_free: [t.Void, [t.AppPtr]]
  },
  api: {
    app_unregistered: function(lib, fn) {
      return (function(app) {
        const appCon = ref.alloc(t.AppPtr);
        const cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.i32], (user_data, err, state) => app._networkStateUpdated(user_data, err, state));

        const err = fn(ref.NULL, cb, appCon);
        if (err) throw makeError(err, "Couldn't create App");

        app.connection = appCon.deref();
        return Promise.resolve(app);
      })
    },
    app_registered: function(lib, fn) {
      return (function(app, authGranted) {
        const appCon = ref.alloc(t.AppPtr);
        const cb = ffi.Callback("void", [t.VoidPtr, t.FfiResult, t.i32], (user_data, err, state) => app._networkStateUpdated(user_data, err, state));

        const err = fn(app.appInfo.id, authGranted, ref.NULL, cb, appCon);
        if (err) throw makeError(err, "Couldn't create App");

        app.connection = appCon.deref();
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

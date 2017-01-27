const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const makeFfiError = require('./_error.js');
const base = require('./_base');
const t = base.types;

module.exports = {
  functions: {
    app_unregistered: [t.i32 ,['pointer', 'pointer', t.AppPtr]],
    app_registered: [t.i32 , ['string', 'pointer', 'pointer', t.AppPtr]],
    app_free: [t.Void, [t.AppPtr]]
  },
  api: {
    app_unregistered: function(lib, fn) {
      return (function(app) {
        const appCon = ref.alloc(t.AppPtr);
        const cb = ffi.Callback("void", [t.i32, t.i32], (err, state) => app._networkStateUpdated(err, state));

        const err = fn(ref.NULL, cb, appCon);
        if (err) throw makeError(err, "Couldn't create App");

        app.connection = appCon.deref();
        return Promise.resolve(app);
      })
    },
    app_registered: function(lib, fn) {
      return (function(app_id, authGranted) {
        const appCon = ref.alloc(t.AppPtr);
        const cb = ffi.Callback("void", [t.i32, t.i32], (err, state) => app._networkStateUpdated(err, state));

        const err = fn(app_id, authGranted, ref.NULL, cb, appCon);
        if (err) throw makeError(err, "Couldn't create App");

        app.connection = appCon.deref();
        return Promise.resolve(app);
      });
    },
    app_free: function (lib, fn) {
      return (function (app) {
        fn(app);
        return Promise.resolve();
      });
    }
  }
};

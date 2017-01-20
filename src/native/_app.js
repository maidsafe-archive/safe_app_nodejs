const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const t = base.types;
const makeFfiString = base.helpers.makeFfiString;

module.exports = {
  functions: {
    app_unregistered: [t.i32 ,['pointer', 'pointer', t.AppPtr]],
    app_registered: [t.i32 , [t.FfiString, 'pointer', 'pointer', t.AppPtr]],
  },
  api: {
    app_unregistered: function(lib, fn) {
      return (function(app) {
        const appCon = ref.alloc(t.AppPtr);
        const cb = ffi.Callback("void", [t.i32, t.i32], (err, state) => app._networkStateUpdated(err, state));

        fn(ref.NULL, cb, appCon);

        app._connection = appCon.deref();
        return Promise.resolve(app);
      })
    },
    app_registered: function(lib, fn) {
      return (function(app, authGranted) {
        const ffi_str = makeFfiString(app.appInfo.id);
        const appCon = ref.alloc(t.AppPtr);
        const cb = ffi.Callback("void", [t.i32, t.i32], (err, state) => app._networkStateUpdated(err, state));

        fn(ffi_str, authGranted, ref.NULL, cb, appCon);

        app._connection = appCon.deref();
        return Promise.resolve(app);
      });
    }
  }
}
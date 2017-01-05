const ffi = require('ffi');
const ref = require("ref");
const Struct = require('ref-struct');
const base = require('./_base');
const t = base.types;
const makeFfiString = base.helpers.makeFfiString;

const App = Struct({});
const AppPtr = ref.refType(App);

module.exports = {
  types: {
    App: App,
    AppPtr: AppPtr

  },
  functions: {
    app_unregistered: [t.i32 ,['pointer', 'pointer', AppPtr]],
    app_registered: [t.i32 , [t.FfiString, 'pointer', 'pointer', AppPtr]],
  },
  api: {
    app_unregistered: function(lib, fn) {
      return (function(app) {
        const appCon = ref.alloc(AppPtr);
        const cb = ffi.Callback("void", [t.i32, t.i32], (err, state) => app._networkStateUpdated(err, state));

        fn(ref.NULL, cb, appCon);
        
        app._connection = appCon;
        return Promise.resolve(app);
      })
    },
    app_registered: function(lib, fn) {
      return (function(app, authGranted) {
        const ffi_str = makeFfiString(app.appInfo.id);
        const appCon = ref.alloc(AppPtr);
        const cb = ffi.Callback("void", [t.i32, t.i32], (err, state) => app._networkStateUpdated(err, state));

        fn(ffi_str, authGranted, ref.NULL, cb, appCon);

        app._connection = appCon;
        return Promise.resolve(app);
      });
    }
  }
}
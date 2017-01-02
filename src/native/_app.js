const ref = require("ref");
const Struct = require('ref-struct');
const t = require('./_base').types;


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
        let ffi_str = make_ffi_string(app.appInfo.id);
        let appCon = new AppPtr();

        fn.async(ffi_str,
                 ref.NULL,
                 ffi.Callback("void", [i32, i32], app._networkStateUpdated.bind(app)),
                 appCon
                );

       app._connection = appCon;
        return Promise.resolved(app);
      })
    },
    app_registered: function(lib, fn) {
      return (function(app, authGranted) {
        let ffi_str = make_ffi_string(app.appInfo.id);
        let appCon = new AppPtr();

        fn.async(ffi_str,
             authGranted,
                 ref.NULL,
                 ffi.Callback("void", [i32, i32], app._networkStateUpdated.bind(app)),
                 appCon
                );

        app._connection = appCon;
        return Promise.resolved(app);
      });
    }
  }
}
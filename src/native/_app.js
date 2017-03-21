const fastcall = require('fastcall');
const ffi = fastcall.ffi;
const ref = fastcall.ref;
const Struct = fastcall.StructType;
const makeFfiError = require('./_error.js');
const base = require('./_base');
const t = base.types;
const AuthGranted = require('./_auth').types.AuthGranted;

module.exports = {
  callbacks: {
    NetworkStateUpdatedCB: ["void", [t.i32, t.i32]]
  },
  functions: {
    app_unregistered: [t.i32 ,['pointer', 'NetworkStateUpdatedCB', t.AppPtr]],
    app_registered: [t.i32 , ['string', ref.refType(AuthGranted), t.VoidPtr, 'NetworkStateUpdatedCB', t.AppPtr]],
    app_free: [t.Void, [t.AppPtr]]
  },
  api: {
    app_unregistered: function(lib, fn) {
      return (function(app) {
        const appCon = ref.alloc(t.AppPtr);
        const cb = lib.interface.NetworkStateUpdatedCB(
              (err, state) => app._networkStateUpdated(err, state));

        const err = fn(ref.NULL, cb, appCon);
        if (err) throw makeError(err, "Couldn't create App");

        app.connection = appCon.deref();
        return Promise.resolve(app);
      })
    },
    app_registered: function(lib, fn) {
      return (function(app, authGranted) {
        const appCon = ref.alloc(t.AppPtr);
        const cb = lib.interface.NetworkStateUpdatedCB(
              (err, state) => app._networkStateUpdated(err, state));
        
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

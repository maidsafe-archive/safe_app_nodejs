
const ref = require('ref');
const { types: t } = require("./_base");

module.exports = {
  functions: {
    test_create_app: [t.i32, [t.AppPtr]],
    test_create_app_with_access: [t.i32 , ['pointer', t.usize, t.AppPtr]],
  },
  api: {
    test_create_app: (lib, fn) => {
      return () => {
        const appCon = ref.alloc(t.AppPtr);
        const ret = fn(appCon);
        if (ret) throw Error("Creating testing app failed: " + ret);
        return appCon.deref();
      }
    },
    test_create_app_with_access: (lib, fn) => {
      return (permissions) => {
        const appCon = ref.alloc(t.AppPtr);
        const ret = fn(permissions.buffer, permissions.length, appCon);
        if (ret) throw Error("Creating testing app failed: " + ret);
        return appCon.deref();
      }
    }
  }
}


const ref = require('ref');
const t = require("./_base").types;

module.exports = {
  functions: {
    gen_testing_app_with_access: [t.i32 , [t.AppPtr]],
  },
  api: {
    gen_testing_app_with_access: function(lib, fn) {
      return () => {
        const appCon = ref.alloc(t.AppPtr);
        const ret = fn(appCon);
        if (ret) throw Error("Creating testing app failed: " + ret);
        return appCon.deref();
      }
    }
  }
}
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
  }
}
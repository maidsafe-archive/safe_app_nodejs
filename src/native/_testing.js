
const ref = require('ref');
const { types: t, helpers: h } = require("./_base");
const { types } = require('./_auth');

module.exports = {
  functions: {
    test_create_app: [t.Void, ['string', 'pointer', 'pointer']],
    test_create_app_with_access: [t.Void, [ref.refType(types.AuthReq), 'pointer', 'pointer']],
  },
  api: {
    test_create_app: h.Promisified(null, t.AppPtr),
    test_create_app_with_access: h.Promisified(null, t.AppPtr),
  }
}

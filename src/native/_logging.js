const base = require('./_base');
const t = base.types;
const h = base.helpers;

module.exports = {
  functions: {
    app_init_logging: [t.Void, ['string', 'pointer', 'pointer']],
    app_output_log_path: [t.Void, ['string', 'pointer', 'pointer']],
  },
  api: {
    app_init_logging: h.Promisified(null, []),
    app_output_log_path: h.Promisified(null, 'string'),
  }
};

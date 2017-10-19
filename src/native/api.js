const { inTesting } = require('../consts');

module.exports = [
  require('./_base'),
  require('./_crypto'),
  require('./_app'),
  require('./_auth'),
  require('./_cipher_opt'),
  require('./_immutable'),
  require('./_mutable'),
  require('./_nfs'),
  require('./_logging'),
  inTesting ? require("./_testing") : {} // we have some testing helpers
];

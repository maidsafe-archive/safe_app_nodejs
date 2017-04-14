const inTesting = require('../consts').inTesting;

module.exports = [
  require('./_base'),
  require('./_app'),
  require('./_auth'),
  require('./_cipher_opt'),
  require('./_immutable'),
  require('./_mutable'),
  require('./_nfs'),
  require('./_misc'),
  inTesting ? require("./_testing") : {} // we have some testing helpers
];

const loadTesting = (process.env.NODE_ENV || '').match(/dev|development|testing|test/) || typeof global.it === 'function';
module.exports = [
  require('./_base'),
  require('./_app'),
  require('./_auth'),
  require('./_cipher_opt'),
  require('./_immutable'),
  require('./_mutable'),
  require('./_nfs'),
  require('./_misc'),
  loadTesting ? require("./_testing") : {} // we have some testing helpers
];

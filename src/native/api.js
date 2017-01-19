var isInTest = typeof global.it === 'function';
module.exports = [
  require('./_base'),
  require('./_app'),
  require('./_auth'),
  require('./_cipher_opt'),
  require('./_immutable'),
  require('./_container'),
  require('./_nfs'),
  isInTest ? require("./_testing") : {} // we have some testing helpers
];

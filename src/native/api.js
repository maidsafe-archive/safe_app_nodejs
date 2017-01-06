var isInTest = typeof global.it === 'function';
module.exports = [
  require('./_base'),
  require('./_app'),
  require('./_auth'),
  isInTest ? require("./_testing") : {} // we have some testing helpers
];

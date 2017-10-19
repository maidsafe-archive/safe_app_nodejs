const immutableData = require('./immutable');
const mutableData = require('./mutable');
const cipherOpt = require('./cipher_opt');
const { CryptoInterface: crypto } = require('./crypto');
const auth = require('./auth');

module.exports = {
  crypto,
  cipherOpt,
  immutableData,
  mutableData,
  auth
};

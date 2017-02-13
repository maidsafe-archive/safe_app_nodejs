const immutableData = require('./immutable');
const mutableData = require('./mutable');
const cipherOpt = require('./cipher_opt');
const auth = require('./auth');

/**
* @typedef {Object} NameAndTag
* @param {Buffer} name - the name/address on the network
* @param {Number} tag - the type tag
**/

module.exports = {
  cipherOpt,
  immutableData,
  mutableData,
  auth
};

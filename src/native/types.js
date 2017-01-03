
const api = require('./api');

let types = { };

api.forEach(function(mod){
  if (mod.types){
    Object.assign(types, mod.types);
  }
});


module.exports = types;
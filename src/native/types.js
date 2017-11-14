
const api = require('./api');

let types = { };

api.forEach((mod) => {
  if (mod.types){
    Object.assign(types, mod.types);
  }
});


module.exports = types;

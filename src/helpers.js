const weak = require('weak');

class NetworkObject {
  constructor(app, ref) {
    this.app = app;
    this.ref = ref;
  }
}

function autoref(obj) {
  if (obj.constructor && obj.constructor.free) {
    return weak(obj, () => obj.constructor.free(obj.app, obj.ref));
  }

  console.warn('Can\'t clean up obj. No static "free" function found on obj:', obj);
  return obj;
}


module.exports = {
  NetworkObject,
  autoref
};


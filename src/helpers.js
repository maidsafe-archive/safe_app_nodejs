const weak = require('weak');

class NetworkObject {
  constructor(app, ref) {
    this.app = app;
    this.ref = ref;
  }

  __cleanup__() {
    if (this.ref && this._cleanup) {
      this._cleanup(this.app, this.ref);
    }
  }

}

// automatic referencing counting allows
// us to free up resources
function autocleanup() {
  // we are being dereferenced
  // clean up loose ends
  if (this.__cleanup__) {
    this.__cleanup__();
  }
}

function autoref(obj) {
  return weak(obj, autocleanup);
}


module.exports = {
  NetworkObject,
  autoref
};


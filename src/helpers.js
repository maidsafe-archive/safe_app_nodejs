const weak = require('weak');

/**
* General purpose interface to link a native handle
* @private
**/
class NetworkObject {
  /**
  * Create a new Object holding the handle
  * @param {SAFEApp} app
  * @param {handle} ref - the objects handle or reference
  **/
  constructor(app, ref) {
    this._app = app;
    this._ref = ref;
  }

  /**
  * The app this belongs to
  * @returns {SAFEApp}
  **/
  get app() {
    return this._app;
  }

  /**
  * The reference or object handle to reference
  * the object on the native side with
  * @returns {(Number|Pointer})}
  **/
  get ref() {
    return this._ref;
  }
}

/**
* Automatically clean up a given object using weak once
* it is garbage collected.
* @private
* @abstract
**/
function autoref(obj) {
  if (obj.constructor && obj.constructor.free) {
    return weak(obj, () => {
      if (obj.app) {
        return obj.constructor.free(obj.app, obj.ref);
      }
      return obj.constructor.free(obj);
    });
  }

  console.warn('Can\'t clean up obj. No static "free" function found on obj:', obj);
  return obj;
}


module.exports = {
  NetworkObject,
  autoref
};

const weak = require('weak');
const makeError = require('./native/_error.js');
const errConst = require('./error_const');

/**
* General purpose interface to link a native handle
* @private
*/
class NetworkObject {
  /**
  * Create a new Object holding the handle
  * @param {SAFEApp} app
  * @param {handle} ref - the objects handle or reference
  */
  constructor(app, ref) {
    this._app = app;
    this._ref = ref;
  }

  /**
  * The app this belongs to
  * @returns {SAFEApp}
  */
  get app() {
    return this._app;
  }

  /**
  * The reference or object handle to reference
  * the object on the native side with
  * @returns {(Number|Pointer})}
  */
  get ref() {
    return this._ref;
  }
}

/**
* We need to differentiate between safeApp objects and NetworkObjects
* @private
* @abstract
*/
const freeResources = (obj) => {
  if (obj.app) {
    return () => obj.constructor.free(obj.app, obj.ref);
  }
  return () => obj.constructor.free(obj);
};

/**
* Automatically clean up a given object's resources using weak once
* it is garbage collected.
* Expose an optional function to explicitly clean up underlying resources.
* @private
* @abstract
*/
const autoref = (obj) => {
  if (obj.constructor && obj.constructor.free) {
    const weakObj = weak(obj, freeResources(obj));
    weakObj.forceCleanUp = freeResources(obj);
    return weakObj;
  }

  console.warn('Can\'t clean up obj. No static "free" function found on obj:', obj);
  return obj;
};


function validateShareMDataPermissions(permissions) {
  if (!permissions) {
    throw makeError(errConst.MISSING_PERMS_ARRAY.code, errConst.MISSING_PERMS_ARRAY.msg);
  }
  const permissionMustHaveProperties = ['type_tag', 'name', 'perms'];
  let badPerm = {};
  const hasCorrectProperties = permissions.every(
    (perm) => permissionMustHaveProperties.every((prop) => {
      const bool = Object.prototype.hasOwnProperty.call(perm, prop) && perm[prop];
      if (!bool) {
        badPerm = perm;
        return false;
      }
      return true;
    }));

  if (!hasCorrectProperties) {
    throw makeError(
      errConst.INVALID_SHARE_MD_PERMISSION.code,
      errConst.INVALID_SHARE_MD_PERMISSION.msg(JSON.stringify(badPerm))
    );
  }
}


module.exports = {
  NetworkObject,
  autoref,
  validateShareMDataPermissions
};

// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under 
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or 
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms. 
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const weak = require('weak');
const makeError = require('./native/_error.js');
const errConst = require('./error_const');
const base = require('./native/_base');

const t = base.types;

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
  if (!Array.isArray(permissions)) {
    throw makeError(errConst.INVALID_PERMS_ARRAY.code, errConst.INVALID_PERMS_ARRAY.msg);
  }
  const permissionMustHaveProperties = ['type_tag', 'name', 'perms'];
  let badPerm = {};
  const hasCorrectProperties = permissions.every(
    (perm) => permissionMustHaveProperties.every((prop) => {
      const bool = Object.prototype.hasOwnProperty.call(perm, prop) && perm[prop];
      if (!bool) {
        badPerm = perm;
        return false;
      } else if (bool && prop === 'name') {
        if (new Buffer(perm[prop]).length !== t.XOR_NAME(32).length) {
          badPerm = perm;
          return false;
        }
      } else if (bool && prop === 'type_tag') {
        if (!Number.isInteger(perm[prop])) {
          badPerm = perm;
          return false;
        }
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

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
const path = require('path');
const makeError = require('./native/_error.js');
const consts = require('./consts');
const errConst = require('./error_const');
const base = require('./native/_base');

const t = base.types;

/* Determine if process is forced to use the mock routing.
 * Either NODE_ENV env var can be set to 'dev'/'prod',
 * or '--mock' can be passed as a command line argument.
*/
const hasMockArg = process.argv.includes('--mock');
const env = hasMockArg ? 'development' : process.env.NODE_ENV || 'production';
let inTesting = /^dev/.test(env);

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

// Currently we only support the `forceUseMock` init option to force the use
// of mock routing regardless the NODE_ENV environment variable value.
const getLibPathModifier = (options) => {
  let libPathModifier = inTesting ? consts.LIB_LOCATION_MOCK : consts.LIB_LOCATION_PROD;
  if (!options) return libPathModifier;

  const forceUseMock = options.forceUseMock;
  if (typeof forceUseMock !== 'boolean') throw new Error('The \'forceUseMock\' option must be a boolean.');

  if (forceUseMock) {
    // TODO: find another way to propagate this value for enabling testing functions
    inTesting = true;
    libPathModifier = consts.LIB_LOCATION_MOCK;
  }
  return libPathModifier;
};

const getSafeAppLibFilename = (defaultDir, options) => {
  const baseDir = (options && options.libPath) || defaultDir;
  const libPath = path.join(baseDir, getLibPathModifier(options), consts.SAFE_APP_LIB_FILENAME);
  return libPath;
};

const getSystemUriLibFilename = (defaultDir, options) => {
  const baseDir = (options && options.libPath) || defaultDir;
  const libPath = path.join(baseDir, getLibPathModifier(options), consts.SYSTEM_URI_LIB_FILENAME);
  return libPath;
};

module.exports = {
  inTesting,
  NetworkObject,
  autoref,
  validateShareMDataPermissions,
  getSafeAppLibFilename,
  getSystemUriLibFilename
};

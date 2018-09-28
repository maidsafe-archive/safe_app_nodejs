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

/* Determine if by default the package shall use the mock routing.
 * '--mock' can be passed as a command line argument.
 *
 * Note this can be overriden by each safeApp instance by
 * providing the `forceUseMock` option at initialisation stage.
*/
const hasMockArg = process.argv.includes('--mock');
const isTestEnv = /^test/.test(process.env.NODE_ENV);
const useMockByDefault = isTestEnv ? true : hasMockArg;

/* Determines if the argument to enable experimental APIs was provided
 * When this argument is passed, a set of experimental APIs are additionally exposed
 * which emit `console.warn` notices about their state, and warning the dev/user
 * that they may be changed / deprecated / removed in future without too much
 * notification in advance, they are available only for devs to see the upcoming
 * APIs and start exploring and testing them as well as provide feedback for enhancements.
*/
const isExperimentalApisEnabled = process.argv.includes('--enable-experimental-apis');

/* Helper to be used by all experimental APIs (note this is async).
 * For example, the following snippet shows how an experimental (async) function
 * called 'testFn' can be exposed:
 * async function testFn(arg1, arg2) {
     return EXPOSE_AS_EXPERIMENTAL_API.call(this, async function testFn() {
       // 'testFn' function's actual implementation goes here
       console.log("Test Fn which uses arg1 and arg2: ", arg1, arg2);
       ...
     });
 * }
*/
async function EXPOSE_AS_EXPERIMENTAL_API(fn) {
  // the experimental APIs can be also enabled by setting
  // the `enableExperimentalApis` flag can be set to true in the initialisation options.
  if (!isExperimentalApisEnabled && !this.options.enableExperimentalApis) {
    throw makeError(errConst.EXPERIMENTAL_API_DISABLED.code,
                    errConst.EXPERIMENTAL_API_DISABLED.msg(fn.name));
  }

  console.warn(`
    ** Experimental API WARNING **
    * The application is making use of a SAFE experimental API *
    The '${fn.name}' function is part of a set of experimental functions.
    Any/all of them may be deprecated, removed, or very likely change in the future.
    Also regular users won't have this APIs enabled by default unless the flag is provided, so be aware of all these limitations.
    For more information, updates, or to submit ideas and suggestions, please visit https://github.com/maidsafe/safe_app_nodejs.
    `);
  const res = await fn.call(this);
  return res;
}

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
  throw new Error('No static "free" function found on object to autoref');
};


function validateShareMDataPermissions(permissions) {
  if (!permissions) {
    throw makeError(errConst.MISSING_PERMS_ARRAY.code, errConst.MISSING_PERMS_ARRAY.msg);
  }
  if (!Array.isArray(permissions)) {
    throw makeError(errConst.INVALID_PERMS_ARRAY.code, errConst.INVALID_PERMS_ARRAY.msg);
  }
  const permissionMustHaveProperties = ['typeTag', 'name', 'perms'];
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
      } else if (bool && prop === 'typeTag') {
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
const getNativeLibPath = (defaultDir, options, filename) => {
  const baseDir = (options && options.libPath) || defaultDir;
  let libPathModifier = useMockByDefault ? consts.LIB_LOCATION_MOCK : consts.LIB_LOCATION_PROD;

  if (options && options.forceUseMock) {
    libPathModifier = consts.LIB_LOCATION_MOCK;
  }
  const libPath = path.join(baseDir, libPathModifier, filename);
  return libPath;
};

const getSafeAppLibFilename = (defaultDir, options) =>
  getNativeLibPath(defaultDir, options, consts.SAFE_APP_LIB_FILENAME);

const getSystemUriLibFilename = (defaultDir, options) =>
  getNativeLibPath(defaultDir, options, consts.SYSTEM_URI_LIB_FILENAME);

module.exports = {
  EXPOSE_AS_EXPERIMENTAL_API,
  useMockByDefault,
  NetworkObject,
  autoref,
  validateShareMDataPermissions,
  getSafeAppLibFilename,
  getSystemUriLibFilename
};

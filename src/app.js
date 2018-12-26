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


const { EventEmitter } = require('events');
const { autoref } = require('./helpers');
const api = require('./api');
const lib = require('./native/lib');
const consts = require('./consts');
const errConst = require('./error_const');
const makeError = require('./native/_error.js');
const { webFetch, fetch } = require('./web_fetch.js');
const { EXPOSE_AS_EXPERIMENTAL_API } = require('./helpers');

const EXPERIMENTAL_APIS = ['web'];

/**
* @private
* Validates appInfo and properly handles error
*/
const validateAppInfo = (_appInfo) => {
  const appInfo = _appInfo;
  const appInfoMustHaveProperties = ['id', 'name', 'vendor'];
  const hasCorrectProperties = appInfoMustHaveProperties.every((prop) => {
    if (appInfo && appInfo[prop]) {
      appInfo[prop] = appInfo[prop].trim();
      return Object.prototype.hasOwnProperty.call(appInfo, prop) && appInfo[prop];
    }

    return false;
  });

  if (!hasCorrectProperties) {
    throw makeError(errConst.MALFORMED_APP_INFO.code, errConst.MALFORMED_APP_INFO.msg);
  }
};

/**
* @private
* Init logging on the underlying library only if it wasn't done already
*/
const initLogging = (appInfo, options) => {
  if (options.log && !SAFEApp.logFilePath) {
    let filename = `${appInfo.name}.${appInfo.vendor}`.replace(/[^\w\d_\-.]/g, '_');
    filename = `${filename}.log`;
    return lib.app_init_logging(filename)
      .then(() => lib.app_output_log_path(filename))
      .then((logPath) => { SAFEApp.logFilePath = logPath; })
      .catch((err) => {
        throw makeError(errConst.LOGGER_INIT_ERROR.code, errConst.LOGGER_INIT_ERROR.msg(err));
      });
  }
};

/**
* @private
* Set additional search path for the config files if it was requested in
* the options. E.g. log.toml and crust.config files will be search
* in this additional search path.
*/
const setSearchPath = (options) => {
  if (options.configPath) {
    return lib.app_set_additional_search_path(options.configPath)
      .catch((err) => {
        throw makeError(errConst.CONFIG_PATH_ERROR.code, errConst.CONFIG_PATH_ERROR.msg(err));
      });
  }
};

/**
 * Holds a session with the network and is the primary interface to interact
 * with the network
 * @example
 * const safe = require( '@maidsafe/safe-node-app' );
 *
 * const appInfo = {
 *     id     : 'net.maidsafe.example',
 *     name   : 'Example SAFE App',
 *     vendor : 'MaidSafe.net Ltd'
 * };
 *
 * const networkStateCallback = (state) => {
 *     console.log('Network state change event: ', state);
 * };
 *
 * const initialisationOptions = {
 *     log            : true,
 *     registerScheme : false
 * };
 *
 * const asyncFn = async () => {
 *     try {
 *         const app = await safe.initialiseApp(
 *             appInfo,
 *             networkStateCallBack,
 *             initialisationOptions
 *         );
 *     } catch (err) {
 *         throw err;
 *     }
 * };
 */
class SAFEApp extends EventEmitter {

  /**
  * @hideconstructor
  * Initiate a new SAFEApp instance. Wire up all the API's and set up the
  * authentication URI-handler with the system.
  *
  * @param {AppInfo} appInfo
  * @param {Function} [networkStateCallBack=null] optional callback function
  * to receive network state updates
  * @param {InitOptions} [options] initilalisation options
  */
  constructor(appInfo, networkStateCallBack, options) {
    super();
    validateAppInfo(appInfo);
    this.options = Object.assign({
      log: true,
      registerScheme: true,
      configPath: null,
      forceUseMock: false,
      enableExperimentalApis: false,
    }, options);

    if (typeof this.options.forceUseMock !== 'boolean') {
      throw new Error('The \'forceUseMock\' option must be a boolean.');
    }

    if (typeof this.options.enableExperimentalApis !== 'boolean') {
      throw new Error('The \'enableExperimentalApis\' option must be a boolean.');
    }

    lib.init(this.options);
    this._appInfo = appInfo;
    this.networkState = consts.NET_STATE_INIT;
    if (networkStateCallBack) {
      this._networkStateCallBack = networkStateCallBack;
    }
    this.connection = null;
    Object.getOwnPropertyNames(api).forEach((key) => {
      this[`_${key}`] = new api[key](this);

      if (EXPERIMENTAL_APIS.includes(key)) {
        Object.getOwnPropertyNames(api[key].prototype).forEach((experimentalApi) => {
          if (experimentalApi === 'constructor') {
            // dont mess with this...
            return;
          }
          const cachedProtoProp = this[`_${key}`][experimentalApi].bind(this[`_${key}`]);

          this[`_${key}`][experimentalApi] = (...args) => EXPOSE_AS_EXPERIMENTAL_API.call(this, cachedProtoProp, ...args);
        });
      }
    });
  }

  async init() {
    await initLogging(this.appInfo, this.options);
    await setSearchPath(this.options);
  }

  /**
   * Get an {@link AuthInterface} instance
   * @returns {AuthInterface}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const app = await safe.initialiseApp(appInfo);
   *         const auth = app.auth;
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  get auth() {
    return this._auth;
  }

  /**
   * Get a {@link WebInterface} interface
   * @returns {WebInterface}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const app = await safe.initialiseApp(appInfo);
   *         const web = app.web;
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  get web() {
    return this._web;
  }

  /**
   * Get a {@link CryptoInterface} interface
   * @returns {CryptoInterface}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const app = await safe.initialiseApp(appInfo);
   *         const crypto = app.crypto;
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  get crypto() {
    return this._crypto;
  }

  /**
   * Get a {@link CipherOptInterface} interface
   * @returns {CipherOptInterface}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const app = await safe.initialiseApp(appInfo);
   *         const cipherOpt = app.cipherOpt;
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  get cipherOpt() {
    return this._cipherOpt;
  }

  /**
   * Get an {@link ImmutableDataInterface}
   * @returns {ImmutableDataInterface}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const app = await safe.initialiseApp(appInfo);
   *         const immutableData = app.immutableData;
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  get immutableData() {
    return this._immutableData;
  }

  /**
   * Get a {@link MutableDataInterface}
   * @returns {MutableDataInterface}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const app = await safe.initialiseApp(appInfo);
   *         const mutableData = app.mutableData;
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  get mutableData() {
    return this._mutableData;
  }

  /**
   * Function to lookup a given `safe://`-URL in accordance with the
   * public name resolution and find the requested network resource.
   *
   * @param {String} url the url you want to fetch
   * @param {WebFetchOptions} [options=null] additional options
   * @throws {ERR_SERVICE_NOT_FOUND|ERR_NO_SUCH_DATA|ERR_CONTENT_NOT_FOUND
   * |ERR_NO_SUCH_ENTRY|ERR_FILE_NOT_FOUND|MISSING_URL|INVALID_URL}
   * @returns {Promise<{ body: Buffer, headers: Object }>}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   const app = await safe.initialiseApp(appInfo);
   *   const unRegisteredUri = await app.auth.genConnUri();
   *   await app.auth.loginFromUri(unRegisteredUri);
   *   const webFetchOptions = {
   *       range: {
   *           start:safe.CONSTANTS.NFS_FILE_START,
   *           end: safe.CONSTANTS.NFS_FILE_END
   *       }
   *   };
   *   try {
   *     const data = await app.webFetch(
   *       'safe://home.safenetwork',
   *       webFetchOptions
   *     );
   *     // Alternatively, fetch an ImmutableData XOR-URL such as:
   *     // safe://hygkdkftyhkmzma5cjwgcghws9hyorcucqyqna1uaje68hyquah7nd9kh3rjy
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  webFetch(url, options) {
    return webFetch.call(this, url, options);
  }

  /**
   * Experimental function to lookup a given `safe://`-URL in accordance with the
   * public name resolution and find the requested network resource.
   *
   * @param {String} url the url you want to fetch
   * @throws {ERR_SERVICE_NOT_FOUND|ERR_NO_SUCH_DATA|ERR_CONTENT_NOT_FOUND
   * |ERR_NO_SUCH_ENTRY|ERR_FILE_NOT_FOUND|MISSING_URL|INVALID_URL}
   * @returns {Promise<NetworkResource>} the network resource found from the passed URL
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   // If you have an XOR-URL with a type tag, and therefore represents MutableData,
   *   // use this operation to fetch an interface to the underlying data structure.
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const unRegisteredUri = await app.auth.genConnUri();
   *     await app.auth.loginFromUri(unRegisteredUri);
   *     const data = await app.fetch(
   *         'safe://hyfktcerbwpctjz6ws8468hncw1ddpzrz65z3mapzx9wr413r7gj3w6yt5y:15001'
   *     );
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  fetch(url) {
    return fetch.call(this, url);
  }

  /**
   * @private
   * Replace the connection to the native layer. When there is already one
   * set up for the current app, free it on the native layer. Should only be
   * used at startup/beginning as it will devaluate all handlers that might
   * still be around after switching.
   *
   * @param {Pointer} conn the pointer to the native object
   */
  set connection(conn) {
    if (this._connection) {
      lib.app_free(this._connection);
    }
    this._connection = conn;
  }

  /**
   * Returns pointer to current connection object held in memory.
   * @throws {SETUP_INCOMPLETE}
   * @returns {Pointer}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const connection = app.connection;
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  get connection() {
    if (!this._connection) {
      throw makeError(errConst.SETUP_INCOMPLETE.code, errConst.SETUP_INCOMPLETE.msg);
    }
    return this._connection;
  }

  /**
  * @private
  * Set the new network state based on the state code provided.
  *
  * @param {Number} state
  */
  set networkState(state) {
    this._networkState = state;
  }

  /**
   * Textual representation of the current network connection state.
   *
   * @returns {String} current network connection state
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const networkState = app.networkState;
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  get networkState() {
    // Although it should never happen, if the state code is invalid
    // we return the current network conn state as 'Unknown'.
    let currentState = 'Unknown';
    switch (this._networkState) {
      case consts.NET_STATE_INIT:
        currentState = 'Init';
        break;
      case consts.NET_STATE_DISCONNECTED:
        currentState = 'Disconnected';
        break;
      case consts.NET_STATE_CONNECTED:
        currentState = 'Connected';
        break;
      default:
        break;
    }
    return currentState;
  }

  /**
   * Returns true if current network connection state is INIT.
   * This is state means the library has been initialised but there is no
   * connection made with the network yet.
   *
   * @returns {Boolean}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const isNetStateInit = app.isNetStateInit();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  isNetStateInit() {
    return this._networkState === consts.NET_STATE_INIT;
  }

  /**
   * Returns true if current network connection state is CONNECTED.
   *
   * @returns {Boolean}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const isNetStateConnected = app.isNetStateConnected();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  isNetStateConnected() {
    return this._networkState === consts.NET_STATE_CONNECTED;
  }

  /**
   * Returns true if current network connection state is DISCONNECTED.
   *
   * @returns {Boolean}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const isNetStateDisconnected = app.isNetStateDisconnected();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  isNetStateDisconnected() {
    return this._networkState === consts.NET_STATE_DISCONNECTED;
  }

  /**
   * Returns the {@link AppInfo} used to initialise current app.
   * @returns {AppInfo}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const appInfo = app.appInfo;
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  get appInfo() {
    return this._appInfo;
  }

  /**
   * Generate the log path for the provided filename.
   * If the filename provided is null, it then returns
   * the path of where the safe_core log file is located.
   * @param {String} [logFilename] optional log filename to generate the path
   *
   * @returns {Promise<String>}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const logPath = await app.logPath();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  logPath(logFilename) { // eslint-disable-line class-methods-use-this
    const filename = logFilename;
    if (!logFilename) {
      return Promise.resolve(SAFEApp.logFilePath);
    }
    return lib.app_output_log_path(filename);
  }

  /**
  * @typedef {Object} AccountInfo
  * Holds the information about the account.
  * @property {Number} mutations_done - number of mutations performed
  * with this account
  * @property {Number} mutations_available - number of remaining mutations
  * allowed for this account
  */

  /**
   * Returns account information, specifically, number of mutations done and available.
   *
   * @returns {Promise<AccountInfo>}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const getAccountInfo = await app.getAccountInfo();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  getAccountInfo() {
    return lib.app_account_info(this.connection);
  }

  /**
   * @private
   * Create a {@link SAFEApp} and try to login it through the `authUri`
   * @param {AppInfo} appInfo - the AppInfo
   * @param {String} authUri - URI containing the authentication info
   * @param {Function} [networkStateCallBack=null] optional callback function
   * to receive network state updates
   * @param {InitOptions}  initialisation options
   * @returns {Promise<SAFEApp>} Authenticated {@link SAFEApp}
   */
  static async fromAuthUri(appInfo, authUri, networkStateCallBack, options) {
    const app = autoref(new SAFEApp(appInfo, networkStateCallBack, options));
    await app.init();
    return app.auth.loginFromUri(authUri);
  }

  /**
   * Returns the name of the app's own container.
   *
   * @returns {Promise<String>}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const rootContainerName = await app.getOwnContainerName();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  getOwnContainerName() {
    return lib.app_container_name(this.appInfo.id);
  }

  /**
  * @private
  * Called from the native library whenever the network state
  * changes.
  */
  _networkStateUpdated(userData, newState) {
    const prevState = this.networkState;
    this.networkState = newState;
    this.emit('network-state-updated', this.networkState, prevState);
    this.emit(`network-state-${this.networkState}`, prevState);
    if (this._networkStateCallBack) {
      this._networkStateCallBack.apply(this._networkStateCallBack, [this.networkState]);
    }
  }

  /**
   * Reconnect to the network.
   * Must be invoked when the client decides to connect back after the connection was lost.
   * @returns {Promise}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     await app.reconnect();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  reconnect() {
    return lib.app_reconnect(this);
  }

  /**
  * @private
  * free the app. used by the autoref feature
  * @param {SAFEApp} app - the app to free
  */
  static free(app) {
    // we are freed last, anything you do after this
    // will probably fail.
    lib.app_free(app.connection);
  }

  /**
   * Resets the object cache kept by the underlying library.
   * @returns {Promise}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     await app.clearObjectCache();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  clearObjectCache() {
    return lib.app_reset_object_cache(this.connection);
  }

  /**
   * Returns true if the underlyging library was compiled against mock routing.
   * @returns {Boolean}
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   *
   * const appInfo = {
   *     id     : 'net.maidsafe.example',
   *     name   : 'Example SAFE App',
   *     vendor : 'MaidSafe.net Ltd'
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const isMock = await app.appIsMock();
   *   } catch(err) {
   *     throw err;
   *   }
   * };
   */
  appIsMock() { // eslint-disable-line class-methods-use-this
    return lib.app_is_mock();
  }
}

SAFEApp.logFilename = null;

module.exports = SAFEApp;

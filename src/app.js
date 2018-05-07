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
const webFetch = require('./web_fetch.js');

/**
* Validates appInfo and properly handles error
*/
const validateAppInfo = (_appInfo) => {
  const appInfo = _appInfo;
  const appInfoMustHaveProperties = ['id', 'name', 'vendor'];
  let bool = false;
  const hasCorrectProperties = appInfoMustHaveProperties.every((prop) => {
    if (appInfo && appInfo[prop]) {
      appInfo[prop] = appInfo[prop].trim();
      bool = Object.prototype.hasOwnProperty.call(appInfo, prop) && appInfo[prop];
    }

    return bool;
  });

  if (!hasCorrectProperties) {
    throw makeError(errConst.MALFORMED_APP_INFO.code, errConst.MALFORMED_APP_INFO.msg);
  }
};

/**
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
        throw makeError(errConst.LOGGER_INIT_ERR.code, errConst.LOGGER_INIT_ERR.msg(err));
      });
  }
};

/**
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
 * Holds one sessions with the network and is the primary interface to interact
 * with the network. As such it also provides all API-Providers connected through
 * this session.
 */
class SAFEApp extends EventEmitter {

  /**
  * @private
  * Initiate a new App instace. Wire up all the API's and set up the
  * authentication URI-handler with the system.
  *
  * @param {AppInfo} appInfo
  * @param {Function} [networkStateCallBack=null] optional callback function
  * to receive network state updates
  * @param {InitOptions} initilalisation options
  */
  constructor(appInfo, networkStateCallBack, options) {
    super();
    validateAppInfo(appInfo);
    this.options = Object.assign({
      log: true,
      registerScheme: true,
      configPath: null
    }, options);
    lib.init(this.options);
    this._appInfo = appInfo;
    this.networkState = consts.NET_STATE_INIT;
    if (networkStateCallBack) {
      this._networkStateCallBack = networkStateCallBack;
    }
    this.connection = null;
    Object.getOwnPropertyNames(api).forEach((key) => {
      this[`_${key}`] = new api[key](this);
    });
  }

  async init() {
    await initLogging(this.appInfo, this.options);
    await setSearchPath(this.options);
  }


  /**
  * get the AuthInterface instance connected to this session
  * @returns {AuthInterface}
  */
  get auth() {
    return this._auth;
  }

  /**
  * get the Crypto instance connected to this session
  * @returns {CryptoInterface}
  */
  get crypto() {
    return this._crypto;
  }

  /**
  * get the CipherOptInterface instance connected to this session
  * @returns {CipherOptInterface}
  */
  get cipherOpt() {
    return this._cipherOpt;
  }

  /**
  * get the ImmutableDataInterface instance connected to this session
  * @returns {ImmutableDataInterface}
  */
  get immutableData() {
    return this._immutableData;
  }

  /**
  * get the MutableDataInterface instance connected to this session
  * @returns {MutableDataInterface}
  */
  get mutableData() {
    return this._mutableData;
  }

  webFetch(url, options) {
    return webFetch.call(this, url, options);
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
  * The current connection object hold on the Rust-Side
  * @returns {Pointer}
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
  */
  isNetStateInit() {
    return this._networkState === consts.NET_STATE_INIT;
  }

  /**
  * Returns true if current network connection state is CONNECTED.
  *
  * @returns {Boolean}
  */
  isNetStateConnected() {
    return this._networkState === consts.NET_STATE_CONNECTED;
  }

  /**
  * Returns true if current network connection state is DISCONNECTED.
  *
  * @returns {Boolean}
  */
  isNetStateDisconnected() {
    return this._networkState === consts.NET_STATE_DISCONNECTED;
  }

  /**
  * The current appInfo
  */
  get appInfo() {
    return this._appInfo;
  }

  /**
  * Generate the log path for the provided filename.
  * If the filename provided is null, it then returns
  * the path of where the safe_core log file is located.
  * @param {String} [logFilename=null] optional log filename to generate the path
  *
  * @returns {Promise<String>}
  */
  /* eslint-disable class-methods-use-this */
  logPath(logFilename) {
    const filename = logFilename;
    if (!logFilename) {
      return Promise.resolve(SAFEApp.logFilePath);
    }
    return lib.app_output_log_path(filename);
  }

  /**
  * @typedef {Object} AccountInfo
  * Holds the information about the account.
  * @param {Number} mutations_done - number of mutations performed
  * with this account
  * @param {Number} mutations_available - number of remaining mutations
  * allowed for this account
  */

  /**
  * Returns account information, e.g. number of mutations done and available.
  *
  * @returns {Promise<AccountInfo>}
  */
  getAccountInfo() {
    return lib.app_account_info(this.connection);
  }

  /**
  * Create a SAFEApp and try to login it through the `authURI`
  * @param {AppInfo} appInfo - the AppInfo
  * @param {String} authURI - URI containing the authentication info
  * @param {Function} [networkStateCallBack=null] optional callback function
  * to receive network state updates
  * @param {InitOptions}  initialisation options
  * @returns {Promise<SAFEApp>} authenticated and connected SAFEApp
  */
  static async fromAuthUri(appInfo, authUri, networkStateCallBack, options) {
    const app = autoref(new SAFEApp(appInfo, networkStateCallBack, options));
    await app.init();
    return app.auth.loginFromURI(authUri);
  }

  /**
  * Returns the name of the app's own container.
  *
  * @returns {Promise<String>}
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
  * Reconnect to the metwork
  * Must be invoked when the client decides to connect back after the connection was lost.
  */
  reconnect() {
    return lib.app_reconnect(this.connection)
      .then(() => this._networkStateUpdated(null, consts.NET_STATE_CONNECTED));
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
  * Resets the object cache kept by the underlyging library.
  */
  clearObjectCache() {
    return lib.app_reset_object_cache(this.connection);
  }

  /**
  * Retuns true if the underlyging library was compiled against mock-routing.
  */
  isMockBuild() {
    return lib.is_mock_build();
  }
}

SAFEApp.logFilename = null;

module.exports = SAFEApp;

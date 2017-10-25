const { EventEmitter } = require('events');
const { autoref } = require('./helpers');
const api = require('./api');
const lib = require('./native/lib');
const { parse: parseUrl } = require('url');
const consts = require('./consts');
const makeFfiError = require('./native/_error.js');
const errConst = require('./error_const');

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
    this.options = Object.assign({
      log: true,
      registerScheme: true
    }, options);
    lib.init(this.options);
    this._appInfo = appInfo;
    this.validateAppInfo();
    this.networkState = consts.NET_STATE_INIT;
    if (networkStateCallBack) {
      this._networkStateCallBack = networkStateCallBack;
    }
    this.connection = null;
    Object.getOwnPropertyNames(api).forEach((key) => {
      this[`_${key}`] = new api[key](this);
    });

    if (this.options.log && !SAFEApp.logFilePath) {
      let filename = `${appInfo.name}.${appInfo.vendor}`.replace(/[^\w\d_\-.]/g, '_');
      filename = `${filename}.log`;
      lib.app_init_logging(filename)
        .then(() => lib.app_output_log_path(filename))
        .then((logPath) => { SAFEApp.logFilePath = logPath; })
        .catch((err) => { console.error('Logger initilalisation failed', err); });
    }
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

  /*
  * Validates appInfo and properly handles error
  */
  validateAppInfo() {
    const appInfo = this._appInfo;
    const appInfoMustHaveProperties = ['id', 'name', 'vendor'];
    let bool = false;
    const hasCorrectProperties = appInfoMustHaveProperties.every((prop) => {
      if (appInfo[prop]) {
        appInfo[prop] = appInfo[prop].trim();
      }

      bool = Object.prototype.hasOwnProperty.call(appInfo, prop) && appInfo[prop];
      return bool;
    });

    if (!hasCorrectProperties) {
      throw makeFfiError(errConst.MALFORMED_APP_INFO.code, errConst.MALFORMED_APP_INFO.msg);
    }
  }

  /**
  * Helper to lookup a given `safe://`-url in accordance with the
  * convention and find the requested object.
  *
  * @arg {String} url the url you want to fetch
  * @returns {Promise<File>} the file object found for that URL
  */
  webFetch(url) {
    if (!url) return Promise.reject(new Error('No URL provided.'));
    const parsedUrl = parseUrl(url);
    if (!parsedUrl) return Promise.reject(new Error('Not a proper URL!'));
    const hostname = parsedUrl.hostname;
    let path = parsedUrl.pathname ? decodeURI(parsedUrl.pathname) : '';

    const tokens = path.split('/');
    if (!tokens[tokens.length - 1] && tokens.length > 1) { tokens.pop(); }

    if (!tokens[tokens.length - 1].split('.')[1]) {
      tokens.push(consts.INDEX_HTML);
      path = tokens.join('/');
    }

    // lets' unpack
    const hostParts = hostname.split('.');
    const lookupName = hostParts.pop(); // last one is 'domain'
    const serviceName = hostParts.join('.'); // all others are 'service'

    return this.crypto.sha3Hash(lookupName)
      .then((address) => this.mutableData.newPublic(address, consts.TAG_TYPE_DNS)
        .then((mdata) => mdata.get(serviceName)
            .then((serviceBuffer) => {
              const service = serviceBuffer.buf.toString();

              if (service.length < 1) {
                const error = new Error();
                error.code = -106;
                throw error;
              }
              return serviceBuffer;
            })
            .catch((err) => {
              // Error code -106 coresponds to 'Requested entry not found'
              if (err.code === -106) {
                if (!serviceName || !serviceName.length) {
                  return mdata.get('www');
                }
                return Promise.reject(new Error('Service not found'));
              }
              return Promise.reject(err);
            })
          .then((value) => this.mutableData.fromSerial(value.buf)
              .catch(() => this.mutableData.newPublic(value.buf, consts.TAG_TYPE_WWW)))
          .then((service) => service.emulateAs('NFS'))
          .then((emulation) => emulation.fetch(path)
            .catch((err) => {
              // Error codes -305 and -301 correspond to 'NfsError::FileNotFound'
              if (err.code === -305 || err.code === -301) {
                let newPath;
                if (path[path.length - 1] === '/') {
                  newPath = `${path}${consts.INDEX_HTML}`;
                } else if (path[0] === '/') {
                  // directly try the non-slash version
                  return emulation.fetch(path.slice(1, path.length))
                  .catch((e) => {
                    // NOTE: This catch block handles the cases where a user intends/
                    // to fetch a path without index.html
                    // For clarification, comment out lines 132 through 143/
                    // then run mocha in ../test/browsing.js to see which/
                    // cases fail.
                    const pathArray = path.split('/');
                    if (pathArray[pathArray.length - 1] === consts.INDEX_HTML) {
                      pathArray.pop();
                      return emulation.fetch(pathArray.join('/'));
                    }
                    return Promise.reject(e);
                  });
                }

                if (newPath) {
                  // try the newly created path
                  return emulation.fetch(newPath).catch((e) => {
                    // and the version without the leading slash
                    if (e.code === -305 || e.code === -301) {
                      return emulation.fetch(newPath.slice(1, newPath.length));
                    }
                    return Promise.reject(e);
                  });
                }
              }
              return Promise.reject(err);
            })
            .then((file) => emulation.open(file, consts.pubConsts.NFS_FILE_MODE_READ))
            .then((openFile) => openFile.read(
                consts.pubConsts.NFS_FILE_START, consts.pubConsts.NFS_FILE_END))
          )));
  }


  /**
  * @private
  * Replace the connection to the native layer. When there is already one
  * set up for the current app, free it on the native layer. Should only be
  * used at startup/beginning as it will devaluate all handlers that might
  * still be around after switching.
  *
  * @param {Pointer} con - the pointer to the native object
  */
  set connection(con) {
    if (this._connection) {
      lib.app_free(this._connection);
    }
    this._connection = con;
  }

  /**
  * The current connection object hold on the Rust-Side
  * @returns {Pointer}
  */
  get connection() {
    if (!this._connection) throw Error('Setup Incomplete. Connection not available yet.');
    return this._connection;
  }

  /**
  * @private
  * Set the new network state based on the state code provided.
  *
  * @param {String} state
  */
  set networkState(state) {
    switch (state) {
      case consts.NET_STATE_INIT:
        this._networkState = 'Init';
        break;
      case consts.NET_STATE_DISCONNECTED:
        this._networkState = 'Disconnected';
        break;
      case consts.NET_STATE_CONNECTED:
        this._networkState = 'Connected';
        break;
      case consts.NET_STATE_UNKNOWN:
      default:
        this._networkState = 'Unknown';
    }
  }

  /**
  * The current Network state
  * @returns {String} of latest state
  */
  get networkState() {
    return this._networkState;
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
  * Create a SAFEApp and try to login it through the `authUri`
  * @param {AppInfo} appInfo - the AppInfo
  * @param {String} authUri - URI containing the authentication info
  * @param {Function} [networkStateCallBack=null] optional callback function
  * to receive network state updates
  * @param {InitOptions}  initialisation options
  * @returns {Promise<SAFEApp>} authenticated and connected SAFEApp
  */
  static fromAuthUri(appInfo, authUri, networkStateCallBack, options) {
    const app = autoref(new SAFEApp(appInfo, networkStateCallBack, options));
    return app.auth.loginFromURI(authUri);
  }

  /**
  * @private
  * Called from the native library whenever the network state
  * changes.
  */
  _networkStateUpdated(uData, result, newState) {
    const prevState = this.networkState;
    if (result.error_code !== 0) {
      console.error('An error was reported from network state observer: ', result.error_code, result.error_description);
      this.networkState = consts.NET_STATE_UNKNOWN;
    } else {
      this.networkState = newState;
    }

    this.emit('network-state-updated', this.networkState, prevState);
    this.emit(`network-state-${this.networkState}`, prevState);
    if (this._networkStateCallBack) {
      this._networkStateCallBack.apply(this._networkStateCallBack, [this.networkState]);
    }
  }

  /**
  * Reconnect to the metwork
  * Must be invoked when the client decides to connect back after the connection is disconnected.
  */
  reconnect() {
    return lib.app_reconnect(this.connection);
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

}

SAFEApp.logFilename = null;

module.exports = SAFEApp;

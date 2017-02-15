const EventEmitter = require('events').EventEmitter;
const autoref = require('./helpers').autoref;
const api = require('./api');
const lib = require('./native/lib');
const crypto = require('crypto');
const parseUrl = require('url').parse;
const consts = require('./consts');


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
  */
  constructor(appInfo) {
    super();
    this._appInfo = appInfo;
    this._networkState = 'init';
    this._connection = null;
    Object.getOwnPropertyNames(api).forEach((key) => {
      this[`_${key}`] = new api[key](this);
    });
  }

  /**
  * get the AuthInterface instance connected to this session
  * @returns {AuthInterface}
  **/
  get auth() {
    return this._auth;
  }


  /**
  * get the CipherOptInterface instance connected to this session
  * @returns {CipherOptInterface}
  **/
  get cipherOpt() {
    return this._cipherOpt;
  }

  /**
  * get the ImmutableDataInterface instance connected to this session
  * @returns {ImmutableDataInterface}
  **/
  get immutableData() {
    return this._immutableData;
  }

  /**
  * get the MutableDataInterface instance connected to this session
  * @returns {MutableDataInterface}
  **/
  get mutableData() {
    return this._mutableData;
  }

  /**
  * Helper to lookup a given `safe://`-url in accordance with the
  * convention and find the requested object.
  *
  * @arg {String} url the url you want to fetch
  * @returns {Promise<File>} the file object found for that URL
  */
  webFetch(url) {
    const parsedUrl = parseUrl(url);
    if (!parsedUrl) return Promise.reject(new Error('Not a proper URL!'));

    const hostname = parsedUrl.hostname;
    const path = parsedUrl.pathname || '';
    // lets' unpack
    const hostParts = hostname.split('.');
    const lookupName = hostParts.pop(); // last one is 'domain'
    const serviceName = hostParts.join('.'); // all others are 'service'
    const address = crypto.createHash('sha256').update(lookupName).digest();

    return this.mutableData.newPublic(address, consts.TAG_TYPE_DNS)
      .then((mdata) => mdata.get(serviceName)
          .catch((err) => {
            if ((err.name === 'ERR_NO_SUCH_ENTRY') && (!serviceName || !serviceName.length)) {
              return mdata.get('www');
            }
            return Promise.reject(err);
          })
        .then((value) => this.mutableData.newPublic(value.buf, consts.TAG_TYPE_WWW))
        .then((service) => service.emulateAs('NFS'))
        .then((emulation) => emulation.fetch(path)
          .catch((err) => {
            if (err.name === 'ERR_FILE_NOT_FOUND') {
              let newPath;
              if (!path || !path.length) {
                newPath = '/index.html';
              } else if (path[path.length - 1] === '/') {
                newPath = `${path}index.html`;
              } else if (path[0] === '/') {
                // directly try the non-slash version
                return emulation.fetch(path.slice(1, path.length));
              }

              if (newPath) {
                // try the newly created path
                return emulation.fetch(newPath).catch((e) => {
                  // and the version without the leading slash
                  if (e.name === 'ERR_FILE_NOT_FOUND') {
                    return emulation.fetch(newPath.slice(1, path.length));
                  }
                  return Promise.reject(e);
                });
              }
            }
            return Promise.reject(err);
          })));
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
      lib.free_app(this._connection);
    }
    this._connection = con;
  }

  /**
  * The current connection object hold on the Rust-Side
  * @returns {Pointer}
  **/
  get connection() {
    if (!this._connection) throw Error('Setup Incomplete. Connection not available yet.');
    return this._connection;
  }

  /**
  * The current Network state
  * @returns {String} of latest state
  **/
  get networkState() {
    return this._networkState;
  }

  /**
  * The current appInfo
  **/
  get appInfo() {
    return this._appInfo;
  }

  /**
  * Create a SAFEApp and try to login it through the `authUri`
  * @param {AppInfo} appInfo - the AppInfo
  * @param {String} authUri - URI containing the authentication info
  * @returns {Promise<SAFEApp>} authenticated and connected SAFEApp
  **/
  static fromAuthUri(appInfo, authUri) {
    const app = autoref(new SAFEApp(appInfo));
    return app.auth.loginFromURI(authUri);
  }


  /**
  * @private
  * Called from the native library whenever the network state
  * changes.
  */
  _networkStateUpdated(uData, error, newState) {
    // FIXME: we need to map the state to strings
    this.emit('network-state-updated', newState, this._networkState);
    this.emit(`network-state-${newState}`, this._networkState);
    this._networkState = newState;
  }


  /**
  * @private
  * free the app. used by the autoref feature
  * @param {SAFEApp} app - the app to free
  */
  static free(app) {
    // we are freed last, anything you do after this
    // will probably fail.
    lib.free_app(app.connection);

    // in the hopes, this all cleans up,
    // before we do in a matter of seconds from now
  }

}
module.exports = SAFEApp;

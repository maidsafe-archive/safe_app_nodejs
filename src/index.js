
const App = require('./app');
const autoref = require('./helpers').autoref;
const version = require('../package.json').version;

/**
* @typedef {Object} AppInfo
* holds the information about this app, needed for authentication.
* @param {String} id - unique identifier for the app
*        (e.g. 'net.maidsafe.examples.mail-app')
* @param {String} name - human readable name of the app (e.g. "Mail App")
* @param {String} vendor - human readable name of the vendor
*        (e.g. "MaidSafe Ltd.")
* @param {String=} scope - an optional scope of this instance
* @param {String=} customExecPath - an optional customised execution path
*        to use when registering the URI with the system.
**/

/**
 * The main entry point to create a new SAFEApp
 * @param {AppInfo} appInfo
 * @param {Function} [networkStateCallBack=null]  optional callback function to receive network state updates
 * @returns {Promise<SAFEApp>} promise to a SAFEApp instance
 * @example // Usage Example
 * const safe = require('safe');
 *
 * // starting initialisation
 * let prms = safe.initializeApp({
 *                      id: "net.maidsafe.example",
 *                      name: 'Example App',
 *                      vendor: 'MaidSafe Ltd.'
 *                     });
 * // we want read-append access to `_pictures` and
 * // read access to `_videos`:
 * const containers = { '_videos': ['Read'], '_pictures' : ['Read', 'Insert']}
 * prms.then(app => app.auth.genAuthUri(containers
 *           ).then(uri => app.auth.openUri(uri)
 *        // now we either quit the programm
 *        // or wait for a result url
 *        ))
 */
function initializeApp(appInfo, networkStateCallBack) {
  const app = autoref(new App(appInfo, networkStateCallBack));
  return Promise.resolve(app);
}


/**
 * If you have received a response URI (which you are allowed
 * to store securely), you can directly get an authenticated or non-authenticated
 * connection by using this helper function. Just provide said URI as the
 * second value.
 * @param {AppInfo} appInfo - the app info
 * @param {String} authUri - the URI coming back from the Authenticator
 * @param {Function} [networkStateCallBack=null]  optional callback function to receive network state updates
 * @returns {Promise<SAFEApp>} promise to a SAFEApp instance
 */
function fromAuthURI(appInfo, authUri, networkStateCallBack) {
  return App.fromAuthUri(appInfo, authUri, networkStateCallBack);
}

module.exports = {
  VERSION: version,
  initializeApp,
  fromAuthURI
};

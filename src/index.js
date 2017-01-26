
const App = require('./app');
const autoref = require('./helpers').autoref;
const version = require('../packages.json').version;

/**
 * The main entry point to create a new SAFEApp 
 * @arg appInfo
 * @return {Promise(SafeApp)} promise to a SAFEApp instance
 * @example // Usage Example
 * const safe = require('safe');
 * const lib = require('safe/native/lib');
 * 
 * // starting initialisation
 * let prms = safe.initializeApp({
 *                      id: "net.maidsafe.example",
 *                      name: 'Example App',
 *                      vendor: 'MaidSafe Ltd.'
 *                     });
 * // we want read-append access to `_pictures` and 
 * // read access to `_videos`: 
 * const containers = { '_videos': 'READ', '_pictures' : ['READ', 'INSERT']}
 * prms.then(app => app.auth.genAuthUri(containers
 *           ).then(uri => lib.openUri(uri)
 *        // now we either quit the programm
 *        // or wait for a result url
 *        ))
 */
function initializeApp(appInfo) {
    // FIXME: add auto-login features here later
    const app = autoref(new SAFEApp(appInfo));
    return Promise.resolve(app);
}


/**
 * If you have received a response URI (which you are allowed
 * to store securely), you can directly get an authenticated app
 * by using this helper function. Just provide said URI as the
 * second value.
 * @return {Promise(SafeApp)} promise to a SAFEApp instance
 */
function fromAuthURI(appInfo, responseUrl) {
  return App.fromAuthUri(appInfo, responseUrl);
}

module.exports = {
  VERSION: version,
  initializeApp,
  fromAuthURI
};

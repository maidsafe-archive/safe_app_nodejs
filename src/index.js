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


const App = require('./app');
const { autoref } = require('./helpers');
const { version } = require('../package.json');
const { pubConsts: CONSTANTS } = require('./consts.js');

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
*/

/**
* @typedef {Object} InitOptions
* holds the additional intialisation options for the App.
* @param {Boolean=} registerScheme to register auth scheme with the OS. Defaults to true
* @param {Array=} joinSchemes to additionally register custom protocol schemes
* @param {Boolean=} log to enable or disable back end logging. Defaults to true
* @param {String=} libPath path to the folder where the native libs can
*        be found. Defaults to current folder path.
* @param {String=} configPath set additional search path for the config files.
*        E.g. `log.toml` and `crust.config` files will be also searched not only
*        in the same folder where the native library is, but also in this
*        additional search path.
*/

/**
 * The entry point to create a new SAFEApp
 * @param {AppInfo} appInfo
 * @param {Function} [networkStateCallBack=null] callback function
 *        to receive network state updates
 * @param {InitOptions=} options initialisation options
 *
 * @returns {Promise<SAFEApp>} promise to a SAFEApp instance
 * @example // Usage Example
 * const safe = require('@maidsafe/safe-node-app');
 *
 * // starting initialisation
 * let prms = safe.initialiseApp({
 *                      id: "net.maidsafe.example",
 *                      name: 'Example SAFE App',
 *                      vendor: 'MaidSafe.net Ltd'
 *                     });
 * // we want read & insert access permissions for `_pictures` and
 * // read access to `_videos` container:
 * const containers = { '_videos': ['Read'], '_pictures' : ['Read', 'Insert']}
 * prms.then(app => app.auth.genAuthUri(containers)
 *                    .then(uri => app.auth.openUri(uri))
 *        // now we either quit the programm
 *        // or wait for an authorisation URI
 *        )
 */
const initialiseApp = async (appInfo, networkStateCallBack, options) => {
  try {
    const app = autoref(new App(appInfo, networkStateCallBack, options));
    await app.init();
    return Promise.resolve(app);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * If you have received a response URI (which you are allowed
 * to store securely), you can directly get an authenticated or non-authenticated
 * connection by using this helper function. Just provide said URI as the
 * second value.
 * @param {AppInfo} appInfo - the app info
 * @param {String} authUri - the URI coming back from the Authenticator
 * @param {Function} [networkStateCallBack=null] optional callback function
 * to receive network state updates
 * @param {InitOptions=} options initialisation options
 * @returns {Promise<SAFEApp>} promise to a SAFEApp instance
 */
const fromAuthUri = (appInfo, authUri, networkStateCallBack, options) =>
  App.fromAuthUri(appInfo, authUri, networkStateCallBack, options);

module.exports = {
  VERSION: version,
  initialiseApp,
  fromAuthUri,
  CONSTANTS
};

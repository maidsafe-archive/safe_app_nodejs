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
const { version: VERSION } = require('../package.json');
const { pubConsts: CONSTANTS } = require('./consts.js');

/**
* @typedef {Object} AppInfo
* holds the information about this app, needed for authentication.
* @property {String} id - unique identifier for the app
*        (e.g. 'net.maidsafe.examples.mail-app')
* @property {String} name - human readable name of the app (e.g. "Mail App")
* @property {String} vendor - human readable name of the vendor
*        (e.g. "MaidSafe Ltd.")
* @property {String=} scope - an optional scope of this instance
* @property {String=} customExecPath - an optional customised execution path
*        to use when registering the URI with the system.
*/

/**
* @typedef {Object} InitOptions
* holds the additional intialisation options for the SAFEApp.
* @property {Boolean=} registerScheme to register auth scheme with the OS. Defaults to true.
* @property {Array=} joinSchemes to additionally register custom protocol schemes
* @property {Boolean=} log to enable or disable back end logging. Defaults to true.
* @property {String=} libPath path to the folder where the native libs can
*        be found. Defaults to current folder path.
* @property {String=} configPath set additional search path for the config files.
*        E.g. `log.toml` and `crust.config` files will be also searched not only
*        in the same folder where the native library is, but also in this
*        additional search path.
* @property {Boolean=} forceUseMock to force the use of mock routing regardless
*        the NODE_ENV environment variable value. Defaults to false.
* @property {Boolean=} enableExperimentalApis to enable the experimental APIs
*        regardless if the --enable-experimental-apis flag was passed as argument
*        to the application. Defaults to false.
*/

/**
 * The entry point to create a new app interface; your gateway to the SAFE Network.
 * @param {AppInfo} appInfo
 * @param {Function} [networkStateCallBack=null] callback function
 *        to receive network state updates
 * @param {InitOptions=} options initialisation options
 * @throws {MALFORMED_APP_INFO|CONFIG_PATH_ERROR|LOGGER_INIT_ERROR}
 * @returns {Promise<SAFEApp>}
 * @example
 * const safe = require( '@maidsafe/safe-node-app' );
 *
 * const appInfo = {
 *     id     : 'net.maidsafe.example',
 *     name   : 'Example SAFE app',
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
 *     const app = await safe.initialiseApp(appInfo, networkStateCallBack, initialisationOptions);
 * };
 */
const initialiseApp = async (appInfo, networkStateCallBack, options) => {
  try {
    const theApp = new App(appInfo, networkStateCallBack, options);
    const app = autoref(
      theApp
    );
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
 * @returns {Promise<SAFEApp>}
 * @example
 * const safe = require( '@maidsafe/safe-node-app' );
 *
 * const appInfo = {
 *     id     : "net.maidsafe.example",
 *     name   : 'Example SAFE App',
 *     vendor : 'MaidSafe.net Ltd'
 * };
 *
 * const authUri = 'safe-bmv0lm1hawrzywzllmv4yw1wbgvzlm1hawx0dxrvcmlhba:bAEAAAABFXM
 * LAYAAAAAAAAAAAAAQAAAAAAAAAAAA3HDT6MW2I2ONLHINSHZ7TEVB5UFR5FTGLRDYHTHOZBLE4VOY4YE
 * QAAAAAAAAAAAAUKVTAUCVAVRI62LYLDCED6247VDIRBKDKPOU5U7ACCHTBXW5QBMQAAAAAAAAAAABSR3
 * MIOM7N7RPHMJ77TKJLBMXZEMUJ7NQENDIDR7FUUNRHCEXLUJAAAAAAAAAAAACMUEZ2VZGSW7PHOGXKAO
 * J2WMDQYO7MTDYCLB53EPMHQEV53GN72MZI5WEHGPW7YXTWE77ZVEVQWL4SGKE7WYCGRUBY7S2KGYTRCL
 * V2EIAAAAAAAAAAAAHFMV3PPIJ3JRGRDFGQOTEEI3T4O6MDSUWWZD6M362LF32UERHHMIAAAAAAAAAAAB
 * 6BXTI7JPJ7YPUDLF3GJ46TIYE4ZO5PMEU67E4H7P2ZOTX7K25GYAAAAAAAAAAAAAAAAAAAAAAAAAGNKL
 * O44TF4LNWEPNSFKM2MRO3UGACEFL4HEWU6NMLPKC4K5R54MGMDUAAAAAAAAAAYAAAAAAAAAAADQQ3KZO
 * AG5NUIDYGYZOKTDMD5HBBBBMVWEG6MOIBAAAAAAAAAAAAMAAAAAAAAAAAF64DVMJWGSY2OMFWWK44TAC
 * 3W4XO3IWKE2BUI5Y5MFBEQNCMCORP7PPVLEUIEI2LU6S3IC6MDUAAAAAAAAAABEAAAAAAAAAAABS6M7T
 * CINUPY7M3LGYYUTD2U6RAVJIFXHZQ3JB6RY6BHQ3KERGYJDAAAAAAAAAAAAT32X5YMSXEEZEYS43IWVH
 * Y4VF4PEA6QCFK7OA3QAAQAAAAAAAAAAAAAAAAAAEAAAABHAAAAAAAAAAAGC4DQOMXW4ZLUFZWWC2LEO
 * NQWMZJOMV4GC3LQNRSXGLTNMFUWY5DVORXXE2LBNS2Z3UNQDNYQEF6AN57ANLTJZHORXGZACTZLKSSCR
 * R6HEV7BHAWTTGB2AAAAAAAAAAASAAAAAAAAAAAAFLWOZVEC4MW4KEPKPWUJJL6EDUMEEPDQS3RSWCYYF
 * 67N3WIDS5IRQAAAAAAAAAAAGC2JU2Q4WPHO23VKPDSQMZLMHUTVC4C46LZV4HIAAUAAAAAAAAAAAAAAA
 * AAACAAAAABAAAAAAMAAAAAEAAAAAAI';
 *
 * const networkStateCallback = (state) => {
 *     console.log('Network state change event: ', state);
 * };
 *
 * const options = {
 *     log            : true,
 *     registerScheme : false
 * };
 *
 * const asyncFn = async () => {
 *    const app = await safe.fromAuthUri(appInfo, authUri, networkStateCallBack, options);
 * };
 */
const fromAuthUri = (appInfo, authUri, networkStateCallBack, options) =>
  App.fromAuthUri(appInfo, authUri, networkStateCallBack, options);

module.exports = {
  /**
   * @name VERSION
   * @type {String} NPM package version
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   * console.log( safe.VERSION );
   */
  VERSION,
  initialiseApp,
  fromAuthUri,
  /**
   * @name CONSTANTS
   * @type {Object}
   * @property {Number} NFS_FILE_MODE_OVERWRITE 1
   * @property {Number} NFS_FILE_MODE_APPEND 2
   * @property {Number} NFS_FILE_MODE_READ 4
   * @property {Number} NFS_FILE_START 0
   * @property {Number} NFS_FILE_END 0
   * @property {Number} USER_ANYONE 0
   * @property {String} MD_METADATA_KEY '_metadata'
   * @property {Number} MD_ENTRIES_EMPTY 0
   * @property {Number} MD_PERMISSION_EMPTY 0
   * @property {Number} GET_NEXT_VERSION 0
   * @example
   * const safe = require( '@maidsafe/safe-node-app' );
   * console.log( safe.CONSTANTS );
   */
  CONSTANTS
};

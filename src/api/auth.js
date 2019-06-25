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


const lib = require('../native/lib');
const nativeH = require('../native/helpers');
const types = require('../native/types');
const { useMockByDefault } = require('../helpers');
const { validateShareMDataPermissions } = require('../helpers');
const errConst = require('../error_const');
const makeError = require('../native/_error.js');

const makeAppInfo = nativeH.makeAppInfo;
const makePermissions = nativeH.makePermissions;
const makeShareMDataPermissions = nativeH.makeShareMDataPermissions;

/**
* @private
* Generates the app's URI converting the string into a base64 format, removing
* characters or symbols which are not valid for a URL like '=' sign,
* and making it lower case.
*/
const genAppUri = (str) => {
  const urlSafeBase64 = (Buffer.from(str))
    .toString('base64')
    .replace(/\+/g, '-') // Convert '+' to '-'
    .replace(/\//g, '_') // Convert '/' to '_'
    .replace(/=+$/, '') // Remove ending '='
    .toLowerCase();
  return `safe-${urlSafeBase64}`;
};

/**
* @private
* Prefix the URI with safe-auth protocol
*/
const addSafeAuthProtocol = (response) => {
  response.uri = `safe-auth:${response.uri}`; // eslint-disable-line no-param-reassign
  return response;
};

/**
* @private
* Remove 'safe' protocol from URI in order to be able to decode it.
* Also, remove any '/' characters that could have been added after the ':' by
* some OS like Fedora, making the URI invalid for decoding.
* This characters are not added by the authenticator, we therefore
* don't have much choice than just make sure we remove them from here.
* We also remove any whitespaces from the beginning or end of the string.
*/
const removeSafeProtocol = (uri) => uri.trim().replace(/^safe-[^:]*:?[/]*/g, '');

/**
* Contains all authentication related functionality
*/
class AuthInterface {
  /**
  * @hideconstructor
  */
  constructor(app) {
    this.app = app;
    this._registered = false;
    this.setupUri();
  }

  /**
  * @private
  * Generate the app's URI for the IPC protocol using the app's id
  * and register the URI scheme.
  */
  setupUri() {
    const appInfo = this.app.appInfo;
    const opts = this.app.options;
    let scheme;
    if (opts.registerScheme) {
      scheme = genAppUri(appInfo.id);
    }
    if (opts.joinSchemes && opts.joinSchemes.length > 0) {
      scheme = scheme ? [scheme].concat(opts.joinSchemes) : opts.joinSchemes;
    }
    if (scheme) {
      lib.registerUriScheme({
        bundle: appInfo.bundle ? appInfo.bundle : appInfo.id,
        vendor: appInfo.vendor,
        name: appInfo.name,
        icon: 'test',
        exec: appInfo.customExecPath }, scheme);
    }
  }

  /**
   * Whether or not this is a registered/authenticated session.
   *
   * @returns {Boolean} true if this is an authenticated session
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const isRegistered = app.auth.registered;
   */
  get registered() {
    return this._registered;
  }

  /**
   * Generate an authentication URI for the app with
   * the given permissions and optional parameters.
   *
   * @param {Object} permissions - mapping the container-names
   *                  to a list of permissions you want to
   *                  request
   * @param {Object} opts
   * @param {Boolean} [opts.own_container=false] - whether or not to request
   *    app's own container to be created
   *
   * @returns {Promise<String>} safe-auth URI
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   *
   * const containerPermissions =
   * {
   *   _public: [
   *     'Read',
   *     'Insert',
   *     'Update',
   *     'Delete'
   *   ],
   *   _publicNames: [
   *     'Read',
   *     'Insert',
   *     'Update',
   *     'Delete'
   *   ]
   * };
   * const authorisationOptions = {own_container: true};
   *
   * const asyncFn = async () => {
   *     try {
   *         const authReqUri = await app.auth.genAuthUri(
   *             containerPermissions,
   *             authorisationOptions
   *         );
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  genAuthUri(permissions, opts) {
    const perm = makePermissions(permissions);
    const appInfo = makeAppInfo(this.app.appInfo);
    return lib.encode_auth_req(new types.AuthReq({
      app: appInfo,
      app_container: !!(opts && opts.own_container),
      containers: perm,
      containers_len: perm.length,
      containers_cap: perm.length
    }).ref())
      .then(addSafeAuthProtocol);
  }

  /**
   * Generate a safe-auth URI to request permissions on arbitrary owned MutableData's.
   * Necessary when an authorised app needs access to a MutableData that was created by
   * another application and is also owned by current account.
   *
   * @param {Object} permissions - mapping the MutableData's XoR names
   *                  to a list of permissions you want to request
   *
   * @returns {Promise<String>} safe-auth URI
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   *
   * const permissions = [
   *   {
   *     typeTag: 15001,
   *     name: mutableDataXorName,
   *     perms: ['Insert']
   *   }
   * ];
   *
   * const asyncFn = async () => {
   *     try {
   *         const shareMDataReqUri = await app.auth.genShareMDataUri(permissions);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  genShareMDataUri(permissions) {
    validateShareMDataPermissions(permissions);
    const mdatasPerms = makeShareMDataPermissions(permissions);
    const appInfo = makeAppInfo(this.app.appInfo);
    return lib.encode_share_mdata_req(new types.ShareMDataReq({
      app: appInfo,
      mdata: mdatasPerms,
      mdata_len: mdatasPerms.length
    }).ref())
      .then(addSafeAuthProtocol);
  }

  /**
   * Generate an unregistered connection URI for the app,
   * especially for simply browsing and reading data on the network.
   *
   * @returns {Promise<String>} safe-auth URI
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const app = await safe.initialiseApp(appInfo);
   *     try {
   *         const unRegisteredUri = await app.auth.genConnUri();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  genConnUri() { // eslint-disable-line class-methods-use-this
    return lib.encode_unregistered_req(this.app.appInfo.id)
      .then(addSafeAuthProtocol);
  }

  /**
   * Opens URI with system, using respective registered application.
   * @param {String} uri Authententication
   * @returns <Promise>
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const app = await safe.initialiseApp(appInfo);
   *     try {
   *         await app.auth.openUri('safe://shouldOpenSafeBrowser');
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  openUri(uri) { // eslint-disable-line class-methods-use-this
    return lib.openUri(uri);
  }

  /**
   * Generate a safe-auth URI to request further container permissions.
   *
   * @param {Object} containers mapping container name to list of permissions
   * @returns {Promise<String>} safe-auth URI
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const containerPermissions =
   * {
   *   _videos: [
   *     'Insert'
   *   ]
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const contReqUri = await app.auth.genContainerAuthUri(containerPermissions);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  genContainerAuthUri(containers) {
    const ctnrs = makePermissions(containers);
    const appInfo = makeAppInfo(this.app.appInfo);
    return lib.encode_containers_req(new types.ContainerReq({
      app: appInfo,
      containers: ctnrs,
      containers_len: ctnrs.length,
      containers_cap: ctnrs.length
    }).ref())
      .then(addSafeAuthProtocol);
  }

  /**
   * Refresh the access persmissions from the network. Useful when you just
   * connected or received a response from the authenticator in the IPC protocol.
   * @return {Promise}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const permissions = {
   *     _public: ['Read', 'Insert', 'Update', 'Delete', 'ManagePermissions']
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const authReqUri = await app.auth.genAuthUri(permissions, {});
   *         let authUri = await safe.authorise(authReqUri);
   *         await app.auth.refreshContainersPermissions();
   *         const mData = await app.auth.getContainer('_public');
   *         let permsObject = await app.auth.getContainersPermissions();
   *
   *         console.log(permsObject);
   *
   *         const updatePermissions = {
   *           _publicNames: ['Read', 'Insert', 'Update', 'Delete', 'ManagePermissions']
   *         }
   *         let contReqUri = await app.auth.genContainerAuthUri(updatePermissions);
   *         authUri = await safe.authorise(contReqUri);
   *
   *         console.log(permsObject);
   *
   *         await app.auth.refreshContainersPermissions();
   *         permsObject = await app.auth.getContainersPermissions();
   *
   *         console.log(permsObject);
   *     } catch (err) {
   *        throw err;
   *     }
   * };
   */
  refreshContainersPermissions() {
    return lib.access_container_refresh_access_info(this.app.connection);
  }

  /**
   * Get the names of all containers found and the app's granted
   * permissions for each of them.
   *
   * @returns {Promise<Array>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const containerPermissions = await app.auth.getContainersPermissions();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getContainersPermissions() {
    return lib.access_container_fetch(this.app.connection);
  }

  /**
   * Read granted containers permissions from an auth URI
   * without the need to connect to the network.
   *
   * This function appears redundant to app.auth.getContainersPermissions, however the difference
   * is that readGrantedPermissions doesn't require an authorised app connection.
   *
   * @param {String} uri the IPC response string given
   * @throws {NON_AUTH_GRANTED_URI}
   * @returns {Promise<Array>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const authReqUri = await app.auth.genAuthUri({});
   *         await app.auth.openUri(authReqUri);
   *         const containerPermissions = await app.auth.readGrantedPermissions(
   *             < returned auth URI from openUri >
   *         );
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  readGrantedPermissions(uri) { // eslint-disable-line class-methods-use-this
    const sanitisedUri = removeSafeProtocol(uri);

    return lib.decode_ipc_msg(sanitisedUri)
      .then((resp) => {
        if (resp[0] !== 'granted') {
          throw makeError(errConst.NON_AUTH_GRANTED_URI.code, errConst.NON_AUTH_GRANTED_URI.msg);
        }
        const authGranted = resp[1];
        const contsPerms = {};
        authGranted.access_container_entry.forEach((cont) => {
          contsPerms[cont.name] = {
            Read: cont.permissions.Read,
            Insert: cont.permissions.Insert,
            Update: cont.permissions.Update,
            Delete: cont.permissions.Delete,
            ManagePermissions: cont.permissions.ManagePermissions
          };
        });
        return contsPerms;
      }).catch((err) => Promise.reject(err));
  }

  /**
  * Get the MutableData for the app's root container.
  * When run in tests, this falls back to the randomly generated version
  * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const authReqUri = await app.auth.genAuthUri({}, { own_container: true });
   *         await app.auth.openUri(authReqUri);
   *         // After URI is opened by SAFE Authenticator and authorised,
   *         // this snippet assumes that your application has an
   *         // IPC strategy to receive returned authorisation URI.
   *         await app.auth.loginFromUri(authUri);
   *         const mutableDataInterface = await app.auth.getOwnContainer();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
  */
  getOwnContainer() {
    return this.app.getOwnContainerName()
      .then((containerName) => this.getContainer(containerName));
  }

  /**
   * Whether or not this session has specifc access permission for a given container.
   * @param {String} name  name of the container, e.g. `'_public'`
   * @param {(String|Array<String>)} [permissions=['Read']] permissions to check for
   * @returns {Promise<Boolean>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   *
   * const containerPermissions =
   * {
   *   _public: ['Read']
   * };
   *
   * const asyncFn = async () => {
   *     try {
   *         const authReqUri = await app.auth.genAuthUri(
   *           containerPermissions
   *         );
   *         await app.auth.openUri(authReqUri);
   *         // After URI is opened by SAFE Authenticator and authorised,
   *         // this snippet assumes that your application has an
   *         // IPC strategy to receive returned authorisation uri.
   *         await app.auth.loginFromUri(authUri);
   *         const container = '_public';
   *         const permissions = ['Read'];
   *         const canAccessContainer = await app.auth.canAccessContainer(container, permissions);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  canAccessContainer(name, permissions) {
    let perms = ['Read'];
    if (permissions) {
      if (typeof permissions === 'string') {
        perms = [permissions];
      } else {
        perms = permissions;
      }
    }

    return this.getContainersPermissions()
      .then((containersPerms) => {
        const contPerms = containersPerms[name];
        const result = perms.every((perm) => contPerms[perm]);
        return Promise.resolve(result);
      });
  }

  /**
   * Get interface to MutableData underlying account container.
   * @param name {String} name of the container, e.g. `'_public'`
   * @throws {MISSING_CONTAINER_STRING}
   * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   *
   * const containerPermissions =
   * {
   *   _public: ['Read', 'Insert', 'Update']
   * };
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const authReqUri = await app.auth.genAuthUri(containerPermissions);
   *     await app.auth.openUri(authReqUri);
   *     // After URI is opened by SAFE Authenticator and authorised,
   *     // this snippet assumes that your application has an
   *     // IPC strategy to receive returned authorisation uri.
   *     await app.auth.loginFromUri(authUri);
   *     const app = await safe.initialiseApp(appInfo);
   *     const authReqUri = await app.auth.genAuthUri(
   *       containerPermissions
   *     );
   *     const container = '_public';
   *     const mutableDataInterface = await app.auth.getContainer(container);
   *   } catch (err) {
   *     throw err;
   *   };
   * };
   */
  getContainer(name) {
    if (!name) {
      throw makeError(errConst.MISSING_CONTAINER_STRING.code,
        errConst.MISSING_CONTAINER_STRING.msg);
    }
    return lib.access_container_get_container_mdata_info(this.app.connection, name)
      .then((data) => this.app.mutableData.wrapMdata(data));
  }

  /**
   * Create a new authenticated or unregistered network session
   * using the provided IPC response from SAFE Authenticator.
   * @param {String} uri the IPC response string given
   * @throws {MISSING_AUTH_URI}
   * @returns {Promise<SAFEApp>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   *
   * const asyncFn = async () => {
   *   try {
   *     const app = await safe.initialiseApp(appInfo);
   *     const authReqUri = await app.auth.genAuthUri({});
   *     await app.auth.openUri(authReqUri);
   *     // After URI is opened by SAFE Authenticator and authorised,
   *     // this snippet assumes that your application has an
   *     // IPC strategy to receive returned authorisation uri.
   *     await app.auth.loginFromUri(authUri);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  loginFromUri(uri) {
    if (!uri) throw makeError(errConst.MISSING_AUTH_URI.code, errConst.MISSING_AUTH_URI.msg);
    const sanitisedUri = removeSafeProtocol(uri);
    return lib.decode_ipc_msg(sanitisedUri).then((resp) => {
      const ipcMsgType = resp[0];
      // we handle 'granted', 'unregistered', 'containers' and 'share_mdata' types
      switch (ipcMsgType) {
        case 'unregistered': {
          this._registered = false;
          return lib.app_unregistered(this.app, resp[1]);
        }
        case 'granted': {
          const authGranted = resp[1];
          this._registered = true;
          return lib.app_registered(this.app, authGranted);
          // TODO: in the future: automatically refresh permissions
          //  .then((app) => this.refreshContainersPermissions()
          //    .then(() => app)
          //  );
        }
        case 'containers':
          this._registered = true;
          return Promise.resolve(this.app);
          // TODO: in the future: automatically refresh permissions
          //  return this.refreshContainersPermissions();
        case 'share_mdata':
          this._registered = true;
          return Promise.resolve(this.app);
        default:
          return Promise.reject(resp);
      }
    });
  }

  /**
  * *ONLY AVAILALBE IF RUN in NODE_ENV='test' OR WITH 'forceUseMock' option*
  *
  * Generate a _locally_ registered SAFEApp with the given permissions, or
  * a local unregistered SAFEApp if permissions is `null`.
  * @returns {Promise<SAFEApp>}
  */
  loginForTest(access, opts) {
    if (!useMockByDefault && !this.app.options.forceUseMock) {
      throw makeError(errConst.NON_DEV.code, errConst.NON_DEV.msg);
    }
    if (access) {
      const appInfo = makeAppInfo(this.app.appInfo);
      const perms = makePermissions(access);
      const authReq = new types.AuthReq({
        app: appInfo,
        app_container: !!(opts && opts.own_container),
        containers: perms,
        containers_len: perms.length,
        containers_cap: perms.length
      });
      return lib.test_create_app_with_access(authReq.ref())
        .then((appPtr) => {
          this.app.connection = appPtr;
          this._registered = true;
          return this.app;
        });
    }

    return lib.test_create_app(this.app.appInfo.id)
      .then((appPtr) => {
        this.app.connection = appPtr;
        this._registered = false;
        return this.app;
      });
  }

  /**
  * *ONLY AVAILALBE IF RUN in NODE_ENV='test' OR WITH 'forceUseMock' option*
  *
  * Simulates a network disconnection event. This can be used to
  * test any logic to be executed by an application when a network
  * diconnection notification is received.
  * @throws {NON_DEV}
  * @returns {Promise}
  */
  simulateNetworkDisconnect() {
    if (!useMockByDefault && !this.app.options.forceUseMock) {
      throw makeError(errConst.NON_DEV.code, errConst.NON_DEV.msg);
    }
    return lib.test_simulate_network_disconnect(this.app.connection);
  }
}

module.exports = AuthInterface;

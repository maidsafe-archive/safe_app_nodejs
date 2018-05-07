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
const { inTesting } = require('../consts');
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
  const urlSafeBase64 = (new Buffer(str))
                          .toString('base64')
                          .replace(/\+/g, '-') // Convert '+' to '-'
                          .replace(/\//g, '_') // Convert '/' to '_'
                          .replace(/=+$/, '') // Remove ending '='
                          .toLowerCase();
  return `safe-${urlSafeBase64}`;
};

/**
* @private
* Prefix the URI with 'safe-auth' protocol
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
*/
const removeSafeProtocol = (uri) => uri.replace(/^safe-[^:]*:?[/]*/g, '');

/**
* The AuthInterface contains all authentication related
* functionality with the network. Like creating an authenticated
* or unauthenticated connection or create messages for the IPC
* authentitcation protocol.
*
* Access your instance through ypur {SAFEApp} instance under `.auth`.
*/
class AuthInterface {

  /**
  * @private
  * Instantiate a new AuthInterface.
  *
  * @param {SAFEApp} app - the SAFEApp instance that is wired to which
  * is also used to fetch the app's information from.
  * @param {InitOptions} initialisation options
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
  * @param {Object=} opts - optional parameters
  * @param {Boolean} [opts.own_container=false] - whether or not to request
  *    our own container to be created for us, too
  *
  * @returns {String} `safe-auth://`-URI
  * @example // using an Authentication example:
  * app.auth.genAuthUri({
  *  _public: ['Insert'], // request to insert into public
  *  _other: ['Insert', 'Update'] // request to insert and update
  * }, {own_container: true}) // and we want our own container, too
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
  * Generate a `'safe-auth'`-URI to request permissions
  * on arbitrary owned MutableData's.
  *
  * @param {Object} permissions - mapping the MutableData's XoR names
  *                  to a list of permissions you want to request
  *
  * @returns {String} `safe-auth://`-URI
  * @example // example of requesting permissions for a couple of MutableData's:
  * app.auth.genShareMDataUri([
  *  { type_tag: 15001,   // request for MD with tag 15001
  *    name: 'XoRname1',  // request for MD located at address 'XoRname1'
  *    perms: ['Insert'], // request for inserting into the referenced MD
  *  },
  *  { type_tag: 15020,   // request for MD with tag 15020
  *    name: 'XoRname2',  // request for MD located at address 'XoRname2'
  *    perms: ['Insert', `Update`], // request for updating and inserting into the referenced MD
  *  }
  * ])
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
  * Generate an unregistered connection URI for the app.
  *
  * @returns {String} `safe-auth://`-URI
  * @example // using an Authentication example:
  * app.auth.genConnUri()
  */
  /* eslint-disable class-methods-use-this */
  genConnUri() {
    return lib.encode_unregistered_req(this.app.appInfo.id)
      .then(addSafeAuthProtocol);
  }

  /**
  * Open the given Authentication URI to the authenticator
  */
  /* eslint-disable class-methods-use-this */
  openUri(uri) {
    return lib.openUri(uri);
  }
  /* eslint-enable class-methods-use-this */

  /**
  * Generate a `'safe-auth'`-URI to request further container permissions
  *
  * @example // generating a container authorisation URI:
  * app.auth.genContainerAuthUri(
  *  _publicNames: ['Insert'], // request to insert into publicNames
  * })
  * @returns {String}
  * @arg {Object} containers mapping container name to list of permissions
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
  */
  refreshContainersPermissions() {
    return lib.access_container_refresh_access_info(this.app.connection);
  }

  /**
  * Get the names of all containers found and the app's granted
  * permissions for each of them.
  *
  * @return {Promise<Array>}
  */
  getContainersPermissions() {
    return lib.access_container_fetch(this.app.connection);
  }

  /**
  * Read granted containers permissions from an auth URI
  * without the need to connect to the network.
  * @arg {String} uri the IPC response string given
  *
  * @return {Promise<Array>}
  */
  readGrantedPermissions(uri) {
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
  * Get the MutableData for the app's own container generated by Authenticator.
  * When run in tests, this falls back to the randomly generated version
  * @return {Promise<MutableData>}
  */
  getOwnContainer() {
    let prms = this.app.getOwnContainerName()
      .then((containerName) => this.getContainer(containerName));

    if (inTesting) {
      prms = prms.catch((err) => {
        // Error code -1002 corresponds to 'Container not found' case
        if (err.code !== -1002) return Promise.reject(err);
        return this.getContainersPermissions().then((contPerms) => {
          const names = Object.keys(contPerms);
          const ctrnName = names.find((x) => x.match(/^apps\//));
          if (!ctrnName) return Promise.reject(err);
          return this.getContainer(ctrnName);
        });
      });
    }
    return prms;
  }

  /**
  * Whether or not this session has specifc access permission for a given container.
  * @arg {String} name  name of the container, e.g. `'_public'`
  * @arg {(String||Array<String>)} [permissions=['Read']] permissions to check for
  * @returns {Promise<bool>}
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
  * Lookup and return the information necessary to access a container.
  * @arg name {String} name of the container, e.g. `'_public'`
  * @returns {Promise<MutableData>} the MutableData behind it
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
  * Create a new authenticated or unregistered session using the provided IPC response.
  * @arg {String} uri the IPC response string given
  * @returns {Promise<SAFEApp>} the given app instance with a newly setup and
  *          authenticated session.
  */
  loginFromURI(uri) {
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
  * *ONLY AVAILALBE IF RUN in NODE_ENV='development' || 'testing'*
  *
  * Generate a _locally_ registered App with the given permissions, or
  * a local unregistered App if permissions is `null`.
  * @returns {Promise<SAFEApp>} the locally registered/unregistered App instance
  */
  loginForTest(access, opts) {
    if (!inTesting) throw makeError(errConst.NON_DEV.code, errConst.NON_DEV.msg);
    if (access) {
      const appInfo = makeAppInfo(this.app.appInfo);
      const perms = makePermissions(access || {});
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
  * *ONLY AVAILALBE IF RUN in NODE_ENV='development' || 'testing'*
  *
  * Simulates network disconnect event
  */
  simulateDisconnect() {
    return lib.test_simulate_network_disconnect(this.app.connection);
  }
}

module.exports = AuthInterface;

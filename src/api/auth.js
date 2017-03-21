// Copyright 2016 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under (1) the MaidSafe.net
// Commercial License, version 1.0 or later, or (2) The General Public License
// (GPL), version 3, depending on which licence you accepted on initial access
// to the Software (the "Licences").
//
// By contributing code to the SAFE Network Software, or to this project
// generally, you agree to be bound by the terms of the MaidSafe Contributor
// Agreement, version 1.0.
// This, along with the Licenses can be found in the root directory of this
// project at LICENSE, COPYING and CONTRIBUTOR.
//
// Unless required by applicable law or agreed to in writing, the SAFE Network
// Software distributed under the GPL Licence is distributed on an "AS IS"
// BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied.
//
// Please review the Licences for the specific language governing permissions
// and limitations relating to use of the SAFE Network Software.


const lib = require('../native/lib');
const nativeH = require('../native/helpers');
const types = require('../native/types');
const h = require('../helpers');

const makeAppInfo = nativeH.makeAppInfo;
const makePermissions = nativeH.makePermissions;

/**
* @private
* @todo
**/
function urlsafeBase64(str) {
  return (new Buffer(str))
          .toString('base64')
              .replace(/\+/g, '-') // Convert '+' to '-'
              .replace(/\//g, '_') // Convert '/' to '_'
              .replace(/=+$/, ''); // Remove ending '='
}

/**
* Holds signature key
**/
class SignKey extends h.NetworkObject {

  /**
  * generate raw string copy of signature key
  * @returns {Promise<String>}
  **/
  getRaw() {
    return lib.sign_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.sign_key_free(app.connection, ref);
  }
}

/**
* Holds an encryption key
**/
class EncKey extends h.NetworkObject {

  /**
  * generate raw string copy of encryption key
  * @returns {Promise<String>}
  **/
  getRaw() {
    return lib.enc_key_get(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.enc_key_free(app.connection, ref);
  }

}


/**
* The AuthInterface contains all authentication related
* functionality with the network. Like creating an authenticated
* or unauthenticated connection or create messages for the IPC
* authentitcation protocol.
*
* Access your instance through ypur {SAFEApp} instance under `.auth`.
**/
class AuthInterface {

  /**
  * @private
  * @todo
  **/
  constructor(app) {
    this.app = app;
    this._registered = false;
    this.setupUri();
  }

  /**
  * @private
  * @todo
  **/
  setupUri() {
    const appInfo = this.app.appInfo;
    const schema = `safe-${urlsafeBase64(appInfo.id).toLowerCase()}`;
    lib.registerUriScheme({ bundle: appInfo.id,
      vendor: appInfo.vendor,
      name: appInfo.name,
      icon: 'test',
      exec: appInfo.customAuthExecPath }, schema);
  }

  /**
  * Whether or not this is a registered/authenticated
  * session.
  *
  * @returns {Boolean} true if this is an authenticated session
  **/
  get registered() {
    return this._registered;
  }

  /**
  * generate an Authentication URL for the app with
  * the given permissions and optional parameters.
  *
  * @param {Object} permissions - mapping the container-names
  *                  to a list of permissions you want to
  *                  request
  * @param {Object=} opts - optional parameters
  * @param {Boolean} [opts.own_container=false] - whether or not to request
  *    our own container to be created for us, too
  *
  * @returns {String} `safe-auth://`-Url
  * @example // using an Authentication example:
  * app.auth.genAuthUri({
  *  '_public': ['Insert'], // request to insert into public
  *  '_other': ['Insert', 'Update'] // request to insert and update
  * }, {own_container: true}) // and we want our own container, too
  **/
  genAuthUri(permissions, opts) {
    const perm = makePermissions(permissions);
    const appInfo = makeAppInfo(this.app.appInfo);
    return lib.encode_auth_req(new types.AuthReq({
      app: appInfo,
      app_container: !!(opts && opts.own_container),
      containers: perm,
      containers_len: perm.length,
      containers_cap: perm.length
    }).ref());
  }

  /**
  * Open the given URI to the authenticator
  **/
  /* eslint-disable class-methods-use-this */
  openUri(uri) {
    return lib.openUri(uri);
  }
  /* eslint-enable class-methods-use-this */

  /**
  * Generate a `safe-auth`-Url to request further container permissions
  * see the `genAuthUri`-Example to understand how container permissions
  * are to be specified
  * @returns {String}
  * @arg {Object} containers mapping container name to list of permissions
  **/
  genContainerAuthUri(containers) {
    const ctnrs = makePermissions(containers);
    const appInfo = makeAppInfo(this.app.appInfo);
    return lib.encode_containers_req(new types.ContainerReq({
      app: appInfo,
      containers: ctnrs,
      containers_len: ctnrs.length,
      containers_cap: ctnrs.length
    }).ref());
  }

  /**
  * Create a new, unregistered Session (read-only), overwrites any previously
  * set session
  * @returns {Promise<SAFEApp>} same instace but with newly set up connection
  */
  connectUnregistered() {
    return lib.app_unregistered(this.app).then(() => {
      this._registered = false;
      return this.app;
    });
  }

  /**
  * Fetch the access container info from the network. Useful when you just
  * connected or received a response in the IPC protocol.
  * @return {Promise}
  */
  refreshContainerAccess() {
    return lib.access_container_refresh_access_info(this.app.connection);
  }

  /**
  * Get the names of all access containers found.
  * @return {Promise<[String]}
  */
  getAccessContainerNames() {
    return lib.access_container_get_names(this.app.connection);
  }

  /**
  * Whether or not this session has specifc permission access of a given
  * container.
  * @arg {String} name  name of the container, e.g. `_public`
  * @arg {(String||Array<String>)} [permissions=['Read']] permissions to check for
  * @returns {Promise<bool>}
  **/
  canAccessContainer(name, permissions) {
    let perms = ['Read'];
    if (permissions) {
      if (typeof permissions === 'string') {
        perms = [permissions];
      } else {
        perms = permissions;
      }
    }
    return lib.access_container_is_permitted(this.app.connection, name, perms);
  }

  /**
  * Lookup and return the information necessary to access a container.
  * @arg name {String} name of the container, e.g. `'_public'`
  * @returns {Promise<MutableData>} the Mutable Data behind that object
  */
  getAccessContainerInfo(name) { // FIXME: considering the return value, this name is bogus
    return lib.access_container_get_container_mdata_info(this.app.connection, name)
      .then((data) => this.app.mutableData.wrapMdata(data));
  }

  /**
  * Create a new authenticated session using the provided IPC-Response.
  * @arg {String} responseURI the IPC response string given
  * @returns {Promise<SAFEApp>} the given App Instance with a newly setup and
  *          authenticated session.
  */
  loginFromURI(responseUri) {
    return lib.decode_ipc_msg(responseUri).then((resp) => {
      // we can only handle 'granted' request
      if (resp[0] !== 'granted') return Promise.reject(resp);

      const authGranted = resp[1];
      this._registered = true;
      return lib.app_registered(this.app, authGranted);
      // FIXME: in the future: automatically check for the
      // containers, too
      // .then((app) =>
      //   this.refreshContainerAccess().then(() => app));
    });
  }

  /**
  * *ONLY AVAILALBE IF RUN In NODE_ENV='development' || 'testing'*
  *
  * Generates a _locally_ registered App with the given permissions.
  * @returns {Promise<SAFEApp>}
  **/
  loginForTest(access) {
    const permissions = makePermissions(access || {});
    this.app.connection = lib.test_create_app_with_access(permissions);
    this._registered = true;
    return Promise.resolve(this.app);
  }

  /**
  * Get the public signing key of this session
  * @returns {Promise<SignKey>}
  **/
  getPubSignKey() {
    return lib.app_pub_sign_key(this.app.connection)
        .then((c) => h.autoref(new SignKey(this.app, c)));
  }

  /**
  * Get the public encryption key of this session
  * @returns {Promise<EncKey>}
  **/
  getEncKey() {
    return lib.app_pub_enc_key(this.app.connection)
        .then((c) => h.autoref(new EncKey(this.app, c)));
  }

  /**
  * Interprete the SignKey from a given raw string
  * FIXME: is this expected to be Base64 encoded?
  * @param {String} raw
  * @returns {Promise<SignKey>}
  **/
  getSignKeyFromRaw(raw) {
    return lib.sign_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new SignKey(this.app, c)));
  }

  /**
  * Interprete the encryption Key from a given raw string
  * FIXME: is this expected to be Base64 encoded?
  * @arg {String} raw
  * @returns {Promise<EncKey>}
  **/
  getEncKeyKeyFromRaw(raw) {
    return lib.enc_key_new(this.app.connection, raw)
        .then((c) => h.autoref(new EncKey(this.app, c)));
  }
}


module.exports = AuthInterface;

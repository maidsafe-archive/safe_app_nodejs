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
const h = require('../helpers');
const authTypes = require('../native/_auth').types;

const makeAppInfo = nativeH.makeAppInfo;
const makePermissions = nativeH.makePermissions;

function urlsafeBase64(str) {
  return (new Buffer(str))
          .toString('base64')
              .replace(/\+/g, '-') // Convert '+' to '-'
              .replace(/\//g, '_') // Convert '/' to '_'
              .replace(/=+$/, ''); // Remove ending '='
}

class SignKey extends h.NetworkObject {

  getRaw() {
    return lib.sign_key_get(this.app.connection, this.ref);
  }

  static free(app, ref) {
    return lib.sign_key_free(app.connection, ref);
  }
}

class PubEncKey extends h.NetworkObject {

  getRaw() {
    return lib.enc_key_get(this.app.connection, this.ref);
  }

  static free(app, ref) {
    return lib.enc_key_free(app.connection, ref);
  }

}


class AuthProvider {
  constructor(app) {
    this.app = app;
    this._registered = false;
    this.setupUri();
  }

  setupUri() {
    const appInfo = this.app.appInfo;
    const schema = `safe${urlsafeBase64(appInfo.id)}`;
    lib.registerUriScheme({ bundle: appInfo.id,
      vendor: appInfo.vendor,
      name: appInfo.name,
      icon: 'test',
      exec: appInfo.customAuthExecPath }, schema);
  }

  get registered() {
    return this._registered;
  }

  genAuthUri(permissions, opts) {
    const perm = makePermissions(permissions);
    const appInfo = makeAppInfo(this.app.appInfo);
    return lib.encode_auth_req(new authTypes.AuthReq({
      app: appInfo,
      app_container: !!(opts && opts.own_container),
      containers: perm,
    }));
  }

  genContainerAuthUri(containers) {
    const ctnrs = makePermissions(containers);
    const appInfo = makeAppInfo(this.app.appInfo);
    return lib.encode_containers_req(new authTypes.ContainerReq({
      app: appInfo,
      containers: ctnrs,
    }));
  }

  connectUnregistered() {
    return lib.app_unregistered(this.app);
  }

  refreshContainerAccess() {
    return lib.access_container_refresh_access_info(this.app.connection);
  }

  canAccessContainer(name, permissions) {
    let perms = ['READ'];
    if (permissions) {
      if (typeof permissions === 'string') {
        perms = [permissions];
      } else {
        perms = permissions;
      }
    }
    return lib.access_container_is_permitted(this.app.connection, name, perms);
  }

  getAccessContainerInfo(name) {
    return lib.access_container_get_container_mdata_info(this.app.connection, name)
      .then((data) => this.app.container.wrapContainerInfo(data));
  }

  loginFromURI(responseUri) {
    return lib.decode_ipc_msg(responseUri).then((resp) => {
      // we can only handle 'granted' request
      if (resp[0] !== 'granted') return Promise.reject(resp);

      const authGranted = resp[1];
      this._registered = true;
      return lib.app_registered(this.app, authGranted).then((app) =>
        this.refreshContainerAccess().then(() => app));
    });
  }

  // app key management
  getPubSignKey() {
    return lib.app_pub_sign_key(this.app.connection).then((c) => h.autoref(new SignKey(this.app, c)));
  }

  getPubEncKey() {
    return lib.app_pub_enc_key(this.app.connection).then((c) => h.autoref(new PubEncKey(this.app, c)));
  }

  getSignKeyFromRaw(raw) {
    return lib.sign_key_new(this.app.connection, raw).then((c) => h.autoref(new SignKey(this.app, c)));
  }

  getEncKeyKeyFromRaw(raw) {
    return lib.enc_key_new(this.app.connection, raw).then((c) => h.autoref(new PubEncKey(this.app, c)));
  }
}


module.exports = AuthProvider;

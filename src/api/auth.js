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
const helpers = require('../native/helpers');
const authTypes = require('../native/_auth').types;

const makeAppInfo = helpers.makeAppInfo;
const makePermissions = helpers.makePermissions;

function urlsafeBase64(str) {
  return (new Buffer(str))
          .toString('base64')
              .replace(/\+/g, '-') // Convert '+' to '-'
              .replace(/\//g, '_') // Convert '/' to '_'
              .replace(/=+$/, ''); // Remove ending '='
}


module.exports = class Auth {
  constructor(app) {
    this._app = app;
    this._registered = false;
    this.setupUri();
  }

  setupUri() {
    const appInfo = this._app.appInfo;
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
    const appInfo = makeAppInfo(this._app.appInfo);
    return lib.encode_auth_req(new authTypes.AuthReq({
      app: appInfo,
      app_container: !!(opts && opts.own_container),
      containers: perm,
    }));
  }

  genContainerAuthUri(containers) {
    const ctnrs = makePermissions(containers);
    const appInfo = makeAppInfo(this._app.appInfo);
    return lib.encode_containers_req(new authTypes.ContainerReq({
      app: appInfo,
      containers: ctnrs,
    }));
  }

  connectUnregistered() {
    return lib.app_unregistered(this._app);
  }

  refreshContainerAccess() {
    return lib.access_container_refresh_access_info(this._app.connection);
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
    return lib.access_container_is_permitted(this._app.connection, name, perms);
  }

  getAccessContainerInfo(name) {
    return lib.access_container_is_permitted(this._app.connection, name)
      .then((data) => this._app.container.wrapContainerInfo(data));
  }

  loginFromURI(responseUri) {
    return lib.decode_ipc_msg(responseUri).then((resp) => {
      // we can only handle 'granted' request
      if (resp[0] !== 'granted') return Promise.reject(resp);

      const authGranted = resp[1];
      this._registered = true;
      return lib.app_registered(this._app, authGranted).then((app) =>
        this.refreshContainerAccess().then(() => app));
    });
  }
};

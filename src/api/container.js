const helpers = require('../helpers');
const lib = require('../native/lib');

class Container extends helpers.NetworkObject {
  getAddressInfo() {
    return lib.mdata_info_extract_name_and_type_tag(this._con, this._ref);
  }
  _clean(con, ref) {
    // FIXME: doesn't exist in FFI/rust at the moment
    lib.mdata_info_free(this._app.connection, ref);
  }
}

class ContainerAccess {
  constructor(app) {
    this._app = app;
  }
  wrapContainerInfo(info) {
    return Container(this._app.connection, info);
  }
}

module.exports = ContainerAccess;

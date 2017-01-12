const helpers = require('../helpers');
const lib = require('../native/lib');

class Container extends helpers.NetworkObject {
  getAddressInfo() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this._ref);
  }
  static _clean(app, ref) {
    // FIXME: doesn't exist in FFI/rust at the moment
    lib.mdata_info_free(app.connection, ref);
  }
}

class ContainerAccess {
  constructor(app) {
    this.app = app;
  }
  wrapContainerInfo(info) {
    return Container(this.app, info);
  }
}

module.exports = ContainerAccess;

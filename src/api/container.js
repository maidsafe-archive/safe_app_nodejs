const helpers = require('../helpers');
const lib = require('../native/lib');

class Container extends helpers.NetworkObject {
  getAddressInfo() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this.ref);
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

  new_public(name, typeTag) {
    return lib.mdata_info_new_public(this.app, name, typeTag).then(info => new Container(this.app, info));
  }

  new_private(name, typeTag) {
    return lib.mdata_info_new_private(this.app, name, typeTag).then(info => new Container(this.app, info));
  }

  random_public(typetag) {
    return lib.mdata_info_random_public(this.app, typeTag).then(info => new Container(this.app, info));
  }

  random_private(typetag) {
    return lib.mdata_info_random_private(this.app, typeTag).then(info => new Container(this.app, info));
  }

  encrypt_entry_key(infoHandle, infoPtr, infoLen) {
    return lib.mdata_info_encrypt_entry_key(this.app, infoHandle, infoPtr, infoLen)
      .then(info => new Container(this.app, info));
  }

  encrypt_entry_value(infoHandle, infoPtr, infoLen) {
    return lib.mdata_info_encrypt_entry_value(this.app, infoHandle, infoPtr, infoLen)
      .then(info => new Container(this.app, info));
  }

  serialise(infoHandle) {
    return lib.mdata_info_serialise(this.app, infoHandle)
      .then(info => new Container(this.app, info));
  }

  deserialise(ptr, len) {
    return lib.mdata_info_deserialise(this.app, ptr, len)
      .then(info => new Container(this.app, info));
  }
}

module.exports = ContainerAccess;

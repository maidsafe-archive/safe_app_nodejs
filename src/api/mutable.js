const h = require('../helpers');
const lib = require('../native/lib');

class MutuableData extends h.NetworkObject {

  getNameAndTag() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this.ref);
  }

  serialise() {
    return lib.mdata_info_deserialise(this.app.connection, this.ref);
  }


}

class MutableDataProvider {
  constructor(app) {
    this.app = app;
  }

  newRandomPrivate(typeTag) {
    return lib.mdata_info_random_private(this.app.connection, typeTag)
          .then((m) => h.autoref(new MutuableData(this.app, m)));
  }
  newRandomPublic(typeTag) {
    return lib.mdata_info_random_public(this.app.connection, typeTag)
          .then((m) => h.autoref(new MutuableData(this.app, m)));
  }

  newPrivate(name, typeTag) {
    return lib.mdata_info_new_private(this.app.connection, name, typeTag)
          .then((m) => h.autoref(new MutuableData(this.app, m)));
  }
  newPublic(name, typeTag) {
    return lib.mdata_info_new_public(this.app.connection, name, typeTag)
          .then((m) => h.autoref(new MutuableData(this.app, m)));
  }
  fromDeserializer(serial) {
    return lib.mdata_info_deserialise(this.app.connection, serial)
          .then((m) => h.autoref(new MutuableData(this.app, m)));
  }
}

module.exports = MutableDataProvider;

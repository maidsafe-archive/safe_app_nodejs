
const helpers = require('../helpers');
const lib = require('../native/lib');

class ImmutableDataReader extends helpers.NetworkObject {

  read() { // -> Promise
    return lib.idata_read_from_self_encryptor(this.app.connection, this._ref);
  }

  size() { // -> Promise
    return lib.idata_size(this.app.connection, this._ref);
  }

  close() {
    return lib.idata_close_self_encryptor(this.app.connection, this._ref);
  }

  static _clean(app, ref) {
    lib.idata_self_encryptor_reader_free(app.connection, ref);
  }

}

class ImmutableDataWriter extends helpers.NetworkObject {
  write(string) {
    return lib.idata_write_to_self_encryptor(this.app.connection, this._ref, string);
  }

  size() { // -> Promise
    return lib.idata_size(this.app.connection, this._ref);
  }

  close() {
    return this.app.cipherOpt.new_plain().then(opts =>
      lib.idata_close_self_encryptor(this.app.connection, this._ref, opts._ref));
  }

  static _clean(app, ref) {
    lib.idata_self_encryptor_writer_free(app.connection, ref);
  }

}


class ImmutableData {
  constructor(app) {
    this.app = app;
  }

  create() {
    return lib.idata_new_self_encryptor(this.app.connection)
      .then((x) => helpers.autoref(new ImmutableDataWriter(this.app, x)));
  }

  fetch(address) {
    return lib.idata_fetch_self_encryptor(this.app.connection, address)
      .then((x) => helpers.autoref(new ImmutableDataReader(this.app, x)));
  }
}

module.exports = ImmutableData;

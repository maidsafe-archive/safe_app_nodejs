
const helpers = require('../helpers');
const lib = require('../native/lib');

class ImmutableDataReader extends helpers.NetworkObject {

  read() { // -> Promise
    return lib.idata_read_from_self_encryptor(this._con, this._ref);
  }

  size() { // -> Promise
    return lib.idata_size(this._con, this._ref);
  }

  close() {
    return lib.idata_close_self_encryptor(this._con, this._ref);
  }

  static _clean(con, ref) {
    lib.idata_self_encryptor_reader_free(con, ref);
  }

}

class ImmutableDataWriter extends helpers.NetworkObject {
  write(string) {
    return lib.idata_write_to_self_encryptor(this._con, this._ref, string);
  }

  size() { // -> Promise
    return lib.idata_size(this._con, this._ref);
  }

  close() {
    return lib.idata_close_self_encryptor(this._con, this._ref);
  }

  static _clean(con, ref) {
    lib.idata_self_encryptor_writer_free(con, ref);
  }

}


class ImmutableData {
  constructor(con) {
    this._con = con;
  }

  create() {
    return lib.idata_new_self_encryptor(this._con)
      .then((x) => helpers.autoref(new ImmutableDataWriter(x)));
  }

  fetch(address) {
    return lib.idata_fetch_self_encryptor(this._con, address)
      .then((x) => helpers.autoref(new ImmutableDataReader(x)));
  }
}

module.exports = ImmutableData;

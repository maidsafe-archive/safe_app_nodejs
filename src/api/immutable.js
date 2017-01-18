
const helpers = require('../helpers');
const lib = require('../native/lib');

class ImmutableDataReader extends helpers.NetworkObject {

  read(options) { // -> Promise
    const opts = Object.assign({}, options);
    let prms;
    if (opts.len) {
      prms = Promise.resolve(opts.len);
    } else {
      prms = this.size();
    }

    return prms.then((len) =>
      lib.idata_read_from_self_encryptor(this.app.connection,
                                         this.ref,
                                         opts.offset || 0,
                                         len));
  }

  size() { // -> Promise
    return lib.idata_size(this.app.connection, this.ref);
  }

  close() {
    return lib.idata_close_self_encryptor(this.app.connection, this.ref);
  }

  static _clean(app, ref) {
    lib.idata_self_encryptor_reader_free(app.connection, ref);
  }

}

class ImmutableDataWriter extends helpers.NetworkObject {
  write(string) {
    return lib.idata_write_to_self_encryptor(this.app.connection, this.ref, string);
  }

  size() { // -> Promise
    return lib.idata_size(this.app.connection, this.ref);
  }

  close() {
    return this.app.cipherOpt.newPlainText().then((opt) =>
      lib.idata_close_self_encryptor(this.app.connection,
                                     this.ref,
                                     opt.ref));
  }

  save() {
    return this.close();
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
      .then((ref) => helpers.autoref(new ImmutableDataWriter(this.app, ref)));
  }

  fetch(address) {
    return lib.idata_fetch_self_encryptor(this.app.connection, address)
      .then((ref) => helpers.autoref(new ImmutableDataReader(this.app, ref)));
  }
}

module.exports = ImmutableData;

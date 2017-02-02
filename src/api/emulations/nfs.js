const h = require('../../helpers');
const lib = require('../../native/lib');
const FileType = require('../../native/types').File;
const nativeH = require('../../native/helpers');
const ref = require('ref');

class File extends h.NetworkObject {

  get data_map_name() {
    return nativeH.fromCTime(this.ref.data_map_name);
  }

  get created() {
    return nativeH.fromCTime(this.ref.created);
  }

  get modified() {
    return nativeH.fromCTime(this.ref.modified);
  }

  static free(app, file) {
    return lib.file_free(app.connection, file);
  }
}

class NfsEmulation {
  constructor(mData) {
    this.mData = mData;
  }

  create(content) {
    const now = new Date();
    return this.mData.app.immutableData.create()
      .then((w) => w.write(content)
        // .then(() => w.size()
        .then(() => w.close()
          .then((xorAddr) => new File(this.mData.app,
              new FileType({
                size: 0,
                data_map_name: xorAddr,
                // FIXME: these are not correctly set
                // nor transferred by the FFI api
                created: nativeH.makeCTime(now),
                modified: nativeH.makeCTime(now),
                user_metadata_ptr: ref.NULL,
                user_metadata_len: 0,
                user_metadata_cap: 0,
              }).ref()))
        )
      // )
    );
  }

  fetch(fileName) {
    return lib.file_fetch(this.mData.app.connection, this.mData.ref, fileName)
      .then((res) => h.autoref(new File(this.mData.app, res.file, res.version)));
  }

  insert(fileName, file) {
    return lib.file_insert(this.mData.app.connection, this.mData.ref, fileName, file.ref)
      .then((info) => file);
  }

  update(fileName, file, version) {
    return lib.file_update(this.mData.app.connection, this.mData.ref, fileName, file.ref, version)
      .then((info) => file);
  }
}

module.exports = NfsEmulation;

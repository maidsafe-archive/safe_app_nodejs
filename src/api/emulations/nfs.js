const h = require('../../helpers');
const lib = require('../../native/lib');

class File extends h.NetworkObject {
  static free(app, file) {
    return lib.file_free(app.connection, file);
  }
}

class NfsEmulation {
  constructor(mData) {
    this.mData = mData;
  }

  fetch(fileName) {
    return lib.file_fetch(this.mData.app, this.mData.ref, fileName)
      .then(info => h.autoref(new File(this.mData.app, info)))
  }

  insert(fileName, file) {
    return lib.file_insert(this.mData.app, this.mData.ref, fileName, file)
      .then(info => h.autoref(new File(this.mData.app, info)))
  }

  update(fileName, file, version) {
    return lib.file_update(this.mData.app, this.mData.ref, fileName, file, version)
      .then(info => h.autoref(new File(this.mData.app, info)))
  }
}

module.exports = NfsEmulation;

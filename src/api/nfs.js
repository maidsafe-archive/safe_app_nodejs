const helpers = require('../helpers');
const lib = require('../native/lib');

class Nfs extends helpers.NetworkObject {
  free(file) {
    return lib.file_free(file);
  }
}

class NfsFile {
  constructor(app) {
    this.app = app;
  }

  fetch(parentHandle, fileName) {
    return lib.file_fetch(this.app, parentHandle, fileName)
      .then(info => new File(this.app, info))
  }

  insert(parentHandle, fileName, file) {
    return lib.file_insert(this.app, parentHandle, fileName, file)
      .then(info => new File(this.app, info))
  }

  update(parentHandle, fileName, file, version) {
    return lib.file_update(this.app, parentHandle, fileName, file, version)
      .then(info => new File(this.app, info))
  }
}

module.exports = NfsFile;

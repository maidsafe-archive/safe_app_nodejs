const helpers = require('../helpers');
const lib = require('../native/lib');

class Misc extends helpers.NetworkObject {
  static _clean(file) {
  }

  sign_key_free(handle) {
    return lib.sign_key_free(this.app, handle);
  }

  enc_key_free(handle) {
    return lib.enc_key_free(this.app, handle);
  }
}

class KeyManager {
  constructor(app) {
    this.app = app;
  }
  app_pub_sign_key() {
    return lib.app_pub_sign_key(this.app).then(c => new Misc(this.app, c))
  }

  sign_key_new(data) {
    return lib.sign_key_new(this.app, data).then(c => new Misc(this.app, c))
  }

  sign_key_get(handle) {
    return lib.sign_key_get(this.app, handle).then(c => new Misc(this.app, c))
  }

  app_pub_enc_key() {
    return lib.app_pub_enc_key(this.app).then(c => new Misc(this.app, c))
  }

  enc_key_new(data) {
    return lib.enc_key_new(this.app, data).then(c => new Misc(this.app, c))
  }

  enc_key_get(handle) {
    return lib.enc_key_get(this.app, handle).then(c => new Misc(this.app, c))
  }
}

module.exports = KeyManager;

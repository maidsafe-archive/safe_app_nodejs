const h = require('../../helpers');
const lib = require('../../native/lib');
const t = require('../../native/types');
const nativeH = require('../../native/helpers');
const ref = require('ref');

function isString(arg) {
  return typeof arg === 'string' || (arg.toString ? arg.toString() === '[object String]' : false)
}

class File extends h.NetworkObject {

  get ref() {
    const data = {
      created: this._ref.created,
      modified: this._ref.modified,
      size: this._ref.size,
      data_map_name: this._ref.data_map_name,
      user_metadata_ptr: this._ref.data_map_name.ref(),
      user_metadata_len: 0,
      user_metadata_cap: 0
    };

    if (this._ref.metadata) {
      let mData = this._ref.metadata;
      if (!isString(this._ref.metadata)) {
        mData = JSON.stringify(this._ref.metadata) 
      }

      const buf = new Buffer(mData);
      data.user_metadata_ptr = buf.ref()
      data.user_metadata_len = buf.length
      data.user_metadata_cap = buf.length
    }
    console.log('-----', data);
    return new t.File(data);
  }

  get data_map_name() {
    return this._ref.data_map_name;
  }

  get created() {
    return nativeH.fromCTime(this._ref.created);
  }

  get modified() {
    return nativeH.fromCTime(this._ref.modified);
  }

  get size() {
    return this._ref.size;
  }

  get version() {
    return this._ref.version;
  }

  // FIXME: add setters!

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
        .then(() => w.close()
          .then((xorAddr) => new File(this.mData.app, {
                size: content.length,
                data_map_name: xorAddr,
                created: nativeH.makeCTime(now),
                modified: nativeH.makeCTime(now)
              }))
        )
    );
  }

  fetch(fileName) {
    return lib.file_fetch(this.mData.app.connection, this.mData.ref, fileName)
      .then((res) => h.autoref(new File(this.mData.app, res)));
  }

  insert(fileName, file) {
    return lib.file_insert(this.mData.app.connection, this.mData.ref, fileName, file.ref.ref())
      .then((info) => file);
  }

  update(fileName, file, version) {
    return lib.file_update(this.mData.app.connection, this.mData.ref, fileName, file.ref, version)
      .then((info) => file);
  }
}

module.exports = NfsEmulation;

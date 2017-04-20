const lib = require('../../native/lib');
const t = require('../../native/types');
const nativeH = require('../../native/helpers');

function isString(arg) {
  return typeof arg === 'string' || (arg.toString ? arg.toString() === '[object String]' : false);
}

/**
* A NFS-style File
*
* _Note_: As this application layer, the network does not check any
* of the metadata provided.
**/
class File {

  /**
  * @private
  **/
  constructor(ref) {
    this._ref = ref;
  }

  get ref() {
    const data = {
      created_sec: this._ref.created_sec,
      created_nsec: this._ref.created_nsec,
      modified_sec: this._ref.modified_sec,
      modified_nsec: this._ref.modified_nsec,
      size: this._ref.size,
      data_map_name: this._ref.data_map_name,
      user_metadata_ptr: this._ref.data_map_name.ref(),
      user_metadata_len: 0,
      user_metadata_cap: 0
    };

    if (this._ref.metadata) {
      let mData = this._ref.metadata;
      if (!isString(this._ref.metadata)) {
        mData = JSON.stringify(this._ref.metadata);
      }

      const buf = new Buffer(mData);
      data.user_metadata_ptr = buf.ref();
      data.user_metadata_len = buf.length;
      data.user_metadata_cap = buf.length;
    }
    return new t.File(data);
  }

  /**
  * The dataMapName to read the immutable data at
  * @returns {Buffer}
  **/
  get dataMapName() {
    return this._ref.data_map_name;
  }

  /**
  * When was this created? in UTC.
  * @return {Date}
  **/
  get created() {
    return nativeH.fromSafeLibTime(this._ref.created_sec, this._ref.created_nsec);
  }

  /**
  * When was this last modified? in UTC.
  * @return {Date}
  **/
  get modified() {
    return nativeH.fromSafeLibTime(this._ref.modified_sec, this._ref.modified_nsec);
  }

  /**
  * How big is that file?
  * @return {Number} size in bytes
  **/
  get size() {
    return this._ref.size;
  }

  /**
  * Which version was this? Equals the Mdata-value-version.
  * @return {Number}
  **/
  get version() {
    return this._ref.version;
  }
}

/**
* NFS Emulation on top of an MData
**/
class NFS {
  /**
  * @private
  * @param {MutableData} mData - the MutableData to wrap around
  **/
  constructor(mData) {
    this.mData = mData;
  }

  /**
  * Create a new file with the given content, put the content
  * on the network via immutableData (public) and wrap it into
  * a File.
  * @param {(String|Buffer)} content
  * @returns {Promise<File>} a newly created file
  **/
  create(content) {
    const now = new Date();
    const {secs, nsecs_part} = nativeH.toSafeLibTime(now);
    return this.mData.app.immutableData.create()
      .then((w) => w.write(content)
        .then(() => w.close()
          .then((xorAddr) => new File({
            size: content.length,
            data_map_name: xorAddr,
            created_sec: secs,
            created_nsec: nsecs_part,
            modified_sec: secs,
            modified_nsec: nsecs_part,
          }))
        )
    );
  }

  /**
  * Find the file of the given filename (aka keyName in the MData)
  * @param {String} fileName - the path/file name
  * @returns {Promise<File>} - the file found for that path
  **/
  fetch(fileName) {
    return lib.file_fetch(this.mData.app.connection, this.mData.ref, fileName)
      .then((res) => new File(res));
  }

  /**
  * Insert the given file into the underlying MData, directly commit to the network
  * @param {(String|Buffer)} fileName - the path to store the file under
  * @param {File} file - the file to serialise and store there
  * @returns {Promise<File>} - the same file
  **/
  insert(fileName, file) {
    return lib.file_insert(this.mData.app.connection, this.mData.ref, fileName, file.ref.ref())
      .then(() => file);
  }

  /**
  * Replace a path with a new file. Directly commit to the network.
  * @param {(String|Buffer)} fileName - the path to store the file under
  * @param {File} file - the file to serialise and store there
  * @param {Number} version - the current version number, to ensure you
           are overwriting the right one
  * @returns {Promise<File>} - the same file
  **/
  update(fileName, file, version) {
    return lib.file_update(this.mData.app.connection, this.mData.ref, fileName,
                              file.ref.ref(), version)
      .then(() => file);
  }
}

module.exports = NFS;

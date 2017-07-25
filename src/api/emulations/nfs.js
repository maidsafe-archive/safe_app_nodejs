const lib = require('../../native/lib');
const t = require('../../native/types');
const nativeH = require('../../native/helpers');
const consts = require('../../consts');

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
  * Instantiate a new NFS File instance.
  *
  * @param {Object} ref the file's metadata including the XoR-name
  * of ImmutableData containing the file's content.
  **/
  constructor(ref) {
    this._ref = ref;
    if (Array.isArray(ref.data_map_name)) {
      // translate the incoming array back into a buffer we can use internally
      this._ref.data_map_name = t.XOR_NAME(ref.data_map_name);
    }
  }

  /**
  * @private
  * Return an instance of the underlying File structure used by the safe_app
  * lib containing the file's metadata.
  **/
  get ref() {
    const data = {
      size: this._ref.size,
      created_sec: this._ref.created_sec,
      created_nsec: this._ref.created_nsec,
      modified_sec: this._ref.modified_sec,
      modified_nsec: this._ref.modified_nsec,
      data_map_name: this.dataMapName,
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
    } else {
      let userData = Buffer.from([]);
      data.user_metadata_ptr = userData;
      data.user_metadata_len = userData.length;
      data.user_metadata_cap = userData.byteLength;
    }
    return new t.File(data);
  }

  /**
  * The dataMapName to read the immutable data at
  * @returns {Buffer} XoR-name
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
  * Which version was this? Equals the underlying MutableData's entry version.
  * @return {Number}
  **/
  get version() {
    return this._ref.version;
  }

  /**
  * @private
  * Update the file's version. This shall be only internally used and only
  * when its underlying entry in the MutableData is updated
  * @param {Integer} version version to set
  **/
  set version(version) {
    this._ref.version = version;
  }
}

/**
* NFS Emulation on top of an MData
**/
class NFS {
  /**
  * @private
  * Instantiate the NFS emulation layer rapping a MutableData instance
  *
  * @param {MutableData} mData - the MutableData to wrap around
  **/
  constructor(mData) {
    this.mData = mData;
  }

  /**
  * Helper function to create and save file to the network
  * @param {String|Buffer} content - file contents
  * @returns {File} a newly created file
  **/

  create(content) {
    let file = this.new();
    return this.open(file, consts.OPEN_MODE_OVERWRITE)
      .then(fh => this.write(fh, content).then(() => this.close(fh)))
      .then(file => file);
  }

  /**
  * Create a new file
  * @returns {File} a newly created file
  **/
  new() {
    const now = nativeH.toSafeLibTime(new Date());
    return new File({
      size: 0,
      data_map_name: new Array(32).fill(0),
      created_sec: now.now_sec_part,
      created_nsec: now.now_nsec_part,
      modified_sec: now.now_sec_part,
      modified_nsec: now.now_nsec_part,
      user_metadata_ptr: new Array(),
      user_metadata_len: 0,
      user_metadata_cap: 0

    })
  }

  /**
  * Find the file of the given filename (aka keyName in the MutableData)
  * @param {String} fileName - the path/file name
  * @returns {Promise<File>} - the file found for that path
  **/
  fetch(fileName) {
    return lib.dir_fetch_file(this.mData.app.connection, this.mData.ref, fileName)
      .then((res) => new File(res));
  }

  /**
  * Insert the given file into the underlying MutableData, directly commit
  * to the network.
  * @param {(String|Buffer)} fileName - the path to store the file under
  * @param {File} file - the file to serialise and store
  * @returns {Promise<File>} - the same file
  **/
  insert(fileName, file) {
    let _file = new File(file);
    return lib.dir_insert_file(this.mData.app.connection, this.mData.ref, fileName, _file.ref.ref())
      .then(() => _file);
  }

  /**
  * Replace a path with a new file. Directly commit to the network.
  * @param {(String|Buffer)} fileName - the path to store the file under
  * @param {File} file - the file to serialise and store
  * @param {Number} version - the version successor number, to ensure you
           are overwriting the right one
  * @returns {Promise<File>} - the same file
  **/
  update(fileName, file, version) {
    return lib.dir_update_file(this.mData.app.connection, this.mData.ref, fileName,
                           file.ref.ref(), version)
      .then(() => { file.version = version; })  // eslint-disable-line no-param-reassign
      .then(() => file);
  }

  /**
  * Delete a file from path. Directly commit to the network.
  * @param {(String|Buffer)} fileName
  * @param {Number} version
  * @returns {Promise}
  **/
  delete(fileName, version) {
    return lib.dir_delete_file(this.mData.app.connection, this.mData.ref, fileName, version);
  }

  /**
  * Open a file for reading or writing.
  *
  * OPEN MODES:
  *  /// Replaces the entire content of the file when writing data.
  *  const OPEN_MODE_OVERWRITE = 1;
  *  /// Appends to existing data in the file.
  *  const OPEN_MODE_APPEND = 2;
  *  /// Open file to read.
  *  const OPEN_MODE_READ = 4;
  *  /// Read entire contents of a file.
  *  const FILE_READ_TO_END = 0;
  *
  * These constants are declared in ../../consts.js and imported in this module
  *
  * @param {File} file
  * @param {Number} openMode
  * @returns {Promise<FileContextHandle>}
  **/
  open(file, openMode) {
    let _file = file.ref ? file.ref.ref() : new File(file).ref.ref();
    return lib.file_open(this.mData.app.connection, _file, openMode);
  }

  /**
  * Get file size
  * @param {FileContextHandle} fileContextHandle
  * @returns {Promise<Number>}
  **/
  size(fileContextHandle) {
    return lib.file_size(this.mData.app.connection, fileContextHandle);
  }

  /**
  * Read file
  * @param {FileContextHandle} fileContextHandle
  * @param {Number} position
  * @param {Number} len
  * @returns {Promise<[Data, Size]>}
  **/
  read(fileContextHandle, position, len) {
    return lib.file_read(this.mData.app.connection, fileContextHandle, position, len);
  }

  /**
  * Write file
  * @param {FileContextHandle} fileContextHandle
  * @param {Buffer|String} content
  * @returns {Promise}
  **/
  write(fileContextHandle, fileContent) {
    return lib.file_write(this.mData.app.connection, fileContextHandle, fileContent);
  }

  /**
  * Close file
  * @param {FileContextHandle} fileContextHandle
  * @returns {Promise<File>}
  **/
  close(fileContextHandle) {
    return lib.file_close(this.mData.app.connection, fileContextHandle);
  }

}

module.exports = NFS;

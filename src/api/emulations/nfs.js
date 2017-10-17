const lib = require('../../native/lib');
const t = require('../../native/types');
const nativeH = require('../../native/helpers');
const consts = require('../../consts').pubConsts;

function isString(arg) {
  return typeof arg === 'string' || (arg.toString ? arg.toString() === '[object String]' : false);
}

/**
* A NFS-style File
*
* _Note_: As this application layer, the network does not check any
* of the metadata provided.
*/
class File {

  /**
  * @private
  * Instantiate a new NFS File instance.
  *
  * @param {Object} ref the file's metadata including the XoR-name
  * of ImmutableData containing the file's content.
  */
  constructor(ref, connection, fileCtx) {
    this._ref = ref;
    this._fileCtx = fileCtx;
    this._connection = connection;
  }

  /**
  * @private
  * Return an instance of the underlying File structure used by the safe_app
  * lib containing the file's metadata.
  */
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
      const userData = Buffer.from([]);
      data.user_metadata_ptr = userData;
      data.user_metadata_len = userData.length;
      data.user_metadata_cap = userData.byteLength;
    }
    return new t.File(data);
  }

  /**
  * The dataMapName to read the immutable data at
  * @returns {Buffer} XoR-name
  */
  get dataMapName() {
    return this._ref.data_map_name;
  }

  /**
  * When was this created? in UTC.
  * @return {Date}
  */
  get created() {
    return nativeH.fromSafeLibTime(this._ref.created_sec, this._ref.created_nsec);
  }

  /**
  * When was this last modified? in UTC.
  * @return {Date}
  */
  get modified() {
    return nativeH.fromSafeLibTime(this._ref.modified_sec, this._ref.modified_nsec);
  }

  /**
  * Get file size
  * @returns {Promise<Number>}
  */
  size() {
    if (!this._fileCtx) {
      return Promise.resolve(this._ref.size);
    }
    return lib.file_size(this._connection, this._fileCtx)
      .then((size) => {
        this._ref.size = size;
        return size;
      });
  }

  /**
  * Read the file.
  * CONSTANTS.NFS_FILE_START and CONSTANTS.NFS_FILE_END may be used
  * to read the entire content of the file. These constants are
  * exposed by the safe-app-nodejs package.
  * @param {Number} position
  * @param {Number} len
  * @returns {Promise<[Data, Size]>}
  */
  read(position, len) {
    if (!this._fileCtx) {
      return Promise.reject(new Error('File is not open'));
    }
    return lib.file_read(this._connection, this._fileCtx, position, len);
  }

  /**
  * Write file
  * @param {Buffer|String} content
  * @returns {Promise}
  */
  write(fileContent) {
    if (!this._fileCtx) {
      return Promise.reject(new Error('File is not open'));
    }
    return lib.file_write(this._connection, this._fileCtx, fileContent);
  }

  /**
  * Close file
  * @returns {Promise}
  */
  close() {
    if (!this._fileCtx) {
      return Promise.reject(new Error('File is not open'));
    }

    const version = this._ref.version;
    return lib.file_close(this._connection, this._fileCtx)
      .then((res) => {
        this._ref = res;
        this._ref.version = version;
        this._fileCtx = null;
      });
  }

  /**
  * Which version was this? Equals the underlying MutableData's entry version.
  * @return {Number}
  */
  get version() {
    return this._ref.version;
  }

  /**
  * @private
  * Update the file's version. This shall be only internally used and only
  * when its underlying entry in the MutableData is updated
  * @param {Integer} version version to set
  */
  set version(version) {
    this._ref.version = version;
  }
}

/**
* NFS Emulation on top of an MData
*/
class NFS {
  /**
  * @private
  * Instantiate the NFS emulation layer rapping a MutableData instance
  *
  * @param {MutableData} mData - the MutableData to wrap around
  */
  constructor(mData) {
    this.mData = mData;
  }

  /**
  * Helper function to create and save file to the network
  * @param {String|Buffer} content - file contents
  * @returns {File} a newly created file
  */
  create(content) {
    return this.open(null, consts.NFS_FILE_MODE_OVERWRITE)
      .then((file) => file.write(content)
        .then(() => file.close())
        .then(() => file)
      );
  }

  /**
  * Find the file of the given filename (aka keyName in the MutableData)
  * @param {String} fileName - the path/file name
  * @returns {Promise<File>} - the file found for that path
  */
  fetch(fileName) {
    return lib.dir_fetch_file(this.mData.app.connection, this.mData.ref, fileName)
      .then((res) => new File(res, this.mData.app.connection, null));
  }

  /**
  * Insert the given file into the underlying MutableData, directly commit
  * to the network.
  * @param {(String|Buffer)} fileName - the path to store the file under
  * @param {File} file - the file to serialise and store
  * @returns {Promise<File>} - the same file
  */
  insert(fileName, file) {
    return lib.dir_insert_file(
        this.mData.app.connection, this.mData.ref, fileName, file.ref.ref()
      )
      .then(() => {
        const fileObj = file;
        fileObj.version = 0;
        return fileObj;
      });
  }

  /**
  * Replace a path with a new file. Directly commit to the network.
  * @param {(String|Buffer)} fileName - the path to store the file under
  * @param {File} file - the file to serialise and store
  * @param {Number} version - the version successor number, to ensure you
           are overwriting the right one
  * @returns {Promise<File>} - the same file
  */
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
  */
  delete(fileName, version) {
    return lib.dir_delete_file(this.mData.app.connection, this.mData.ref, fileName, version);
  }

  /**
  * Open a file for reading or writing.
  *
  * Open modes (these constants are exported by the safe-app-nodejs package):
  *  CONSTANTS.NFS_FILE_MODE_OVERWRITE: Replaces the entire content of the file when writing data.
  *  CONSTANTS.NFS_FILE_MODE_APPEND: Appends to existing data in the file.
  *  CONSTANTS.NFS_FILE_MODE_READ: Open file to read.
  *
  * @param {File} file
  * @param {CONSTANTS} [openMode=CONSTANTS.NFS_FILE_MODE_OVERWRITE]
  * @returns {Promise<File>}
  */
  open(file, openMode) {
    const now = nativeH.toSafeLibTime(new Date());
    const metadata = {
      size: 0,
      data_map_name: new Array(32).fill(0),
      created_sec: now.now_sec_part,
      created_nsec: now.now_nsec_part,
      modified_sec: now.now_sec_part,
      modified_nsec: now.now_nsec_part,
      user_metadata_ptr: [],
      user_metadata_len: 0,
      user_metadata_cap: 0
    };

    let fileParam = file;
    let mode = openMode;
    // FIXME: this is temporary as we should be able to pass a null file to the lib
    if (!file) {
      fileParam = new File(metadata, null, null);
      mode = consts.NFS_FILE_MODE_OVERWRITE;
    }

    // FIXME: free/discard the file it's already open, we are missing
    // a function from the lib to perform this.
    return lib.file_open(this.mData.app.connection, this.mData.ref, fileParam.ref.ref(), mode)
      .then((fileCtx) => new File(fileParam.ref, this.mData.app.connection, fileCtx));
  }
}

module.exports = NFS;

// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms.
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const lib = require('../../native/lib');
const t = require('../../native/types');
const nativeH = require('../../native/helpers');
const { pubConsts: CONSTANTS } = require('../../consts');
const errConst = require('../../error_const');
const makeError = require('../../native/_error.js');

/**
 * NFS-style file operations
 */
class File {
  /**
  * @hideconstructor
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
      user_metadata_ptr: this._ref.user_metadata_ptr,
      user_metadata_len: this._ref.user_metadata_len,
      user_metadata_cap: this._ref.user_metadata_cap
    };

    return new t.File(data);
  }

  /**
   * Get XOR address of file's underlying {@link ImmutableData} data map
   * @returns {Buffer} XOR address
   */
  get dataMapName() {
    return this._ref.data_map_name;
  }

  /**
  * Get metadata passed during file insertion of update
  * @returns {Buffer} user_metadata
  */
  get userMetadata() {
    return this._ref.user_metadata_ptr;
  }

  /**
   * Get UTC date of file context creation
   * @return {Date}
   */
  get created() {
    return nativeH.fromSafeLibTime(this._ref.created_sec, this._ref.created_nsec);
  }

  /**
   * Get UTC date of file context modification
   * @return {Date}
   */
  get modified() {
    return nativeH.fromSafeLibTime(this._ref.modified_sec, this._ref.modified_nsec);
  }

  /**
   * Get file size
   * @returns {Promise<Number>}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *   try {
   *     const nfs = await mData.emulateAs('NFS');
   *     const fileContext = await nfs.create('<buffer or string>');
   *     const fileSize = await fileContext.size();
   *   } catch (err) {
   *     throw err;
   *   }
   * };
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
   * @param {Number|CONSTANTS.NFS_FILE_START} position
   * @param {Number|CONSTANTS.NFS_FILE_END} len
   * @throws {ERR_FILE_NOT_FOUND}
   * @returns {Promise<{Buffer, Number}>}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const position = safe.CONSTANTS.NFS_FILE_START;
   * const len = safe.CONSTANTS.NFS_FILE_END;
   * const openMode = safe.CONSTANTS.NFS_FILE_MODE_READ;
   * const asyncFn = async () => {
   *   try {
   *     const nfs = await mData.emulateAs('NFS');
   *     let fileContext = await nfs.create('<buffer or string>');
   *     fileContext = await nfs.open(fileContext, openMode);
   *     const data = await fileContext.read(position, len);
   *   } catch (err) {
   *     throw err;
   *   }
   * };
   */
  read(position, len) {
    if (!this._fileCtx) {
      return Promise
        .reject(makeError(errConst.ERR_FILE_NOT_FOUND.code, errConst.ERR_FILE_NOT_FOUND.msg));
    }
    return lib.file_read(this._connection, this._fileCtx, position, len);
  }

  /**
   * Write file. Does not commit file to network.
   * @param {Buffer|String} content
   * @throws {ERR_FILE_NOT_FOUND}
   * @returns {Promise}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const nfs = await mData.emulateAs('NFS');
   *         const fileContext = await nfs.open();
   *         await fileContext.write('<buffer or string>');
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  write(content) {
    if (!this._fileCtx) {
      return Promise
        .reject(makeError(errConst.ERR_FILE_NOT_FOUND.code, errConst.ERR_FILE_NOT_FOUND.msg));
    }
    return lib.file_write(this._connection, this._fileCtx, content);
  }

  /**
   * Close file and commit to network.
   * @throws {ERR_FILE_NOT_FOUND}
   * @returns {Promise}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const content = '<html><body><h1>WebSite</h1></body></html>';
   * const asyncFn = async () => {
   *     try {
   *         const nfs = await mData.emulateAs('NFS');
   *         const fileContext = await nfs.open();
   *         await fileContext.write('<buffer or string>');
   *         await fileContext.close();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  close() {
    if (!this._fileCtx) {
      return Promise
        .reject(makeError(errConst.ERR_FILE_NOT_FOUND.code, errConst.ERR_FILE_NOT_FOUND.msg));
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
* NFS emulation on top of a {@link MutableData}
* @hideconstructor
*/
class NFS {
  constructor(mData) {
    this.mData = mData;
  }

  /**
   * Helper function to create and save file to the network
   * @param {String|Buffer} content
   * @returns {Promise<File>} a newly created file
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const content = '<html><body><h1>WebSite</h1></body></html>';
   * const asyncFn = async () => {
   *     try {
   *       const nfs = await mData.emulateAs('NFS');
   *       const fileContext = await nfs.create(content);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  create(content) {
    return this.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE)
      .then((file) => file.write(content)
        .then(() => file.close())
        .then(() => file)
      );
  }

  /**
   * Find the file of the given filename (aka keyName in the MutableData)
   * @param {String} fileName - the path/file name
   * @returns {Promise<File>} - the file found for that path
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const content = '<html><body><h1>WebSite</h1></body></html>';
   * const asyncFn = async () => {
   *     const fileName = 'index.html';
   *     try {
   *       const nfs = await mData.emulateAs('NFS');
   *       const fileContext = await nfs.create(content);
   *       await nfs.insert(fileName, fileContext);
   *       const fileContext = await nfs.fetch(fileName);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  fetch(fileName) {
    return lib.dir_fetch_file(this.mData.app.connection, this.mData.ref, fileName)
      .then((res) => new File(res, this.mData.app.connection, null));
  }

  /**
   * Insert the given file into the underlying {@link MutableData}, directly commit
   * to the network.
   *
   * _Note_: As this application layer, the network does not check any
   * of the metadata provided.
   * @param {(String|Buffer)} fileName The path to store the file under
   * @param {File} file The file to serialise and store
   * @param {String|Buffer} userMetadata
   * @returns {Promise<File>} The same file
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const content = '<html><body><h1>WebSite</h1></body></html>';
   * const userMetadata = 'text/html';
   * const asyncFn = async () => {
   *     try {
   *       const nfs = await mData.emulateAs('NFS');
   *       let fileContext = await nfs.create(content);
   *       const fileName = 'index.html';
   *       fileContext = await nfs.insert(fileName, fileContext, userMetadata);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  insert(fileName, file, userMetadata) {
    if (userMetadata) {
      const userMetadataPtr = Buffer.from(userMetadata);
      const fileMeta = file._ref; // eslint-disable-line no-underscore-dangle
      fileMeta.user_metadata_ptr = userMetadataPtr;
      fileMeta.user_metadata_len = userMetadata.length;
      fileMeta.user_metadata_cap = userMetadataPtr.length;
    }
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
   *
   * CONSTANTS.GET_NEXT_VERSION: Applies update to next file version.
   *
   * _Note_: As this application layer, the network does not check any
   * of the metadata provided.
   * @param {(String|Buffer)} fileName - the path to store the file under
   * @param {File} file - the file to serialise and store
   * @param {Number|CONSTANTS.GET_NEXT_VERSION} version - the version successor number
   * @param {String|Buffer} userMetadata - optional parameter for updating user metadata
   * @returns {Promise<File>} - the same file
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const content = '<html><body><h1>Updated WebSite</h1></body></html>';
   * const userMetadata = 'text/html';
   * const asyncFn = async () => {
   *     try {
   *       const version = safe.CONSTANTS.GET_NEXT_VERSION;
   *       const nfs = await mData.emulateAs('NFS');
   *       const fileContext = await nfs.create(content);
   *       const fileName = 'index.html';
   *       fileContext = await nfs.update(fileName, fileContext, version + 1, userMetadata);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  update(fileName, file, version, userMetadata) {
    if (userMetadata) {
      const userMetadataPtr = Buffer.from(userMetadata);
      const fileMeta = file._ref; // eslint-disable-line no-underscore-dangle
      fileMeta.user_metadata_ptr = userMetadataPtr;
      fileMeta.user_metadata_len = userMetadata.length;
      fileMeta.user_metadata_cap = userMetadataPtr.length;
    }
    const fileContext = file;
    return lib.dir_update_file(this.mData.app.connection, this.mData.ref, fileName,
      fileContext.ref.ref(), version)
      .then((newVersion) => {
        fileContext.version = newVersion;
      })
      .then(() => fileContext);
  }

  /**
   * Delete a file from path. Directly commit to the network.
   * @param {(String|Buffer)} fileName
   * @param {Number|CONSTANTS.GET_NEXT_VERSION} version - the version successor number
   * @returns {Promise<Number>} - version of deleted file
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const content = '<html><body><h1>Updated WebSite</h1></body></html>';
   * const fileName = 'index.html';
   * const asyncFn = async () => {
   *     try {
   *       const version = await mData.getVersion();
   *       const nfs = await mData.emulateAs('NFS');
   *       const fileContext = await nfs.create(content);
   *       fileContext = await nfs.insert(fileName, fileContext);
   *       const version = await nfs.delete(fileName, version + 1);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  delete(fileName, version) {
    return lib.dir_delete_file(this.mData.app.connection, this.mData.ref, fileName, version)
      .then((newVersion) => newVersion);
  }

  /**
   * Open a file for reading or writing.
   *
   * Open modes (these constants are exported by the safe-app-nodejs package):
   *
   * CONSTANTS.NFS_FILE_MODE_OVERWRITE: Replaces the entire content of the file when writing data.
   *
   * CONSTANTS.NFS_FILE_MODE_APPEND: Appends to existing data in the file.
   *
   * CONSTANTS.NFS_FILE_MODE_READ: Open file to read.
   *
   * @param {File|null} file If no {@link File} is passed,
   * then a new instance is created in {@link CONSTANTS.NFS_FILE_MODE_OVERWRITE}
   * @param {Number|CONSTANTS.NFS_FILE_MODE_OVERWRITE|
   *         CONSTANTS.NFS_FILE_MODE_APPEND|
   *         CONSTANTS.NFS_FILE_MODE_READ} [openMode=CONSTANTS.NFS_FILE_MODE_OVERWRITE]
   * @returns {Promise<File>}
   * @example
   * // Assumes {@link MutableData} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *       const nfs = await mData.emulateAs('NFS');
   *       const fileContext = await nfs.open();
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
      user_metadata_ptr: Buffer.from([]),
      user_metadata_len: 0,
      user_metadata_cap: 0
    };

    let fileParam = file;
    let mode = openMode;
    // FIXME: this is temporary as we should be able to pass a null file to the lib
    if (!file) {
      fileParam = new File(metadata, null, null);
      mode = CONSTANTS.NFS_FILE_MODE_OVERWRITE;
    }

    // FIXME: free/discard the file it's already open, we are missing
    // a function from the lib to perform this.
    return lib.file_open(this.mData.app.connection, this.mData.ref, fileParam.ref.ref(), mode)
      .then((fileCtx) => new File(fileParam.ref, this.mData.app.connection, fileCtx));
  }
}

module.exports = NFS;

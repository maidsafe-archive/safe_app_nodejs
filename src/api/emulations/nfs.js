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
      created_sec: this._ref.created_sec,
      created_nsec: this._ref.created_nsec,
      modified_sec: this._ref.modified_sec,
      modified_nsec: this._ref.modified_nsec,
      size: this._ref.size,
      data_map_name: this.dataMapName,
      user_metadata_ptr: this.dataMapName.ref(),
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
  * Create a new file with the given content, put the content
  * on the network via ImmutableData (public) and wrap it into
  * a File.
  * @param {(String|Buffer)} content
  * @returns {Promise<File>} a newly created file
  **/
  create(content) {
    const now = nativeH.toSafeLibTime(new Date());
    return this.mData.app.immutableData.create()
      .then((w) => w.write(content)
        .then(() => w.close()
          .then((xorAddr) => new File({
            size: content.length,
            data_map_name: xorAddr,
            created_sec: now.now_sec_part,
            created_nsec: now.now_nsec_part,
            modified_sec: now.now_sec_part,
            modified_nsec: now.now_nsec_part,
          }))
        )
    );
  }

  /**
  * Find the file of the given filename (aka keyName in the MutableData)
  * @param {String} fileName - the path/file name
  * @returns {Promise<File>} - the file found for that path
  **/
  fetch(fileName) {
    return lib.file_fetch(this.mData.app.connection, this.mData.ref, fileName)
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
    return lib.file_insert(this.mData.app.connection, this.mData.ref, fileName, file.ref.ref())
      .then(() => file);
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
    return lib.file_update(this.mData.app.connection, this.mData.ref, fileName,
                           file.ref.ref(), version)
      .then(() => { file.version = version; })  // eslint-disable-line no-param-reassign
      .then(() => file);
  }
}

module.exports = NFS;

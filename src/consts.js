const os = require('os');

const inTesting = (process.env.NODE_ENV || '').match(/dev|development|testing|test/) || typeof global.it === 'function';

const TAG_TYPE_DNS = 15001;
const TAG_TYPE_WWW = 15002;

const NET_STATE_UNKNOWN = -100;
const NET_STATE_INIT = -99;
const NET_STATE_DISCONNECTED = -1;
const NET_STATE_CONNECTED = 0;

// NFS_FILE_START and NFS_FILE_END may be used /
// with nfs.read(fileContextHandle, NFS_FILE_START, NFS_FILE_END)

/**
* @typedef {Object} CONSTANTS
* holds the information about this app, needed for authentication.
* @param {Number} NFS_FILE_MODE_OVERWRITE NFS File open in overwrite mode
* When used the param for nfs.open(<fileName>, <OPEN_MODE>) the entire content
* of the file will be replaced when writing data to it.
* @param {Number} NFS_FILE_MODE_APPEND NFS File open in append mode
* When used the param for nfs.open(<fileName>, <OPEN_MODE>) any new content
* written to the file will be appended to the end without modifying existing data.
* @param {Number} NFS_FILE_MODE_READ NFS File open in read-only mode
* When used the param for nfs.open(<fileName>, <OPEN_MODE>) only read
* operation is allowed.
* @param {Number} NFS_FILE_START Read the file from the beginning.
* @param {Number} NFS_FILE_END Read entire contents of a file.
* @param {Number} MD_PERM_ANYONE MutableData's permissions for anyone.
* @param {Number} MD_META_KEY MutableData entry key for its metadata.
*/
const pubConsts = {
  // Overwrites existing data in the file.
  NFS_FILE_MODE_OVERWRITE: 1,

  // Appends to existing data in the file.
  NFS_FILE_MODE_APPEND: 2,

  // Open file to read.
  NFS_FILE_MODE_READ: 4,

  // Read the file from the beginning.
  NFS_FILE_START: 0,

  // Read entire contents of a file.
  NFS_FILE_END: 0,

  // MutableData's permissions for anyone
  MD_PERM_ANYONE: 0,

  // MutableData entry key for its metadata
  MD_META_KEY: '_metadata',
};

const LIB_FILENAME = {
  win32: 'safe_app.dll',
  darwin: 'libsafe_app.dylib',
  linux: 'libsafe_app.so'
}[os.platform()];

const SYSTEM_URI_LIB_FILENAME = {
  win32: './system_uri.dll',
  darwin: './libsystem_uri.dylib',
  linux: './libsystem_uri.so'
}[os.platform()];

const INDEX_HTML = 'index.html';

module.exports = {
  LIB_FILENAME,
  SYSTEM_URI_LIB_FILENAME,

  TAG_TYPE_DNS,
  TAG_TYPE_WWW,

  NET_STATE_UNKNOWN,
  NET_STATE_INIT,
  NET_STATE_DISCONNECTED,
  NET_STATE_CONNECTED,

  INDEX_HTML,
  inTesting,
  pubConsts
};

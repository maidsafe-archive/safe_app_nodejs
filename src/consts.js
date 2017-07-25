const os = require('os');

const inTesting = (process.env.NODE_ENV || '').match(/dev|development|testing|test/) || typeof global.it === 'function';

const TAG_TYPE_DNS = 15001;
const TAG_TYPE_WWW = 15002;

const NET_STATE_UNKNOWN = -100;
const NET_STATE_INIT = -99;
const NET_STATE_DISCONNECTED = -1;
const NET_STATE_CONNECTED = 0;


// ********
// ********
// These constants are used with nfs.open(<fileName>, <OPEN_MODE>)
// FILE_READ_FROM_BEGIN and FILE_READ_TO_END may be used with nfs.read(fileContextHandle, FILE_READ_FROM_BEGIN, FILE_READ_TO_END)
//
/// Replaces the entire content of the file when writing data.
const OPEN_MODE_OVERWRITE = 1;
/// Appends to existing data in the file.
const OPEN_MODE_APPEND = 2;
/// Open file to read.
const OPEN_MODE_READ = 4;

const FILE_READ_FROM_BEGIN = 0;
/// Read entire contents of a file.
const FILE_READ_TO_END = 0;

// ********
// ********

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


module.exports = {
  LIB_FILENAME,
  SYSTEM_URI_LIB_FILENAME,

  TAG_TYPE_DNS,
  TAG_TYPE_WWW,

  NET_STATE_UNKNOWN,
  NET_STATE_INIT,
  NET_STATE_DISCONNECTED,
  NET_STATE_CONNECTED,

  OPEN_MODE_OVERWRITE,
  OPEN_MODE_APPEND,
  OPEN_MODE_READ,
  FILE_READ_FROM_BEGIN,
  FILE_READ_TO_END,

  inTesting
};


const os = require('os');

const TAG_TYPE_DNS = 1500;
const TAG_TYPE_WWW = 1500;

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
  TAG_TYPE_WWW
};

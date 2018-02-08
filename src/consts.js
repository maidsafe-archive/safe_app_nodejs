const os = require('os');
const path = require('path');

const inTesting = (process.env.NODE_ENV || '').match(/dev|development|testing|test/) || typeof global.it === 'function';

const TAG_TYPE_DNS = 15001;
const TAG_TYPE_WWW = 15002;

const NET_STATE_INIT = -100;
const NET_STATE_DISCONNECTED = -1;
const NET_STATE_CONNECTED = 0;

// Determine if process is forced to mock
const allPassedArgs = process.argv;

const hasMockFlag = allPassedArgs.includes('--mock');

const env = hasMockFlag ? 'development' : process.env.NODE_ENV || 'production';
const isRunningDevelopment = /^dev/.test(env);

let libLocationModifier = 'prod';

if (isRunningDevelopment || inTesting) {
  libLocationModifier = 'mock';
}

/**
* @typedef {Object} CONSTANTS
* Constants available for the applications to be used in a few cases
* as values of input parameters.
*
* @param {Number} NFS_FILE_MODE_OVERWRITE NFS File open in overwrite mode.
* When used as the `openMode` parameter for `nfs.open(<fileName>, <openMode>)` the entire content
* of the file will be replaced when writing data to it.
*
* @param {Number} NFS_FILE_MODE_APPEND NFS File open in append mode.
* When used as the `openMode` param for `nfs.open(<fileName>, <openMode>)` any new content
* written to the file will be appended to the end without modifying existing data.
*
* @param {Number} NFS_FILE_MODE_READ NFS File open in read-only mode.
* When used as the `openMode` param for `nfs.open(<fileName>, <openMode>)` only the read
* operation is allowed.
*
* @param {Number} NFS_FILE_START Read the file from the beginning.
* When used as the `position` param for the NFS `file.read(<position>, <length>)`
* function, the file will be read from the beginning.
*
* @param {Number} NFS_FILE_END Read until the end of a file.
* When used as the `length` param for the NFS `file.read(<position>, <length>)`
* function, the file will be read from the position provided until the end
* of its content. E.g. if `NFS_FILE_START` and `NFS_FILE_END` are passed in as
* the `position` and `length` parameters respectively, then the whole content of the
* file will be read.
*
* @param {Number} USER_ANYONE Any user.
* When used as the `signkey` param in any of the MutableData functions to
* manipulate user permissions, like `getUserPermissions`, `setUserPermissions`,
* `delUserPermissions`, etc., this will associate the permissions operation to
* any user rather than to a particular sign key.
* E.g. if this constant is used as the `signkey` param of
* the `setUserPermissions(<signKey>, <permissionSet>, <version>)` function,
* the permissions in the `permissionSet` provided will be granted to anyone
* rather to a specific user's/aplication's sign key.
*
* @param {String} MD_METADATA_KEY MutableData's entry key where its metadata is stored.
* The MutableData's metadata can be set either when invoking the `quickSetup`
* function or by invking the `setMetadata` function.
* The metadata is stored as an encoded entry in the MutableData which key
* is `MD_METADATA_KEY`, thus this constant can be used to realise which of the
* entries is not application's data but the MutableData's metadata instead.
* The metadata is particularly used by the Authenticator when another
* application has requested mutation permissions on a MutableData,
* displaying this information to the user, so the user can make a better
* decision to either allow or deny such a request based on it.
*
* @param {Number} MD_ENTRIES_EMPTY Represents an empty set of MutableData's entries.
* This can be used when invoking the `put` function of the MutableData API to
* signal that it should be committed to the network with an empty set of entries.
*
* @param {Number} MD_PERMISSION_EMPTY Represents an empty set of MutableData's permissions.
* This can be used when invoking the `put` function of the MutableData API to
* signal that it should be committed to the network with an empty set of permissions.
*
*/
const pubConsts = {
  NFS_FILE_MODE_OVERWRITE: 1,
  NFS_FILE_MODE_APPEND: 2,
  NFS_FILE_MODE_READ: 4,
  NFS_FILE_START: 0,
  NFS_FILE_END: 0,
  USER_ANYONE: 0,
  MD_METADATA_KEY: '_metadata',
  MD_ENTRIES_EMPTY: 0,
  MD_PERMISSION_EMPTY: 0,
};

const LIB_FILENAME = {
  win32: path.join('./', libLocationModifier, 'safe_app.dll'),
  darwin: path.join('./', libLocationModifier, 'libsafe_app.dylib'),
  linux: path.join('./', libLocationModifier, 'libsafe_app.so')
}[os.platform()];

const SYSTEM_URI_LIB_FILENAME = {
  win32: path.join('./', libLocationModifier, 'system_uri.dll'),
  darwin: path.join('./', libLocationModifier, 'libsystem_uri.dylib'),
  linux: path.join('./', libLocationModifier, 'libsystem_uri.so')
}[os.platform()];

const INDEX_HTML = 'index.html';

module.exports = {
  LIB_FILENAME,
  SYSTEM_URI_LIB_FILENAME,

  TAG_TYPE_DNS,
  TAG_TYPE_WWW,

  NET_STATE_INIT,
  NET_STATE_DISCONNECTED,
  NET_STATE_CONNECTED,

  INDEX_HTML,
  inTesting,
  pubConsts,
  hasMockFlag
};

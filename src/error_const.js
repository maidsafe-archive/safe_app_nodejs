module.exports = {

  /**
   * @name ERR_NO_SUCH_DATA
   * @type {object}
   * @description Thrown natively when data not found on network.
   * @property {number} code -103
   * @property {string} msg
   */
  ERR_NO_SUCH_DATA: {
    code: -103,
    msg: 'No such data.'
  },

  /**
   * @name ERR_NO_SUCH_ENTRY
   * @type {object}
   * @description Thrown natively when entry on found in MutableData.
   * @property {number} code -106
   * @property {string} msg
   */
  ERR_NO_SUCH_ENTRY: {
    code: -106,
    msg: 'Entry does not exist.'
  },

  /**
   * @name ERR_FILE_NOT_FOUND
   * @type {object}
   * @description Thrown natively when NFS-style file not found.
   * @property {number} code -301
   * @property {string} msg
   */
  ERR_FILE_NOT_FOUND: {
    code: -301,
    msg: 'File not found.'
  },

  /**
   * @name FAILED_TO_LOAD_LIB
   * @type {object}
   * @description Thrown when a native library fails to load and which library.
   * @property {number} code 1000
   * @property {function} msg
   */
  FAILED_TO_LOAD_LIB: {
    code: 1000,
    msg: (e) => `Failed to load native libraries: ${e}`
  },

  /**
   * @name SETUP_INCOMPLETE
   * @type {object}
   * @description Informs that app is not yet connected to network.
   * @property {number} code 1001
   * @property {string} msg
   */
  SETUP_INCOMPLETE: {
    code: 1001,
    msg: 'Setup Incomplete. Connection not available yet.'
  },

  /**
   * @name MALFORMED_APP_INFO
   * @type {object}
   * @description Informs when app info provided during initialisation is invalid.
   * @property {number} code 1002
   * @property {string} msg
   */
  MALFORMED_APP_INFO: {
    code: 1002,
    msg: `
    Malformed appInfo.
    Please conform to proper format and be sure "id", "name", and "vendor" properties are defined:
    {
      id: 'net.maidsafe.example.id',
      name: 'Name of App',
      vendor: 'MaidSafe Ltd.',
      scope: null
    }`
  },

  /**
   * @name MISSING_PERMS_ARRAY
   * @type {object}
   * @description Argument should be an array object.
   * @property {number} code 1003
   * @property {string} msg
   */
  MISSING_PERMS_ARRAY: {
    code: 1003,
    msg: 'Argument should be an array object'
  },

  /**
   * @name INVALID_SHARE_MD_PERMISSION
   * @type {object}
   * @description Informs of a specific object in a share MData permissions array that is malformed.
   * @property {number} code 1004
   * @property {function} msg
   */
  INVALID_SHARE_MD_PERMISSION: {
    code: 1004,
    msg: (perm) => `Invalid share MData permission: ${perm}`
  },

  /**
   * @name INVALID_PERMS_ARRAY
   * @type {object}
   * @description Thrown when share MD permissions is not an array.
   * @property {number} code 1005
   * @property {string} msg
   */
  INVALID_PERMS_ARRAY: {
    code: 1005,
    msg: 'Permissions provided are not in array format'
  },

  /**
   * @name MISSING_URL
   * @type {object}
   * @description Please provide URL
   * @property {number} code 1006
   * @property {string} msg
   */
  MISSING_URL: {
    code: 1006,
    msg: 'Please provide URL'
  },

  /**
   * @name INVALID_URL
   * @type {object}
   * @description Please provide URL in string format.
   * @property {number} code 1007
   * @property {string} msg
   */
  INVALID_URL: {
    code: 1007,
    msg: 'Please provide URL in string format'
  },

  /**
   * @name MISSING_AUTH_URI
   * @type {object}
   * @description Thrown when attempting to connect without authorisation URI.
   * @property {number} code 1008
   * @property {string} msg
   */
  MISSING_AUTH_URI: {
    code: 1008,
    msg: 'Please provide auth URI'
  },

  /**
   * @name NON_AUTH_GRANTED_URI
   * @type {object}
   * @description Thrown when attempting extract granted access permissions
   * from a URI which doesn't contain such information.
   * @property {number} code 1009
   * @property {string} msg
   */
  NON_AUTH_GRANTED_URI: {
    code: 1009,
    msg: 'The URI provided is not for an authenticated app with permissions information'
  },

  /**
   * @name INVALID_PERM
   * @type {object}
   * @description Thrown when invalid permission is requested on container.
   * @property {number} code 1010
   * @property {function} msg
   */
  INVALID_PERM: {
    code: 1010,
    msg: (perm) => `${perm} is not a valid permission`
  },

  /**
   * @name MISSING_CONTAINER_STRING
   * @type {object}
   * @description Thrown when attempting to get a container without specifying name with a string.
   * @property {number} code 1011
   * @property {string} msg
   */
  MISSING_CONTAINER_STRING: {
    code: 1011,
    msg: 'Please provide container string argument'
  },

  /**
   * @name NON_DEV
   * @type {object}
   * @description Thrown when functions unique to testing environment are attempted  to be used.
   * @property {number} code 1012
   * @property {string} msg
   */
  NON_DEV: {
    code: 1012,
    msg: `
    Not supported outside of Dev and Testing Environment.
    Set NODE_ENV=dev`
  },

  /**
   * @name MISSING_PUB_ENC_KEY
   * @type {object}
   * @description Thrown when public encryption key is not provided as necessary function argument.
   * @property {number} code 1013
   * @property {string} msg
   */
  MISSING_PUB_ENC_KEY: {
    code: 1013,
    msg: `
    Please provide public encryption key.
    For example:
    - app.crypto.getAppPubEncKey()
    - const encKeyPair = app.crypto.generateEncKeyPair();
      encKeyPair.pubEncKey;`
  },

  /**
   * @name MISSING_SEC_ENC_KEY
   * @type {object}
   * @description Thrown when secret encryption key is not provided as necessary function argument.
   * @property {number} code 1014
   * @property {function} msg
   */
  MISSING_SEC_ENC_KEY: {
    code: 1014,
    msg: (size) => `
    Please provide ${size} byte secret encryption key:
    const encKeyPair = app.crypto.generateEncKeyPair();
    encKeyPair.secEncKey;`
  },

  /**
   * @name LOGGER_INIT_ERROR
   * @type {object}
   * @description Logger initialisation failed.
   * @property {number} code 1015
   * @property {function} msg
   */
  LOGGER_INIT_ERROR: {
    code: 1015,
    msg: (e) => `Logger initialisation failed. Reason: ${e}`
  },

  /**
   * @name CONFIG_PATH_ERROR
   * @type {object}
   * @description Informs you when config search path has failed to set, with specific reason.
   * @property {number} code 1016
   * @property {function} msg
   */
  CONFIG_PATH_ERROR: {
    code: 1016,
    msg: (e) => `Failed to set additional config search path. Reason: ${e}`
  },

  /**
   * @name XOR_NAME
   * @type {object}
   * @description Custom name used to create public or private
   * MutableData must be 32 bytes in length.
   * @property {number} code 1017
   * @property {function} msg
   */
  XOR_NAME: {
    code: 1017,
    msg: (size) => `Name _must be_ provided and ${size} bytes long.`
  },

  /**
   * @name NONCE
   * @type {object}
   * @description Any string or buffer provided to private MutableData
   * that is not 24 bytes in length will throw error.
   * @property {number} code 1018
   * @property {function} msg
   */
  NONCE: {
    code: 1018,
    msg: (size) => `Nonce _must be_ provided and ${size} bytes long.`
  },

  /**
   * @name TYPE_TAG_NAN
   * @type {object}
   * @description Tag argument when creating private or public MutableData must be a number.
   * @property {number} code 1019
   * @property {string} msg
   */
  TYPE_TAG_NAN: {
    code: 1019,
    msg: 'Type tag provided _must be_ an integer'
  },

  /**
   * @name INVALID_SEC_KEY
   * @type {object}
   * @description Secret encryption key of improper length is provided to custom private MutableData
   * @property {number} code 1020
   * @property {function} msg
   */
  INVALID_SEC_KEY: {
    code: 1020,
    msg: (size) => `Secret encryption key _must be_ provided and ${size} bytes long.`
  }
};

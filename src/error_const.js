module.exports = {
  ERR_NO_SUCH_DATA: -103,
  ERR_NO_SUCH_ENTRY: -106,
  ERR_FILE_NOT_FOUND: -301,
  FAILED_TO_LOAD_LIB: {
    code: 1,
    msg: (e) => `Failed to load native libraries: ${e}`
  },

  MALFORMED_APP_INFO: {
    code: 2,
    msg: `
    Malformed appInfo.
    Please conform to proper format and be sure id, name, and vendor properties are defined:
    {
      id: 'net.maidsafe.example.id',
      name: 'Name of App',
      vendor: 'MaidSafe Ltd.',
      scope: null
    }`
  },

  MISSING_PERMS_ARRAY: {
    code: 3,
    msg: 'Argument should be an array object'
  },

  INVALID_SHARE_MD_PERMISSION: {
    code: 4,
    msg: (perm) => `Invalid share MData permission: ${perm}`
  },

  INVALID_PERMS_ARRAY: {
    code: 5,
    msg: 'Permissions provided are not in array format'
  },

  MISSING_URL: {
    code: 6,
    msg: 'Please provide URL'
  },

  INVALID_URL: {
    code: 7,
    msg: 'Please provide URL in string format'
  },

  MISSING_AUTH_URI: {
    code: 8,
    msg: 'Please provide auth URI'
  },

  MISSING_CONTAINERS_OBJECT: {
    code: 9,
    msg: `
    Please provide container object.
    For example:
    {
      _public: ['Insert'],
      _publicNames: ['ManagePermissions']
    }`
  },

  MISSING_CONTAINER_STRING: {
    code: 10,
    msg: 'Please provide container string argument'
  },

  NON_DEV: {
    code: 11,
    msg: `
    Not supported outside of Dev and Testing Environment.
    Set NODE_ENV=dev`
  },

  MISSING_PUB_ENC_KEY: {
    code: 12,
    msg: `
    Please provide public encryption key.
    For example:
    - app.crypto.getAppPubEncKey()
    - const encKeyPair = app.crypto.generateEncKeyPair();
      encKeyPair.pubEncKey;`
  },

  MISSING_SEC_ENC_KEY: {
    code: 13,
    msg: `
    Please provide secret encryption key:
    const encKeyPair = app.crypto.generateEncKeyPair();
    encKeyPair.secEncKey;`
  }
};

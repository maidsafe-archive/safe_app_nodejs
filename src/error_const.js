module.exports = {
  FAILED_TO_LOAD_LIB: {
    code: 1,
    msg: (e) => `Failed to load native libraries: ${e}`
  },

  MALFORMED_APP_INFO: {
    code: 2,
    msg: `
    Malformed appInfo.
    Make sure you conform to proper format and that id, name, and vendor are defined:
    {
      id: 'net.maidsafe.example.id',
      name: 'Name of App',
      vendor: 'MaidSafe Ltd.',
      scope: null
    }`
  },

  NO_CONTAINERS: {
    code: 3,
    msg: `
    App was not authorised with containers.
    If this is unexpected, make sure to request containers permissions:
    {
      _public: ['Read', 'Insert']
    }`
  }
};

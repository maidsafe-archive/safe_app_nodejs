/**
 * NFS Read and Write - example app
 * Run the code using `node examples/nfs_file.js` cmd from root directory.
 * NOTE: Open latest safe_browser instance from terminal.
 *       Auth request popups on executing this code.
 *       Click Allow button and you will see response URI printed on safe_browser terminal.
 *       Copy that response URI and paste it on example terminal next to `Enter Authenticator response =>`.
 */

const readline = require('readline');
const crypto = require('crypto');
const safeApp = require('../src/');
const lib = require('../src/native/lib');


const appInfo = {
  'id': 'net.maidsafe.examples.nfsReadWrite',
  'name': 'NodeJS example App - NFS read/write',
  'vendor': 'MaidSafe.net Ltd.'
};

const containers = {
  _public: [
    'Read',
    'Insert',
    'Update',
    'Delete',
    'ManagePermissions'
  ],
  _publicNames: [
    'Read',
    'Insert',
    'Update',
    'Delete',
    'ManagePermissions'
  ]
};

let appObj = null;
const tagType = 1500;
const publicName = `MAID-NFS-${crypto.randomBytes(5).toString('hex')}`;
const fileName = 'testFile.txt';
const fileContent = 'Some example content...';

/**
 * Authorise application with authenticator
 * @returns {Promise.<TResult>}
 */
const authoriseApp = () => {
  return safeApp.initializeApp(appInfo)
    .then(app => app.auth.genAuthUri(containers))
    .then(res => {
      console.log('Trying to open request no ' + res.req_id + ' as ' + res.uri);
      return lib.openUri(res.uri)
    })
    .then(() => {
      // Get authorisation response URI from authenticator
      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question('\nEnter Authenticator response => ', (answer) => {
          resolve(answer);
          rl.close();
        });
      });
    })
    .then((uri) => {
      // Register safe app with authorisation response URI
      // TODO: validate response uri
      return safeApp.fromAuthURI(appInfo, uri);
    })
};

authoriseApp()
  .then((app) => (appObj = app))
  // Creating new Public Mutable Data, which act as the parent directory for the new file
  .then(() => appObj.mutableData.newPublic(crypto.createHash('sha256').update(publicName).digest(), tagType))
  .then(mdata => {
    let permissionSet = null;
    let permissions = null;
    let entries = null;
    let signKey = null;
    // Get NFS Emnulator object
    const nfs = mdata.emulateAs('NFS');

    console.log(`\nCreating new public mutable data with name :: ${publicName}`);
    console.log(`\nCreating new file \nName :: ${fileName} \nContent :: ${fileContent}`);

    return new Promise((resolve, reject) => {
      // Save the parent directory mutable data with entry and permissions
      appObj.mutableData.newPermissionSet()
        .then((perm) => (permissionSet = perm))
        .then(() => permissionSet.setAllow('ManagePermissions'))
        .then(() => permissionSet.setAllow('Insert'))
        .then(() => appObj.auth.getPubSignKey())
        .then((key) => (signKey = key))
        .then(() => appObj.mutableData.newPermissions())
        .then((perm) => (permissions = perm))
        .then(() => permissions.insertPermissionSet(signKey.ref, permissionSet.ref))
        .then(() => appObj.mutableData.newEntries())
        .then((entry) => (entries = entry))
        .then(() => mdata.put(permissions, entries))
        // Creating new file
        .then(() => nfs.create(fileContent))
        // Insert file into its parent directory
        .then((file) => nfs.insert(fileName, file))
        // Fetching file created. This returns File object which holds the Immutable data address within `data_map_name` key.
        .then(() => nfs.fetch(fileName))
        // Get Immutable data reader object
        .then((res) => appObj.immutableData.fetch(res.data_map_name))
        // Read the Immutable data
        .then((res) => res.read())
        .then((res) => {
          console.log('\nImmutable data content ::', res.toString());
          return resolve(res);
        })
        .catch(reject)
    });
  })
  .catch((err) => {
    console.log('Error :: ', err);
    return Promise.reject(err)
  });

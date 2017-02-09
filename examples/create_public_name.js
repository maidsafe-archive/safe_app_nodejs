/**
 * Create new Public Name - example app
 * Run the code using `node examples/create_public_name.js` cmd from root directory.
 * NOTE: Open SAFE Browser instance with the authenticator add-on from the terminal.
 *       Auth request popups on executing this code.
 *       Click Allow button and you will see response URI printed on safe_browser terminal.
 *       Copy that response URI and paste it on example terminal next to `Enter Authenticator response =>`.
 */

const readline = require('readline');
const crypto = require('crypto');
const safeApp = require('../src/');
const lib = require('../src/native/lib');

const appInfo = {
  'id': 'net.maidsafe.examples.createPublicName',
  'name': 'NodeJS example App - create public name',
  'vendor': 'MaidSafe'
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
const tagType = 1500; // TODO check typeTag code
const publicName = `MAID-${crypto.randomBytes(5).toString('hex')}`;
let serializedData = null;

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
  // Create new Public Mutable Data with hash of publicName.
  // This will throw error if publicName already exist in the network.
  .then(() => appObj.mutableData.newPublic(crypto.createHash('sha256').update(publicName).digest(), tagType))
  .then(mdata => {
    let permissionSet = null;
    let permissions = null;
    let entries = null;
    let signKey = null;
    console.log(`\nCreating new public mutable data with name :: ${publicName}`);
    return new Promise((resolve, reject) => {
      // Save the new Public mutable data with entry and permissions
      appObj.mutableData.newPermissionSet()
        .then((perm) => (permissionSet = perm))
        .then(() => permissionSet.setAllow('ManagePermissions'))
        .then(() => appObj.auth.getPubSignKey())
        .then((key) => (signKey = key))
        .then(() => appObj.mutableData.newPermissions())
        .then((perm) => (permissions = perm))
        .then(() => permissions.insertPermissionSet(signKey.ref, permissionSet.ref))
        .then(() => appObj.mutableData.newEntries())
        .then((entry) => (entries = entry))
        .then(() => mdata.put(permissions, entries))
        // Serialise it to get its address to store it inside __PublicNames container
        .then(() => mdata.serialise())
        .then((res) => {
          console.log('\nSerialised Mutable data ::', res);
          return resolve(res);
        })
        .catch(reject)
    });
  })
  .then((data) => (serializedData = data.toString('base64')))
  // Get _publicNames container to store the new Public Name
  .then(() => appObj.auth.getAccessContainerInfo('_publicNames'))
  .then((mut) => mut.getEntries())
  // Insert serialised new Public Name mutable data into _publicNames container
  .then((entry) => {
    return entry.insert(publicName, serializedData)
      .then(() => entry)
  })
  // Trying to get the new Public Name created
  .then((entry) => entry.get(publicName))
  .then((res) => {
    console.log(`\nInserted into _publicNames Container. Inserted entry =>`, res);
    return Promise.resolve(true);
  })
  .catch((err) => {
    console.log('Error :: ', err);
    return Promise.reject(err)
  });

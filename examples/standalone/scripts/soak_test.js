const safeApp = require('@maidsafe/safe-node-app');
const { waitUntil } = require('wait');

let EXIT_CONDITION = false;
const registeredUri = 'safe-bmv0lnnhzmuuc29ha190zxn0:AQAAAFz7P5oAAAAAAAAAACAAAAAAAAAASVU0h3Nk8q_vav-3icH40hJYCUnMmEFlG-sufgHnz9ogAAAAAAAAAKXvy37gf0iAK2gpOFhihMYR9x-3JveVTUuPaorE5_i8IAAAAAAAAAAxqHkqjJ6tCRfjSpjpcX0FDGd3rVaATX3kuBH9ZMlbx0AAAAAAAAAAodSErgnvbkXVMULNOHQ_NkW6_Hezdu4ZaNTkQORyi3cxqHkqjJ6tCRfjSpjpcX0FDGd3rVaATX3kuBH9ZMlbxyAAAAAAAAAAmAjxDfroKhaqfF6jOF742daltdLPY3DGy3spI7rZSy4gAAAAAAAAABqBrgTDrAR_qMkmThYe0d4oFB4ivpbNDpCdzFSsB0LpAAAAAAAAAAAAAAAAAAAAAJN0FcEUTVwD2-VzSeUHuOOSWkMW-cLUzzDpi-IidezGmDoAAAAAAAAYAAAAAAAAAKmJI6c690kHHjWRnzhXH2Pw7KWOPSxJbgMAAAAAAAAABwAAAAAAAABfcHVibGlj-PqMrnHc7Q6ZoGUxfkMirD5mdLx5emAhxeIPxoKwXsiYOgAAAAAAAAAAAwAAAAAAAAAAAAAAAQAAAAMAAAAXAAAAAAAAAGFwcHMvbmV0LnNhZmUuc29ha190ZXN08k_XQj08I5NtvTDz0EDbzKNSux5gI47mt-lP87KtnJCYOgAAAAAAAAEgAAAAAAAAAHFBANtHWOZBfcGyfF1pGvqfUrnlA3RMEs1Q4xacSFvIGAAAAAAAAADz6K6VVJ-3VP5KBtceZxQMhtAPh2vHqyQABQAAAAAAAAAAAAAAAQAAAAIAAAADAAAABAAAAAwAAAAAAAAAX3B1YmxpY05hbWVzYyuBxRMbHb5BaHRRWFrmQ6c8MLHpU1XaSsci9pE_iQSYOgAAAAAAAAEgAAAAAAAAANqw33JHYsVTxkp2eIAlDcWppnjO249yG4MmSbhZ98-oGAAAAAAAAADVfq6Q3h3TT34OLUe1YuRTEEEKA1k9xecAAgAAAAAAAAAAAAAAAQAAAA';

const finish = () => {
  console.log("Itrations finished");
	EXIT_CONDITION = true;
}

const run = async () => {
    const numOfIterations = process.argv[2] || 400;
    console.log("Number of iterations:", numOfIterations);

    const numOfSteps = process.argv[3] || 15;
    console.log("Number of steps to run per iteration:", numOfSteps);

    const APP = {
        info: {
            id: 'net.safe.soak_test',
            name: 'WebApp Soak-Test',
            vendor: 'MaidSafe.net Ltd.'
        },
        permissions: {}
    };
    const typeTag = 15001;
    const data = { key : 'Safe World' };

    try {
        console.log();
        console.log('Soak testing');
        console.log('************');

        let app = await safeApp.fromAuthURI(APP.info, registeredUri);
        console.log("Application Initialised and Logged in successfully");

        for (i = 1; i <= numOfIterations; i++) {
          const iterationId = 'iteration_' + Math.random();
          console.log(`****** Start of iteration #${i} ******`);

          // #1: Create a sha3 hash of a random string
          const hash = await app.crypto.sha3Hash(iterationId);
          console.log(`Hash for '${iterationId}' created`);
          if (numOfSteps < 2) return finish();

          // #2: Create public MD at specific address
          const pubMd = await app.mutableData.newPublic(hash, typeTag);
          console.log('New public MD created at custom address');
          if (numOfSteps < 3) return finish();

          // #3: Create a Permissions
          const mdPerms = await app.mutableData.newPermissions();
          console.log('MD permissions created');
          if (numOfSteps < 4) return finish();

          // #4: Get app's pub sign key
          const appPubSignKey = await app.crypto.getAppPubSignKey();
          console.log('App\'s public sign key retrieved');
          if (numOfSteps < 5) return finish();

          // #5: Insert permission set into MD with app's pub sign key
          const permissionSet = ['Insert', 'Update', 'Delete', 'ManagePermissions'];
          await mdPerms.insertPermissionSet(appPubSignKey, permissionSet);
          console.log('Permission set inserted in permissions object');
          if (numOfSteps < 6) return finish();

          // #6: Create random private MD
          const privMd = await app.mutableData.newRandomPrivate(typeTag);
          console.log('New random private MD created');
          if (numOfSteps < 7) return finish();

          // #7: Commit private MD with permissions for app's pub sign key
          await privMd.put(mdPerms, safeApp.CONSTANTS.USER_ANYONE);
          console.log('Private MD committed to the network');
          if (numOfSteps < 8) return finish();

          // #8: List MD keys
          const mdKeys = await privMd.getKeys();
          console.log('Private MD list keys retrieved:', mdKeys);
          if (numOfSteps < 9) return finish();

          // #9: Serialise private MD committed to the network
          const serialisedMd = await privMd.serialise();
          console.log('Private MD serialised');
          if (numOfSteps < 10) return finish();

          // #10: Put serialised private MD into a Json and get app's own containers
          const obj = { iterationId, serialisedMd };
          const ownContName = await app.getOwnContainerName();
          console.log('App\'s own container name:', ownContName);
          const ownCont = await app.auth.getContainer(ownContName);
          console.log('App\'s own container retrieved');
          if (numOfSteps < 11) return finish();

          // #11: Encrypt key in app's own container
          const entryKey = await ownCont.encryptKey(hash);
          console.log('Entry key encrypted');
          if (numOfSteps < 12) return finish();

          // #12: Encrypt Json object as value in app's own container
          const entryValue = await ownCont.encryptValue(serialisedMd);
          console.log('Entry value encrypted');
          if (numOfSteps < 13) return finish();

          // #13: Create new mutations object
          const mdMut = await app.mutableData.newMutation();
          console.log('New mutation object created');
          if (numOfSteps < 14) return finish();

          // #14: Insert encrypted key and value into the mutations object
          await mdMut.insert(entryKey, entryValue);
          console.log('Mutation inserted in mutation object');
          if (numOfSteps < 15) return finish();

          // #15: Apply mutations to app's own contianer
          await ownCont.applyEntriesMutation(mdMut);
          console.log('Mutation applied to MD');

          console.log(`****** End of iteration #${i} ******`);
        }
	} catch(e) {
		console.log("Execution failed", e);
	}
  finish();
};

run();

waitUntil(() => EXIT_CONDITION === true, 500, () => {});

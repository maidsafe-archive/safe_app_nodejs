const safeApp = require('@maidsafe/safe-node-app');
const { waitUntil } = require('wait');

let EXIT_CONDITION = false;
const registeredUri = 'safe-bmv0lnnhzmuuc29ha190zxn0:AQAAAFz7P5oAAAAAAAAAACAAAAAAAAAASVU0h3Nk8q_vav-3icH40hJYCUnMmEFlG-sufgHnz9ogAAAAAAAAAKXvy37gf0iAK2gpOFhihMYR9x-3JveVTUuPaorE5_i8IAAAAAAAAAAxqHkqjJ6tCRfjSpjpcX0FDGd3rVaATX3kuBH9ZMlbx0AAAAAAAAAAodSErgnvbkXVMULNOHQ_NkW6_Hezdu4ZaNTkQORyi3cxqHkqjJ6tCRfjSpjpcX0FDGd3rVaATX3kuBH9ZMlbxyAAAAAAAAAAmAjxDfroKhaqfF6jOF742daltdLPY3DGy3spI7rZSy4gAAAAAAAAABqBrgTDrAR_qMkmThYe0d4oFB4ivpbNDpCdzFSsB0LpAAAAAAAAAAAAAAAAAAAAAJN0FcEUTVwD2-VzSeUHuOOSWkMW-cLUzzDpi-IidezGmDoAAAAAAAAYAAAAAAAAAKmJI6c690kHHjWRnzhXH2Pw7KWOPSxJbgMAAAAAAAAABwAAAAAAAABfcHVibGlj-PqMrnHc7Q6ZoGUxfkMirD5mdLx5emAhxeIPxoKwXsiYOgAAAAAAAAAAAwAAAAAAAAAAAAAAAQAAAAMAAAAXAAAAAAAAAGFwcHMvbmV0LnNhZmUuc29ha190ZXN08k_XQj08I5NtvTDz0EDbzKNSux5gI47mt-lP87KtnJCYOgAAAAAAAAEgAAAAAAAAAHFBANtHWOZBfcGyfF1pGvqfUrnlA3RMEs1Q4xacSFvIGAAAAAAAAADz6K6VVJ-3VP5KBtceZxQMhtAPh2vHqyQABQAAAAAAAAAAAAAAAQAAAAIAAAADAAAABAAAAAwAAAAAAAAAX3B1YmxpY05hbWVzYyuBxRMbHb5BaHRRWFrmQ6c8MLHpU1XaSsci9pE_iQSYOgAAAAAAAAEgAAAAAAAAANqw33JHYsVTxkp2eIAlDcWppnjO249yG4MmSbhZ98-oGAAAAAAAAADVfq6Q3h3TT34OLUe1YuRTEEEKA1k9xecAAgAAAAAAAAAAAAAAAQAAAA';

const run = async () => {
  const APP = {
      info: {
          id: 'net.safe.soak_test',
          name: 'WebApp Soak-Test',
          vendor: 'MaidSafe.net Ltd.'
      },
      permissions: {}
  };

  try {
      // Set of possible test (incremental) steps to execcute per iteration
      const steps = [
        async (ctx) => {
          // #1: Create a sha3 hash of a random string
          ctx.hash = await ctx.app.crypto.sha3Hash(ctx.iterationId);
          console.log(`Hash for '${ctx.iterationId}' created`);
        },
        async (ctx) => {
          // #2: Create public MD at specific address
          ctx.pubMd = await ctx.app.mutableData.newPublic(ctx.hash, ctx.typeTag);
          console.log('New public MD created at custom address');
        },
        async (ctx) => {
          // #3: Create a Permissions
          ctx.mdPerms = await ctx.app.mutableData.newPermissions();
          console.log('MD permissions created');
        },
        async (ctx) => {
          // #4: Get app's pub sign key
          ctx.appPubSignKey = await ctx.app.crypto.getAppPubSignKey();
          console.log('App\'s public sign key retrieved');
        },
        async (ctx) => {
          // #5: Insert permission set into MD with app's pub sign key
          const permissionSet = ['Insert', 'Update', 'Delete', 'ManagePermissions'];
          await ctx.mdPerms.insertPermissionSet(ctx.appPubSignKey, permissionSet);
          console.log('Permission set inserted in permissions object');
        },
        async (ctx) => {
          // #6: Create random private MD
          ctx.privMd = await ctx.app.mutableData.newRandomPrivate(ctx.typeTag);
          console.log('New random private MD created');
        },
        async (ctx) => {
          // #7: Commit private MD with permissions for app's pub sign key
          await ctx.privMd.put(ctx.mdPerms, safeApp.CONSTANTS.USER_ANYONE);
          console.log('Private MD committed to the network');
        },
        async (ctx) => {
          // #8: List MD keys
          const mdKeys = await ctx.privMd.getKeys();
          console.log('Private MD list keys retrieved:', mdKeys);
        },
        async (ctx) => {
          // #9: Serialise private MD committed to the network
          ctx.serialisedMd = await ctx.privMd.serialise();
          console.log('Private MD serialised');
        },
        async (ctx) => {
          // #10: Get app's own containers
          const ownContName = await ctx.app.getOwnContainerName();
          console.log('App\'s own container name:', ownContName);
          ctx.ownCont = await ctx.app.auth.getContainer(ownContName);
          console.log('App\'s own container retrieved');
        },
        async (ctx) => {
          // #11: Encrypt key in app's own container
          ctx.entryKey = await ctx.ownCont.encryptKey(ctx.hash);
          console.log('Entry key encrypted');
        },
        async (ctx) => {
          // #12: Put serialised private MD into a Json and encrypt it
          // as value in app's own container
          const obj = {
            iterationId: ctx.iterationId,
            serialisedMd: ctx.serialisedMd
          };
          ctx.entryValue = await ctx.ownCont.encryptValue(JSON.stringify(obj));
          console.log('Entry value encrypted');
        },
        async (ctx) => {
          // #13: Create new mutations object
          ctx.mdMut = await ctx.app.mutableData.newMutation();
          console.log('New mutation object created');
        },
        async (ctx) => {
          // #14: Insert encrypted key and value into the mutations object
          await ctx.mdMut.insert(ctx.entryKey, ctx.entryValue);
          console.log('Mutation inserted in mutation object');
        },
        async (ctx) => {
          // #15: Apply mutations to app's own contianer
          await ctx.ownCont.applyEntriesMutation(ctx.mdMut);
          console.log('Mutation applied to MD');
        },
        async (ctx) => {
          // #16: Create an ImmutableData with random content
          const testString = `test-${Math.random()}`;
          const idWriter = await ctx.app.immutableData.create();
          await idWriter.write(testString);
          const cipherOpt = await ctx.app.cipherOpt.newPlainText();
          ctx.idAddr = await idWriter.close(cipherOpt);
          console.log('ImmutableData with random content created');
        },
        async (ctx) => {
          // #17: Store ImmutableData address in a random private MD
          const privMd = await ctx.app.mutableData.newRandomPrivate(ctx.typeTag);
          await privMd.quickSetup({ idAddr: ctx.idAddr });
          console.log('ImmutableData address stored a random private MD');
        },
      ]

      // Default number of steps is 246 as it's the maximum number of steps that
      // can be executed before running out of credit with mock routing and
      // with current set of steps.
      const numOfIterations = process.argv[2] || 246;
      console.log("Number of iterations:", numOfIterations);

      const numOfSteps = process.argv[3] || steps.length;
      console.log("Number of steps to run per iteration:", numOfSteps);

      console.log();
      console.log('Soak testing');
      console.log('************');

      let app = await safeApp.fromAuthURI(APP.info, registeredUri);
      console.log("Application Initialised and Logged in successfully");

      for (i = 1; i <= numOfIterations; i++) {
        console.log(`****** Start of iteration #${i} ******`);

        let context = {
          app,
          iterationId: 'iteration_' + Math.random(),
          typeTag: 15001
        };

        for (s = 0; s < numOfSteps; s++) {
          await steps[s](context);
        }

        console.log(`****** End of iteration #${i} (${numOfSteps} steps executed) ******`);
      }
	} catch(e) {
		console.log("Execution failed", e);
	}
  console.log("Itrations finished");
	EXIT_CONDITION = true;
};

run();

waitUntil(() => EXIT_CONDITION === true, 500, () => {});

const safeApp = require('@maidsafe/safe-node-app');

let EXIT_CONDITION = false;

let run = async () => {
	const APP = {
        info: {
            id: 'net.safe.imd.demo.app',
            name: 'safe-api-tutorial',
            vendor: 'MaidSafe.net Ltd'
        },
        permissions: {}
    };

    const APP_2 = {
        info: {
            id: 'net.safe.imd2.demo.app',
            name: 'safe-api-tutorial-test',
            vendor: 'MaidSafe.net Ltd'
        },
        permissions: {}
    };

    try {
        
        //----------- Immutable Data with Asymmetric CypherOpt ------------------//

        console.log();
        console.log('Immutable Data with Asymmetric CipherOpt');
        console.log('****************************************');

        // AppA and AppB initialised and logged in (This is for testing purpose. Need to set NODE_ENV=dev to use this function)
        let appA = await safeApp.initializeApp(APP.info);
        let appB = await safeApp.initializeApp(APP_2.info);
        await appA.auth.loginForTest(APP.permissions);
        await appB.auth.loginForTest(APP_2.permissions);
        console.log('App initialisation and login successful');

        // Create a new Immutable data interface, Writer Obtained
        let writer = await appA.immutableData.create();
        console.log('New immutable data created and obtained the writer');

        // Append the given data to Immutatble Data
        await writer.write("Hello world");
        console.log('Given text "Hello World" wrote successfully to the immutable data');

        // Get Asymmetric public encryption key
        let key = await appB.crypto.getAppPubEncKey();
        let encKey = await appA.crypto.pubEncKeyKeyFromRaw(await key.getRaw());
        console.log("Asymmetric Encryption Key obtained");

        // Create an Asymmetric CipherOpt with generated encryption key
        let asym = await appA.cipherOpt.newAsymmetric(encKey);
        console.log("Asymmetric CipherOpt created");

        // Close and write the data to the network, returns the address to the data
        let address = await writer.close(asym);
        console.log("Data saved to the network");

        // AppB looks up an immutable data for the given address from AppA
        let reader = await appB.immutableData.fetch(address);
        console.log("Reader obtained by AppB");

        let size = await reader.size();
        console.log("Length of the data:", size);

        let data = await reader.read();
        console.log('The immutable data written to the network:', data.toString());
        
	} catch(e) {
		console.log("Execution failed", e);
	}
	EXIT_CONDITION = true;
};

run()

const wait = () => {
   if (!EXIT_CONDITION)
        setTimeout(wait, 1000);
};
wait();
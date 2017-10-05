const safeApp = require('@maidsafe/safe-node-app');

let EXIT_CONDITION = false;

let run = async () => {
	const APP = {
        info: {
            id: 'net.safe.imd.demo.app',
            name: 'safe-api-tutorial',
            vendor: 'MaidSafe.net'
        },
        permissions: {}
    };

    try {
        
        //----------- Immutable Data with Plain CypherOpt ------------------//

        console.log();
        console.log('Immutable Data with Plain CipherOpt');
        console.log('***********************************');

        // App1 initialised and logged in (This is for testing purpose. Need to set NODE_ENV=dev to use this function)
        let app = await safeApp.initializeApp(APP.info);
        await app.auth.loginForTest(APP.permissions);
        console.log('App initialisation and login successful');

        // Create a new Immutable data interface, Writer Obtained
        let writer = await app.immutableData.create();
        console.log('New immutable data created and obtained the writer');

        // Append the given data to Immutatble Data
        await writer.write("Hello World");
        console.log('Given text "Hello World" wrote successfully to the immutable data');
        
        // CipherOpt is Plain and can be read by anyone who has the address of the DataMap.
        let plain = await app.cipherOpt.newPlainText();
        console.log('Plain CipherOpt created successfully');

        // Data saved to the network and returns the address of the data (XorName)
        let address = await writer.close(plain);

        // Look up an existing Immutable Data for the given address, Reader Obtained
        let reader = await app.immutableData.fetch(address);
        console.log('Fetched immutable data for the given address and obtained the reader');

        // Returns the size of an Immutable data
        let size = await reader.size();
        console.log('Length of the data:', size);

        // Reads the data from the network
        let data = await reader.read();
        console.log('Reads the data from the network:', data.toString());
        
	} catch(e) {
		console.log("Execution failed", e);
	}
	EXIT_CONDITION = true;
};

run()

function wait () {
   if (!EXIT_CONDITION)
        setTimeout(wait, 1000);
};
wait();
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
        
        //----------- Immutable Data with Symmetric CypherOpt ------------------//

        console.log();
        console.log('Immutable Data with Symmetric CipherOpt');
        console.log('***************************************');

        // App1 initialised and logged in (This is for testing purpose. Need to set NODE_ENV=dev to use this function)
        let app = await safeApp.initializeApp(APP.info);
        await app.auth.loginForTest(APP.permissions); 
        console.log('App initialisation and login successful');

        // Create a new Immutable data interface, Writer Obtained
        let writer = await app.immutableData.create(); 

        // Append the given data to Immutatble Data
        await writer.write("Hello World"); 
        console.log('Given text "Hello World" wrote successfully to the immutable data');

        // Create a symmetric cipher
        let sym = await app.cipherOpt.newSymmetric();
        console.log('Symmetric CipherOpt created successfully');

        // Close and write the data to the network, returns the address to the data
        let address = await writer.close(sym); 

        //Look up an immutable data for the given address
        let reader = await app.immutableData.fetch(address); 
        console.log('Fetched immutable data for the given address and obtained the reader');

        // returns size of the immutable data on the network
        let size = await reader.size(); 
        console.log('Size of the immutable data:', size);

        // Read the given amount of bytes from the network
        let data = await reader.read(size);
        console.log('The immutable data written to the network:', data.toString());
        
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
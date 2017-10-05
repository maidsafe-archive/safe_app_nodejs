const safeApp = require('@maidsafe/safe-node-app');

let EXIT_CONDITION = false;

let run = async () => {
	const APP = {
        info: {
            id: 'net.safe.md.demo.app',
            name: 'safe-api-tutorial',
            vendor: 'MaidSafe.net'
        },
        permissions: {}
    };

    /* typeTag should be greater than 15000, since typetags upto 15000 are reserved. */
    const typeTag = 15001;
    const data = { key : 'Safe World' };

    try {
        console.log();
        console.log('Mutable Data with Public Access');
        console.log('*********************************');

        //----------------Initialise and Authorise App----------------------//

        // App has been created and initialised
        let app = await safeApp.initializeApp(APP.info) 

        // Used for testing purpose; this function is only available if run in NODE_ENV=dev
        await app.auth.loginForTest(APP.permissions); 
        console.log("Application Initialised and Logged in successfully");

        const OPEN_MODE = {
            OVERWRITE: 1,
            APPEND: 2,
            READ: 4
        }

        const READ_MODE = {
            FILE_READ_FROM_BEGIN: 0,
            FILE_READ_TO_END: 0
        }

        
        //----------------Create Mutable Data with Public Access---------------------------//

        // Mutable data created at random address with public access
        let mData = await app.mutableData.newRandomPublic(typeTag); 
        
        // Setup MD with the app having full access permission easily
        await mData.quickSetup(data); 
        console.log('Quick Setup Completed');


        //----------------- Create and Read files using NFS -------------------------------//

        // Returns NFS Handle, which allows to use NFS functions
        let nfs = await mData.emulateAs('NFS'); 

        // Creates and Saves the file to the network
        let file = await nfs.create('Hello Safe World'); 
        console.log("New file is created and saved to the network successfully");

        // Insert the file to mutable data and commits to the network
        await nfs.insert('hello.txt', file); 

        // Find the file of the given filename or from the path
        file = await nfs.fetch('hello.txt');

        /* Opens the file for reading or writing 
         * Open file modes: 
         * 1: OPEN_MODE.OVERWRITE - Replaces the entire content of the file when writing data
         * 2: OPEN_MODE.APPEND - Appends to the existing data in the file
         * 4: OPEN_MODE.READ - Open file to read
        */
        let opened = await nfs.open(file, OPEN_MODE.READ);

        /* Reads the file content 
         * Read modes:
         * READ_MODE.FILE_READ_FROM_BEGIN - refers position of the content - starts reading from the position specified, 0 means read from the beginning
         * READ_MODE.FILE_READ_TO_END - refers length of the content - reads the content till the length specified, 0 means read till the end
         */
        let content = await opened.read(READ_MODE.FILE_READ_FROM_BEGIN, READ_MODE.FILE_READ_TO_END); 
        console.log("The file has been opened and read");

        // Prints: Hello Safe World
        console.log('The content of the file which has been read:', content.toString());

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
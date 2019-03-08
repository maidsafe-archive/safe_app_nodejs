const safeApp = require('@maidsafe/safe-node-app');
const { waitUntil } = require('wait');

let EXIT_CONDITION = false;

const run = async () => {
	const APP = {
        info: {
            id: 'net.safe.md.demo.app',
            name: 'safe-api-tutorial',
            vendor: 'MaidSafe.net Ltd'
        },
        permissions: {}
    };

    /* typeTag should be greater than 15000, since typetags upto 15000 are reserved. */
    const typeTag = 15001;
    const data = { key : 'Safe World' };

    try {
        console.log();
        console.log('Mutable Data with Private Access');
        console.log('*********************************');

        //----------------Initialise and Authorise App----------------------//

        // App has been created and initialised
        let app = await safeApp.initialiseApp(APP.info);

        // Used for testing purpose; this function is only available if run in NODE_ENV=dev
        await app.auth.loginForTest(APP.permissions);
        console.log("Application Initialised and Logged in successfully");


        //----------------Create Mutable Data with Private Access---------------------------//

        // Mutable data created at random address with private access
        let mData = await app.mutableData.newRandomPrivate(typeTag);

        // Setup MD with the app having full access permission easily
        await mData.quickSetup(data);
        console.log('Quick Setup Completed');


        //----------------Insert New Mutable Data Entry-------------------------------------//

        console.log();
        console.log('***** Insert new mutable data entries *****');
        console.log();

        //Creates a new EntryMutationTransaction object, which allows to insert multiple entries
        let m = await app.mutableData.newMutation();

        await m.insert('English', 'Hello');
        await m.insert('French', 'Bonjure');
        await m.insert('Spanish', 'Hola');

        //Commit the Insert transaction to the network (Saves the changes to the network)
        await mData.applyEntriesMutation(m);

        console.log('New MD entries are inserted and saved to the network successfully')

        let entries = await mData.getEntries();
        let entriesList = await entries.listEntries();

        console.log('----------------------------');
        console.log('List of Inserted MD Entries');
        console.log('----------------------------');

        entriesList.forEach((entry) => {
            let key = entry.key.toString();
            let value = entry.value.buf.toString();

            // Shows the list of entries inserted
            console.log(key + ': ' + value);
        });
        console.log('----------------------------');
        console.log('Iteration Completed. Value "Hello" retrieved for key "English" ');


        //-----------------Update a Mutable Data Entry-------------------------------------//

        console.log();
        console.log('***** Update existing mutable data entries *****');
        console.log();

        let version = await mData.getVersion();

        m = await app.mutableData.newMutation();

        await m.update('Spanish', 'Hola Mundo', version+1);
        await m.update('English', 'Hello World', version+1);
        await m.update('French', 'Bonjure Monde', version+1);

        //Saves the changes to the network
        await mData.applyEntriesMutation(m);

        console.log('Existing MD entries are updated and saved to the network successfully');

        entries = await mData.getEntries();
        entriesList = await entries.listEntries();

        console.log('--------------------------');
        console.log('List of Updated MD Entries');
        console.log('--------------------------');

        entriesList.forEach((entry) => {
          let key = entry.key.toString();
          let value = entry.value.buf.toString();

          // Shows the list of entries
          console.log(key + ': ' + value);
        });
        console.log('--------------------------');
        console.log('Iteration Completed. Value "Hello" of the key "English" updated to "Hello World" ');


        //---------------- Encrypt and Decrypt the entry key/value --------------------------//

        console.log();
        console.log('***** Encrypt and Decrypt the entry key/value *****');
        console.log();

        /* Encrypts the entry key provided as a parameter in Private MD. If the mutable data is Public,
         * the same value (unencrypted) is returned */
        let encrData = await mData.encryptKey(data.key);
        console.log('The encrypted entry value: ', encrData.toString('hex'));

        /* Decrypts the encrypted entry key/value provided as a parameter in Private MD.*/
        let decrData = await mData.decrypt(encrData);
        console.log('The decrypted value: ', decrData.toString());
        console.log('---------------------------');

        //-----------------Serialise and Deserialise the mutable data----------------------//

        console.log();
        console.log('***** Serialise and Deserialise the Mutable Data *****');
        console.log();

        /* Serialise the Mutable Data */
        let serial = await mData.serialise();

        /* Encode serialised mutable data to hexadecimal characters. */
        console.log('The serialised Mutable Data in hexadecimal characters: ', serial.toString('hex'));

        /* Deserialise the serialised Mutable Data */
        let deserial = await app.mutableData.fromSerial(serial);
        let value = await deserial.get('Spanish');

        // Prints the value of the key "Spanish": Hola Mundo
        console.log('The deserialised Mutable Data entry value of key "Spanish": ', value.buf.toString());

        entries = await deserial.getEntries();
        entriesList = await entries.listEntries();

        console.log('--------------------------------');
        console.log('List of Deserialised MD Entries');
        console.log('--------------------------------');

        entriesList.forEach((entry) => {
          let key = entry.key.toString();
          let value = entry.value.buf.toString();

          // Shows the list of entries deserialised
          console.log(key + ': ' + value);
        });
        console.log('--------------------------------');

	} catch(e) {
		console.log("Execution failed", e);
	}
	EXIT_CONDITION = true;
};

run();

waitUntil(() => EXIT_CONDITION === true, 1000, () => {});

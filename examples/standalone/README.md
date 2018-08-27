# Standalone API Examples Using Mock Routing

The examples make use of mock routing and testing feature `loginForTest` to demonstrate the API usage.

`loginForTest` function will create a client without sending autorisation request to the Authenticator and allows to run these samples as Standalone code.

In production code, it would be a necessity to authenticate with the authenticator and get the URI for connecting to the SAFE Network on user's behalf. Example code for authenticator authorisation can be reffered from the [documentation example snippet](http://docs.maidsafe.net/safe_app_nodejs/#initializeapp). After the URI is obtained, [fromAuthURI](http://docs.maidsafe.net/safe_app_nodejs/#fromauthuri) function can be used to connect to the network.

Obtaining the URI from authenticator is skipped and these examples are intended to demonstrate the API usage.

## Prerequisite

NodeJs version 7.10 or above. [node-gyp](https://github.com/nodejs/node-gyp) must be [installed](https://github.com/nodejs/node-gyp#installation).


## Building the example

The [safe_app_node](https://www.npmjs.com/package/@maidsafe/safe-node-app) is installed in `dev` mode for using the Mock Network with the testing features enabled.

Run `npm install` and this command will install the dependencies in `dev` mode.

## Running the example

It is recomended to read the [Getting started](https://forum.safedev.org/t/safe-network-api-getting-started-draft/726) introduction for understanding the Data Types and default containers.

### idata_plain

Demonstrates the ImmutableData API for writing data in the SAFE Network and to read the same from the SAFE Network using plain cipher opt. The data stored is plain and can be read by anyone who has the address of the DataMap.

Execute `npm run idata_plain` for running this example.

### idata_asymmetric

Demonstrates the ImmuatbleData API for writing data in the SAFE Network and encrypting/decrypting the DataMap with Asymmetric Cipher opt. 

Execute `npm run idata_asymmetric` for running this example.

### idata_symmetric

Demonstrates the ImmuatbleData API for writing data in the SAFE Network and encrypting/decrypting the DataMap with Symmetric Cipher opt. 

Execute `npm run idata_symmetric` for running this example.

### mdata_private

Demonstrates the MutableData API for creating and updating a private MutableData. Also showcases Serialise and Deserialise APIs for MutableData.  

Execute `npm run mdata_private` for running this example.

### mdata_public

Demonstrates the MutableData API for creating and updating public MutableData. Emulate the MutableData as NFS for Inserting the file to mutable data, Reading the content from the file using NFS API.

Execute `npm run mdata_public` for running this example.

## License

This SAFE Network library is dual-licensed under the Modified BSD ([LICENSE-BSD](LICENSE-BSD) https://opensource.org/licenses/BSD-3-Clause) or the MIT license ([LICENSE-MIT](LICENSE-MIT) https://opensource.org/licenses/MIT) at your option.

## Contribution

Copyrights in the SAFE Network are retained by their contributors. No copyright assignment is required to contribute to this project.

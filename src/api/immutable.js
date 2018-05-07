// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms.
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const helpers = require('../helpers');
const lib = require('../native/lib');

/**
* Holds the connection to read an existing ImmutableData
*/
class Reader extends helpers.NetworkObject {

  /**
  * Read the given amount of bytes from the network
  * @param {Object=} options
  * @param {Number} [options.offset=0] start position
  * @param {Number} [options.end=size] end position or end of data
  */
  read(options) {
    const opts = Object.assign({}, options);
    let prms;
    if (opts.end) {
      prms = Promise.resolve(opts.end);
    } else {
      prms = this.size();
    }

    return prms.then((end) =>
      lib.idata_read_from_self_encryptor(this.app.connection,
                                         this.ref,
                                         opts.offset || 0,
                                         end));
  }

  /**
  * The size of the immutable data on the network
  * @returns {Promise<Number>} length in bytes
  */
  size() {
    return lib.idata_size(this.app.connection, this.ref);
  }

  /**
  * @private
  * free the reference of reader of the app on the native side
  * used by the autoref feature
  * @param {SAFEApp} app - the app the reference belongs to
  * @param {handle} ref - the reference to free
  */
  static free(app, ref) {
    lib.idata_self_encryptor_reader_free(app.connection, ref);
  }

}

/**
* Holds an Immutable Data Writer
*
* @example // write new data to the network
* app.immutableData.create()
*  .then((writer) => writer.write("some string\n")
*    .then(() => writer.write("second string"))
*    .then(() => app.cipherOpt.newPlainText())
*    .then((cipher) => writer.close(cipher))
*  ).then((address) => app.immutableData.fetch(address))
*  .then((reader) => reader.read())
*  .then((payload) => {
*    console.log("Data read from ImmutableData: ", payload.toString());
*  })
*
*/
class Writer extends helpers.NetworkObject {

  /**
  * Append the given data to immutable Data.
  *
  * @param {String|Buffer} data The string or buffer to write
  * @returns {Promise<()>}
  */
  write(data) {
    return lib.idata_write_to_self_encryptor(this.app.connection, this.ref, data);
  }

  /**
  * Close and write the immutable Data to the network.
  *
  * @param {CipherOpt} cipherOpt the Cipher Opt to encrypt data with
  * @returns {Promise<String>} the address to the data once written to the network
  */
  close(cipherOpt) {
    return lib.idata_close_self_encryptor(this.app.connection,
                                          this.ref,
                                          cipherOpt.ref);
  }

  /**
  * @private
  * free the reference of writer of the app on the native side.
  * used by the autoref feature
  * @param {SAFEApp} app the app the reference belongs to
  * @param {handle} ref the reference to free
  */
  static free(app, ref) {
    lib.idata_self_encryptor_writer_free(app.connection, ref);
  }

}

/**
* Interact with Immutable Data of the Network through this Interface.
*
* Access it through your {SAFEApp} instance under `app.immutableData`
*/
class ImmutableDataInterface {

  /**
  * @private
  * @param {SAFEApp} app
  */
  constructor(app) {
    this.app = app;
  }

  /**
  * Create a new ImmutableDataInterface
  * @returns {Promise<Writer>}
  */
  create() {
    return lib.idata_new_self_encryptor(this.app.connection)
      .then((ref) => helpers.autoref(new Writer(this.app, ref)));
  }

  /**
  * Look up an existing Immutable Data for the given address
  * @param {Buffer} address the XorName on the network
  * @returns {Promise<Reader>}
  */
  fetch(address) {
    return lib.idata_fetch_self_encryptor(this.app.connection, address)
      .then((ref) => helpers.autoref(new Reader(this.app, ref)));
  }
}

module.exports = ImmutableDataInterface;

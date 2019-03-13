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
const multihash = require('multihashes');
const CID = require('cids');
const consts = require('../consts');
const { EXPOSE_AS_EXPERIMENTAL_API } = require('../helpers');

const genXorUrl = (xorName, mimeType) => {
  const encodedHash = multihash.encode(xorName, consts.CID_HASH_FN);
  const codec = mimeType ? `${consts.CID_MIME_CODEC_PREFIX}${mimeType}` : consts.CID_DEFAULT_CODEC;
  const newCid = new CID(consts.CID_VERSION, codec, encodedHash);
  const cidStr = newCid.toBaseEncodedString(consts.CID_BASE_ENCODING);
  return `safe://${cidStr}`;
};

/**
* {@link ImmutableDataInterface} reader
* @hideconstructor
*/
class Reader extends helpers.NetworkObject {

  /**
   * Read the given amount of bytes from the network
   * @param {Object=} options
   * @param {Number} [options.offset=0] start position
   * @param {Number} [options.end=size] end position or end of data
   * @returns {Promise<Buffer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const readOptions =
   *     {
   *         offset: 0, // starts reading from this byte position
   *         end: null // ends reading at this byte position
   *     };
   *     try {
   *         const iDataReader = await app.immutableData.fetch(iDataAddress)
   *         const data = await iDataReader.read(readOptions)
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
             const size = await iDataReader.size()
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  size() {
    return lib.idata_size(this.app.connection, this.ref);
  }

  /**
   * Get the XOR-URL of the {@link ImmutableDataInterface}.
   *
   * @param {String} mimeType (experimental) the MIME type to encode in
   * the XOR-URL as the codec of the content
   * @returns {String}
   * The XOR-URL of the ImmutableData.
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const cipherOpt = await app.cipherOpt.newPlainText();
   *         const iDataWriter = await app.immutableData.create()
   *         const data = `Most proteins are glycosylated.
   *         Mass spectrometry methods are used for mapping glycoprotein.`;
   *         await iDataWriter.write(data);
   *         const iDataAddress = await iDataWriter.close(cipherOpt);
   *         const idReader = await app.immutableData.fetch(iDataAddress);
   *         const mimeType = 'text/plain';
   *         const xorUrl = idReader.getXorUrl(mimeType);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  getXorUrl(mimeType) {
    const xorName = this.xorName;
    // Let's either generate the XOR-URL, or generate an error if the
    // experimental APIs are not enabled
    /* eslint-disable no-shadow, prefer-arrow-callback */
    return EXPOSE_AS_EXPERIMENTAL_API.call(this.app, function getXorUrl() {
      const address = Buffer.from(xorName);
      return genXorUrl(address, mimeType);
    });
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
 * {@link ImmutableDataInterface} writer
 * @hideconstructor
 */
class Writer extends helpers.NetworkObject {

  /**
   * Append the given data to {@link ImmutableDataInterface}. This does not commit data to network.
   *
   * @param {String|Buffer} data The string or buffer to write
   * @returns {Promise}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const iDataWriter = await app.immutableData.create()
   *         const data = `Most proteins are glycosylated.
   *         Mass spectrometry methods are used for mapping glycoprotein.`;
   *         await iDataWriter.write(data);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  write(data) {
    return lib.idata_write_to_self_encryptor(this.app.connection, this.ref, data);
  }

  /**
   * Close and commit the {@link ImmutableDataInterface} to the network.
   *
   * @param {CipherOpt} cipherOpt The cipher method with which to encrypt data
   * @param {Boolean} getXorUrl (experimental) if the XOR-URL shall also
   * be returned along with the xor address
   * @param {String} mimeType (experimental) the MIME type to encode in
   * the XOR-URL as the codec of the content
   * @returns {Promise<Buffer|{ name: Buffer, xorUrl: String }>}
   * The XOR address to the data once written to the network,
   * or an object that contains both the XOR address and XOR URL.
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const cipherOpt = await app.cipherOpt.newPlainText();
   *         const iDataWriter = await app.immutableData.create()
   *         const data = `Most proteins are glycosylated.
   *         Mass spectrometry methods are used for mapping glycoprotein.`;
   *         await iDataWriter.write(data);
   *         const iDataAddress = await iDataWriter.close(cipherOpt);
   *
   *         // Alternatively:
   *         // const getXorUrl = true;
   *         // const mimeType = 'text/plain';
   *         // const iDataMeta = await iDataWriter.close(cipherOpt, getXorUrl, mimeType);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  async close(cipherOpt, getXorUrl, mimeType) {
    const name = await lib.idata_close_self_encryptor(this.app.connection,
                                                        this.ref, cipherOpt.ref);
    if (!getXorUrl) {
      return name;
    }

    // Let's either generate the XOR-URL, or generate an error if the
    // experimental APIs are not enabled
    /* eslint-disable camelcase, prefer-arrow-callback */
    const xorUrl = EXPOSE_AS_EXPERIMENTAL_API.call(this.app, function XOR_URLs() {
      const address = Buffer.from(name);
      return genXorUrl(address, mimeType);
    });

    return { name, xorUrl };
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

class ImmutableDataInterface {

  /**
  * @hideconstructor
  * @param {SAFEApp} app
  */
  constructor(app) {
    this.app = app;
  }

  /**
   * Create a new {@link ImmutableDataInterface} writer
   * @returns {Promise<Writer>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const iDataWriter = await app.immutableData.create()
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  create() {
    return lib.idata_new_self_encryptor(this.app.connection)
      .then((ref) => helpers.autoref(new Writer(this.app, ref)));
  }

  /**
   * Look up an existing {@link ImmutableDataInterface} for the given address
   * @param {Buffer} Network XOR address
   * @returns {Promise<Reader>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const iDataReader = await app.immutableData.fetch(iDataAddress);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  fetch(address) {
    return lib.idata_fetch_self_encryptor(this.app.connection, address)
      .then((ref) => {
        const readerObj = new Reader(this.app, ref);
        readerObj.xorName = address;
        return helpers.autoref(readerObj);
      });
  }
}

module.exports = ImmutableDataInterface;

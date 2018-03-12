const consts = require('./consts');
const errConst = require('./error_const');
const makeError = require('./native/_error.js');
const { parse: parseUrl } = require('url');
const mime = require('mime');
const nodePath = require('path');

/**
* @typedef {Object} WebFetchOptions
* holds additional options for the `webFetch` function.
* @param {Object} range range of bytes to be retrieved.
* The `start` attribute is expected to be the start offset, while the
* `end` attribute of the `range` object the end position (both inclusive)
* to be retrieved, e.g. with `range: { start: 2, end: 3 }` the 3rd
* and 4th bytes of data will be retrieved.
* If `end` is not specified, the bytes retrived will be from the `start` offset
* untill the end of the file.
* The ranges values are also used to populate the `Content-Range` and
* `Content-Length` headers in the response.
*/

/**
* Helper to lookup a given `safe://`-url in accordance with the
* convention and find the requested object.
*
* @param {String} url the url you want to fetch
* @param {WebFetchOptions} [options=null] additional options
* @returns {Promise<Object>} the object with body of content and headers
*/
async function webFetch(url, options) {
  if (!url) return Promise.reject(makeError(errConst.MISSING_URL.code, errConst.MISSING_URL.msg));

  const parsedUrl = parseUrl(url);
  if (!parsedUrl) {
    return Promise.reject(makeError(errConst.MISSING_URL.code, errConst.MISSING_URL.msg));
  }
  const hostname = parsedUrl.hostname;
  let path = parsedUrl.pathname ? decodeURI(parsedUrl.pathname) : '';
  const tokens = path.split('/');
  if (!tokens[tokens.length - 1] && tokens.length > 1) {
    tokens.pop();
    tokens.push(consts.INDEX_HTML);
  }

  path = tokens.join('/') || `/${consts.INDEX_HTML}`;

  // lets' unpack
  const hostParts = hostname.split('.');
  const lookupName = hostParts.pop(); // last one is 'domain'
  const serviceName = hostParts.join('.') || 'www'; // all others are 'service'

  return new Promise(async (resolve, reject) => {
    const getServiceInfo = async (pubName, servName) => {
      try {
        const address = await this.crypto.sha3Hash(pubName);
        const servicesContainer = await this.mutableData.newPublic(address, consts.TAG_TYPE_DNS);
        return await servicesContainer.get(servName);
      } catch (err) {
        if (err.code === errConst.ERR_NO_SUCH_DATA.code ||
            err.code === errConst.ERR_NO_SUCH_ENTRY.code) {
          const error = {};
          error.code = err.code;
          error.message = `Requested ${err.code === errConst.ERR_NO_SUCH_DATA.code ? 'public name' : 'service'} is not found`;
          throw makeError(error.code, error.message);
        }
        throw err;
      }
    };

    const handleNfsFetchException = (error) => {
      if (error.code !== errConst.ERR_FILE_NOT_FOUND.code) {
        throw error;
      }
    };

    try {
      const serviceInfo = await getServiceInfo(lookupName, serviceName);
      if (serviceInfo.buf.length === 0) {
        const error = {};
        error.code = errConst.ERR_NO_SUCH_ENTRY.code;
        error.message = `Service not found. ${errConst.ERR_NO_SUCH_ENTRY.msg}`;
        return reject(makeError(error.code, error.message));
      }
      let serviceMd;
      try {
        serviceMd = await this.mutableData.fromSerial(serviceInfo.buf);
      } catch (e) {
        serviceMd = await this.mutableData.newPublic(serviceInfo.buf, consts.TAG_TYPE_WWW);
      }
      const emulation = await serviceMd.emulateAs('NFS');
      let file;
      let filePath;
      try {
        filePath = path;
        file = await emulation.fetch(filePath);
      } catch (e) {
        handleNfsFetchException(e);
      }
      if (!file && path.startsWith('/')) {
        try {
          filePath = path.replace('/', '');
          file = await emulation.fetch(filePath);
        } catch (e) {
          handleNfsFetchException(e);
        }
      }
      if (!file && path.split('/').length > 1) {
        try {
          filePath = `${path}/${consts.INDEX_HTML}`;
          file = await emulation.fetch(filePath);
        } catch (e) {
          handleNfsFetchException(e);
        }
      }
      if (!file) {
        filePath = `${path}/${consts.INDEX_HTML}`.replace('/', '');
        file = await emulation.fetch(filePath);
      }
      const openedFile = await emulation.open(file, consts.pubConsts.NFS_FILE_MODE_READ);
      let range;
      let start = consts.pubConsts.NFS_FILE_START;
      let end;
      let fileSize;
      let lengthToRead = consts.pubConsts.NFS_FILE_END;
      let endByte;

      // TODO: how do we handle multipart Reqs
      if (options && options.range && typeof options.range.start !== 'undefined') {
        range = options.range;
        start = range.start;
        fileSize = await openedFile.size();
        end = range.end || fileSize - 1;

        lengthToRead = (end - start) + 1; // account for 0 index
      }
      const data = await openedFile.read(start, lengthToRead);
      const mimeType = mime.getType(nodePath.extname(filePath)) || 'application/octet-stream';

      const response = {
        headers: {
          'Content-Type': mimeType
        },
        body: data
      };

      if (range) {
        endByte = (end === fileSize) ? fileSize - 1 : end;
        response.headers['Content-Range'] = `bytes ${start}-${endByte}/${fileSize}`;
        response.headers['Content-Length'] = lengthToRead;
      }

      resolve(response);
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = webFetch;

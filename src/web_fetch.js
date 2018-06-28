const consts = require('./consts');
const errConst = require('./error_const');
const makeError = require('./native/_error.js');
const { parse: parseUrl } = require('url');
const mime = require('mime');
const nodePath = require('path');

// Helper function to fetch the Container
// treating the public ID container as an RDF
async function readPublicIdAsRdf(servicesContainer, pubName, servName) {
  let serviceMd;
  try {
    const graphId = `safe://${servName}.${pubName}`;
    console.log('Looking up graph ID:', graphId);
    const rdfEmulation = await servicesContainer.emulateAs('rdf');
    await rdfEmulation.nowOrWhenFetched([graphId]);
    const SAFETERMS = rdfEmulation.namespace('http://safenetwork.org/safevocab/');
    let match = rdfEmulation.statementsMatching(rdfEmulation.sym(graphId), SAFETERMS('xorName'), undefined);
    const xorName = match[0].object.value.split(',');
    match = rdfEmulation.statementsMatching(rdfEmulation.sym(graphId), SAFETERMS('typeTag'), undefined);
    const typeTag = match[0].object.value;
    serviceMd = await this.mutableData.newPublic(xorName, parseInt(typeTag));
  } catch (err) {
    const error = {};
    error.code = err.code;
    error.message = 'Requested service is not found';
    throw makeError(error.code, error.message);
  }

  return { serviceMd, type: 'RDF' };
}

// Helper function to fetch the Container
// from a public ID and service name provided
async function getContainerFromPublicId(pubName, servName) {
  let servicesContainer,
    serviceInfo;
  try {
    const address = await this.crypto.sha3Hash(pubName);
    servicesContainer = await this.mutableData.newPublic(address, consts.TAG_TYPE_DNS);
    serviceInfo = await servicesContainer.get(servName || 'www'); // default it to www
  } catch (err) {
    if (err.code === errConst.ERR_NO_SUCH_DATA.code) {
      const error = {};
      error.code = err.code;
      error.message = 'Requested public name is not found';
      throw makeError(error.code, error.message);
    } else if (err.code === errConst.ERR_NO_SUCH_ENTRY.code) {
      // Let's then try to read it as an RDF container
      return readPublicIdAsRdf.call(this, servicesContainer, pubName, servName);
    }
    throw err;
  }

  if (serviceInfo.buf.length === 0) {
    const error = {};
    error.code = errConst.ERR_NO_SUCH_ENTRY.code;
    error.message = `Service not found. ${errConst.ERR_NO_SUCH_ENTRY.msg}`;
    throw makeError(error.code, error.message);
  }

  let serviceMd;
  try {
    serviceMd = await this.mutableData.fromSerial(serviceInfo.buf);
  } catch (e) {
    serviceMd = await this.mutableData.newPublic(serviceInfo.buf, consts.TAG_TYPE_WWW);
  }

  return { serviceMd, type: 'NFS' };
}

// Helper function to try different paths to find and
// fetch the index file from a web site container
const tryDifferentPaths = async (fetchFn, initialPath) => {
  const handleNfsFetchException = (error) => {
    if (error.code !== errConst.ERR_FILE_NOT_FOUND.code) {
      throw error;
    }
  };

  let file;
  let filePath;
  try {
    filePath = initialPath;
    file = await fetchFn(filePath);
  } catch (e) {
    handleNfsFetchException(e);
  }
  if (!file && initialPath.startsWith('/')) {
    try {
      filePath = initialPath.replace('/', '');
      file = await fetchFn(filePath);
    } catch (e) {
      handleNfsFetchException(e);
    }
  }
  if (!file && initialPath.split('/').length > 1) {
    try {
      filePath = `${initialPath}/${consts.INDEX_HTML}`;
      file = await fetchFn(filePath);
    } catch (e) {
      handleNfsFetchException(e);
    }
  }
  if (!file) {
    filePath = `${initialPath}/${consts.INDEX_HTML}`.replace('/', '');
    file = await fetchFn(filePath);
  }

  const mimeType = mime.getType(nodePath.extname(filePath));
  return { file, mimeType };
};

// Helper function to read the file's content, and return an
// http compliant response based on the mime-type and options provided
const readContentFromFile = async (openedFile, defaultMimeType, opts) => {
  let mimeType = defaultMimeType;
  if (!mimeType) {
    mimeType = 'application/octet-stream';
  }
  let range;
  let start = consts.pubConsts.NFS_FILE_START;
  let end;
  let fileSize;
  let lengthToRead = consts.pubConsts.NFS_FILE_END;
  let endByte;
  let data;
  let multipart;

  if (opts && opts.range) {
    fileSize = await openedFile.size();
    range = opts.range;
    const rangeIsArray = Array.isArray(range);
    multipart = rangeIsArray && range.length > 1;
    start = range.start || consts.pubConsts.NFS_FILE_START;
    end = range.end || fileSize - 1;
    if (rangeIsArray && range.length === 1) {
      start = range[0].start || consts.pubConsts.NFS_FILE_START;
      end = range[0].end || fileSize - 1;
    }
    lengthToRead = (end - start) + 1; // account for 0 index
  }

  if (opts && opts.range && multipart) {
    // handle the multipart range requests
    data = await Promise.all(range.map(async (part) => {
      const partStart = part.start || consts.pubConsts.NFS_FILE_START;
      const partEnd = part.end || fileSize - 1;
      const partLengthToRead = (partEnd - partStart) + 1; // account for 0 index
      const byteSegment = await openedFile.read(partStart, partLengthToRead);
      return {
        body: byteSegment,
        headers: {
          'Content-Type': mimeType,
          'Content-Range': `bytes ${partStart}-${partEnd}/${fileSize}`
        }
      };
    }));
  } else {
    // handles non-partial requests and also single partial content requests
    data = await openedFile.read(start, lengthToRead);
  }

  if (multipart) {
    mimeType = 'multipart/byteranges';
  }

  const response = {
    headers: {
      'Content-Type': mimeType
    },
    body: data
  };

  if (range && multipart) {
    response.headers['Content-Length'] = JSON.stringify(data).length;
    delete response.body;
    response.parts = data;
  } else if (range) {
    endByte = (end === fileSize - 1) ? fileSize - 1 : end;
    response.headers['Content-Length'] = lengthToRead;
    response.headers['Content-Range'] = `bytes ${start}-${endByte}/${fileSize}`;
  }
  return response;
};

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
  const publicName = hostParts.pop(); // last one is 'domain'
  const serviceName = hostParts.join('.'); // all others are 'service'

  return new Promise(async (resolve, reject) => {
    try {
      // Let's try to find the container and read
      // its content using the helpers functions
      const { serviceMd, type } = await getContainerFromPublicId.call(this, publicName, serviceName);
      if (type === 'RDF') {
        const emulation = await serviceMd.emulateAs('RDF');
        await emulation.nowOrWhenFetched();

        // TODO: support qvalue in the Accept header with multile mime types and weights
        const mimeType = (options && options.accept) ? options.accept : 'text/turtle';

        const serialisedRdf = await emulation.serialise(mimeType);
        const response = {
          headers: {
            'Content-Type': mimeType,
            //'Accept-Post': 'text/turtle, application/ld+json, application/rdf+xml, application/nquads'
          },
          body: serialisedRdf
        };
        resolve(response);
      } else {
        const emulation = await serviceMd.emulateAs('NFS');
        const { file, mimeType } = await tryDifferentPaths(emulation.fetch.bind(emulation), path);
        const openedFile = await emulation.open(file, consts.pubConsts.NFS_FILE_MODE_READ);
        const data = await readContentFromFile(openedFile, mimeType, options);
        resolve(data);
      }
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  webFetch,
  getContainerFromPublicId,
  tryDifferentPaths,
  readContentFromFile
};

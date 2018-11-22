const consts = require('./consts');
const errConst = require('./error_const');
const makeError = require('./native/_error.js');
const { parse: parseUrl } = require('url');
const mime = require('mime');
const nodePath = require('path');
const multihash = require('multihashes');
const CID = require('cids');
const { EXPOSE_AS_EXPERIMENTAL_API,
        ONLY_IF_EXPERIMENTAL_API_ENABLED, escapeHtmlEntities } = require('./helpers');

const MIME_TYPE_BYTERANGES = 'multipart/byteranges';
const MIME_TYPE_OCTET_STREAM = 'application/octet-stream';
const MIME_TYPE_HTML = 'text/html';
const HEADERS_CONTENT_TYPE = 'Content-Type';
const HEADERS_CONTENT_LENGTH = 'Content-Length';
const HEADERS_CONTENT_RANGE = 'Content-Range';
const DATA_TYPE_MD = 'MD';
const DATA_TYPE_IMMD = 'IMMD';
const DATA_TYPE_NFS = 'NFS';
const DATA_TYPE_RDF = 'RDF';

// Helper function to fetch the Container
// treating the public ID container as an RDF
async function readPublicIdAsRdf(subNamesContainer, pubName, subName) {
  let serviceMd;
  try {
    const graphId = `safe://${subName}.${pubName}`;
    const rdfEmulation = await subNamesContainer.emulateAs('rdf');
    await rdfEmulation.nowOrWhenFetched([graphId]);
    const SAFETERMS = rdfEmulation.namespace('http://safenetwork.org/safevocab/');
    let match = rdfEmulation.statementsMatching(rdfEmulation.sym(graphId), SAFETERMS('xorName'), undefined);
    const xorName = match[0].object.value.split(',');
    match = rdfEmulation.statementsMatching(rdfEmulation.sym(graphId), SAFETERMS('typeTag'), undefined);
    const typeTag = match[0].object.value;
    serviceMd = await this.mutableData.newPublic(xorName, parseInt(typeTag, 10));
  } catch (err) {
    // there is no matching subName name
    throw makeError(errConst.ERR_SERVICE_NOT_FOUND.code, errConst.ERR_SERVICE_NOT_FOUND.msg);
  }

  return { serviceMd, type: DATA_TYPE_RDF };
}

// Helper function to fetch the Container
// from a public ID and service name provided
async function getContainerFromPublicId(pubName, subName) {
  let serviceInfo;
  let subNamesContainer;
  try {
    const address = await this.crypto.sha3Hash(pubName);
    subNamesContainer = await this.mutableData.newPublic(address, consts.TAG_TYPE_DNS);
    serviceInfo = await subNamesContainer.get(subName || 'www'); // default it to www
  } catch (err) {
    switch (err.code) {
      case errConst.ERR_NO_SUCH_DATA.code:
        // there is no container stored at the location
        throw makeError(errConst.ERR_CONTENT_NOT_FOUND.code, errConst.ERR_CONTENT_NOT_FOUND.msg);
      case errConst.ERR_NO_SUCH_ENTRY.code:
        // Let's then try to read it as an RDF container
        return readPublicIdAsRdf.call(this, subNamesContainer, pubName, subName);
      default:
        throw err;
    }
  }

  if (serviceInfo.buf.length === 0) {
    // the matching service name was soft-deleted
    throw makeError(errConst.ERR_SERVICE_NOT_FOUND.code, errConst.ERR_SERVICE_NOT_FOUND.msg);
  }

  let serviceMd;
  try {
    serviceMd = await this.mutableData.fromSerial(serviceInfo.buf);
  } catch (e) {
    serviceMd = await this.mutableData.newPublic(serviceInfo.buf, consts.TAG_TYPE_WWW);
  }

  return { serviceMd, type: DATA_TYPE_NFS };
}

// Helper function to try different paths to find and
// fetch the index file from a web site container
const tryDifferentPaths = async (fetchFn, initialPath) => {
  const handleNfsFetchException = (error) => {
    // only if it's an unexpected error throw it
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
    try {
      filePath = `${initialPath}/${consts.INDEX_HTML}`.replace('/', '');
      file = await fetchFn(filePath);
    } catch (error) {
      if (error.code !== errConst.ERR_FILE_NOT_FOUND.code) {
        throw error;
      }
      throw makeError(error.code, errConst.ERR_FILE_NOT_FOUND.msg);
    }
  }

  const mimeType = mime.getType(nodePath.extname(filePath));
  return { file, mimeType };
};

// Helper function to read the file's content, and return an
// http compliant response based on the mime-type and options provided
const readContentFromFile = async (openedFile, defaultMimeType, opts) => {
  let mimeType = defaultMimeType;
  if (!mimeType) {
    mimeType = MIME_TYPE_OCTET_STREAM;
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
          [HEADERS_CONTENT_TYPE]: mimeType,
          [HEADERS_CONTENT_RANGE]: `bytes ${partStart}-${partEnd}/${fileSize}`
        }
      };
    }));
  } else {
    // handles non-partial requests and also single partial content requests
    data = await openedFile.read(start, lengthToRead);
  }

  if (multipart) {
    mimeType = MIME_TYPE_BYTERANGES;
  }

  const response = {
    headers: {
      [HEADERS_CONTENT_TYPE]: mimeType
    },
    body: data
  };

  if (range && multipart) {
    response.headers[HEADERS_CONTENT_LENGTH] = JSON.stringify(data).length;
    delete response.body;
    response.parts = data;
  } else if (range) {
    endByte = (end === fileSize - 1) ? fileSize - 1 : end;
    response.headers[HEADERS_CONTENT_LENGTH] = lengthToRead;
    response.headers[HEADERS_CONTENT_RANGE] = `bytes ${start}-${endByte}/${fileSize}`;
  }
  return response;
};

// Helper function to fetch the Container/content from a CID
async function getContainerFromCid(cidString, typeTag) {
  let content;
  let type;
  let codec;
  try {
    const cid = new CID(cidString);
    const encodedHash = multihash.decode(cid.multihash);
    const address = encodedHash.digest;
    codec = cid.codec.replace(consts.CID_MIME_CODEC_PREFIX, '');
    if (codec === consts.CID_DEFAULT_CODEC) {
      codec = consts.MIME_TYPE_OCTET_STREAM;
    }
    if (typeTag) {
      // it's supposed to be a MutableData
      content = await this.mutableData.newPublic(address, typeTag);
      await content.getEntries();
      type = DATA_TYPE_MD;
    } else {
      // then it's supposed to be an ImmutableData
      content = await this.immutableData.fetch(address);
      type = DATA_TYPE_IMMD;
    }
  } catch (err) {
    // only if it was looking up specifically for a MD thru a CID
    // we report it as failing to find content
    if (typeTag) {
      throw makeError(errConst.ERR_CONTENT_NOT_FOUND.code, errConst.ERR_CONTENT_NOT_FOUND.msg);
    }
    // it's not a valid CID then
    throw err;
  }
  return { content, type, codec };
}

// Helper function which is able to fetch a resource from the network
// using a URL. It parses the URL and calls the subName/publicName resolver helper
// (it can also call other type of resolvers like XOR-URL resolver in the future),
// returning the network object that it's found with the applied URL resolution,
// along with the type of the resolved network object and the path that was
// parsed out from the URL.
async function fetchHelper(url) {
  if (!url) return Promise.reject(makeError(errConst.MISSING_URL.code, errConst.MISSING_URL.msg));

  const parsedUrl = parseUrl(url);

  if (!parsedUrl.protocol) return Promise.reject(makeError(errConst.INVALID_URL.code, `${errConst.INVALID_URL.msg}, complete with protocol.`));

  const hostParts = parsedUrl.hostname.split('.');
  const publicName = hostParts.pop(); // last one is 'publicName'
  const subName = hostParts.join('.'); // all others are the 'subName'

  // let's decompose and normalise the path
  const originalPath = (parsedUrl.pathname === '/') ? '' : parsedUrl.pathname;
  const parsedPath = originalPath ? decodeURI(originalPath) : '';

  try {
    const resource = await ONLY_IF_EXPERIMENTAL_API_ENABLED.call(this, async () => {
      if (subName.length === 0) {
        // this could be a XOR-URL, let's try to
        // decode the publicName part as a CID
        const content = await getContainerFromCid.call(this, publicName,
                                                        parseInt(parsedUrl.port, 10));

        const resourceType = (content.type === DATA_TYPE_MD) ? DATA_TYPE_NFS : content.type;

        return {
          content: content.content,
          resourceType,
          parsedPath,
          mimeType: content.codec
        };
      }
    });
    if (resource) return resource;
  } catch (err) {
    if (err.code === errConst.ERR_CONTENT_NOT_FOUND.code) {
      // it was meant to be found as a CID but content wasn't found,
      // so let's throw the error
      throw (err);
    }
    // then just fallback to public name lookup
  }

  // Let's then try to find the container by a public name lookup,
  // and read its content using the helpers functions
  const md = await getContainerFromPublicId.call(this, publicName, subName);
  return {
    content: md.serviceMd,
    resourceType: md.type,
    parsedPath
  };
}

// helper function to generate an HTML based MutableData visualiser and explorer
async function genMDExplorerHtml(url, md) {
  const entries = await md.getEntries();
  const entriesList = await entries.listEntries();
  let tbody = '';
   // TODO: confirm this will be ok for any type of data stored in MD entries,
  // e.g. binary data or different charset encodings, etc.
  entriesList.forEach((entry) => {
    const key = escapeHtmlEntities(entry.key.toString());
    const version = entry.value.version;
    let value;
    if (entry.value.buf.length > 0) {
      value = escapeHtmlEntities(entry.value.buf.toString());
    } else {
      value = '<i>-- entry deleted --</i>';
    }
    tbody += `
      <tr>
        <td class="detailsColumn">${key}</td>
        <td class="detailsColumn">${version}</td>
        <td class="detailsColumn">${value}</td>
      </tr>`;
  });
  const perms = await md.getPermissions();
  const permsSetList = await perms.listPermissionSets();
  const getPermsInfo = permsSetList.map((perm) => perm.signKey.getRaw()
      .then((raw) => ({ permSet: perm.permSet, signKey: raw.buffer.toString('hex') }))
  );
  const permsList = await Promise.all(getPermsInfo);
  let tperms = '';
   /* eslint-disable dot-notation */
  permsList.forEach((perm) => {
    tperms += `
      <tr>
        <td class="detailsColumn">
          <input type="checkbox" disabled ${perm.permSet['Read'] ? 'checked' : ''}>Read
          <input type="checkbox" disabled ${perm.permSet['Insert'] ? 'checked' : ''}>Insert<br/>
          <input type="checkbox" disabled ${perm.permSet['Update'] ? 'checked' : ''}>Update
          <input type="checkbox" disabled ${perm.permSet['Delete'] ? 'checked' : ''}>Delete<br/>
          <input type="checkbox" disabled ${perm.permSet['ManagePermissions'] ? 'checked' : ''}>Manage Permissions
        </td>
        <td class="detailsColumn">0x${perm.signKey}</td>
      </tr>`;
  });
  /* eslint-enable dot-notation */
  const htmlPage = `
    <html>
      <head>
        <title>MutableData at ${url}</title>
        <style>
          h2 {
            border-bottom: 1px solid #c0c0c0;
            margin-bottom: 10px;
            padding-bottom: 10px;
            white-space: nowrap;
          }
           tr:nth-child(odd) {
              background-color: #dddddd;
          }
           td.detailsColumn {
            -webkit-padding-start: 1em;
            -webkit-padding-end: 1em;
            white-space: nowrap;
          }
           td {
            padding-right: 5px;
          }
        </style>
      </head>
      <body>
        <h2>MutableData at ${url}</h2>
        <h3>Entries:</h3>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Version</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${tbody}
          </tbody>
        </table>
        <h3>Permissions:</h3>
        <table>
          <thead>
            <tr>
              <th>Permissions Set</th>
              <th>Sign Key</th>
            </tr>
          </thead>
          <tbody>
            ${tperms}
          </tbody>
        </table>
      </body>
    </html>`;
  return htmlPage;
}

/**
* @typedef {Object} NetworkResource
* holds information about a network resource fetched from a `safe://`-URL
* @param {Object} content the network resource object
* @param {Object} resourceType the type of the resource fetched, e.g. 'NFS'
* @param {Object} parsedPath the parsed path from the provided URL
*/

/**
* @private
* Helper experipental function to lookup a given `safe://`-URL in accordance with the
* public name resolution and find the requested network resource.
*
* @param {String} url the url you want to fetch
* @returns {Promise<NetworkResource>} the network resource found from the passed URL
*/
async function fetch(url) {
  /* eslint-disable no-shadow, prefer-arrow-callback */
  return EXPOSE_AS_EXPERIMENTAL_API.call(this, async function fetch() {
    return fetchHelper.call(this, url);
  });
}

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
* @private
* Helper function to lookup a given `safe://`-URL in accordance with the
* public name resolution and find the requested network resource.
*
* @param {String} url the url you want to fetch
* @param {WebFetchOptions} [options=null] additional options
* @returns {Promise<Object>} the object with body of content and headers
*/
async function webFetch(url, options) {
  const { content, resourceType, parsedPath, mimeType } = await fetchHelper.call(this, url);
  if (resourceType === DATA_TYPE_RDF) {
    const emulation = content.emulateAs(resourceType);
    await emulation.nowOrWhenFetched();

    // TODO: support qvalue in the Accept header with multile mime types and weights
    const reqMimeType = (options && options.accept) ? options.accept : 'text/turtle';

    const serialisedRdf = await emulation.serialise(reqMimeType);
    const response = {
      headers: {
        [HEADERS_CONTENT_TYPE]: reqMimeType,
        //'Accept-Post': 'text/turtle, application/ld+json, application/rdf+xml, application/nquads'
      },
      body: serialisedRdf
    };
    return response;
  } else if (resourceType === DATA_TYPE_IMMD) {
    const data = await readContentFromFile(content, mimeType, options);
    return data;
  }

  // then it's expected to be an NFS container
  const tokens = parsedPath.split('/');
  if (!tokens[tokens.length - 1] && tokens.length > 1) {
    tokens.pop();
    tokens.push(consts.INDEX_HTML);
  }
  const path = tokens.join('/') || `/${consts.INDEX_HTML}`;
  try {
    const emulation = content.emulateAs(resourceType);
    const { file, mimeType: fileMimeType } = await
                            tryDifferentPaths(emulation.fetch.bind(emulation), path);
    const openedFile = await emulation.open(file, consts.pubConsts.NFS_FILE_MODE_READ);
    const data = await readContentFromFile(openedFile, fileMimeType, options);
    return data;
  } catch (err) {
    if (parsedPath) {
      // it was meant to fetch a path so throw the error
      throw (err);
    }

    // We couldn't read it with NFS emulation, and there was no path,
    // if experimental apis are enabled let's generate a MD viewer
    const mdViewer = await ONLY_IF_EXPERIMENTAL_API_ENABLED.call(this, async () => {
      // we couldn't read it as an NFS Container, it's a simple MD,
      // then let's return it as an html page to see the entries, follow links...
      const body = await genMDExplorerHtml(url, content);
      return {
        headers: {
          [HEADERS_CONTENT_TYPE]: MIME_TYPE_HTML
        },
        body
      };
    });

    // ok, that's a shame, let's just return the error then
    if (!mdViewer) throw err;

    return mdViewer;
  }
}

module.exports = {
  fetch,
  webFetch,
  getContainerFromPublicId,
  tryDifferentPaths,
  readContentFromFile
};

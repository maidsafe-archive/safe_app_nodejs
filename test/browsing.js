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


const should = require('should');
const h = require('./helpers');
const consts = require('../src/consts');
const errConst = require('../src/error_const');
const {
  getContainerFromPublicId,
  tryDifferentPaths,
  readContentFromFile
} = require('../src/web_fetch.js');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;
const createUnregisteredTestApp = h.createUnregisteredTestApp;

const createRandomDomain = async (content, path, service, authedApp) => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = authedApp || await createAuthenticatedTestApp();
  return app.mutableData.newRandomPublic(consts.TAG_TYPE_WWW)
    .then((serviceMdata) => serviceMdata.quickSetup()
      .then(() => {
        const nfs = serviceMdata.emulateAs('NFS');
        // let's write the file
        return nfs.create(content)
          .then((file) => nfs.insert(path || '/index.html', file))
          .then(() => app.crypto.sha3Hash(domain)
            .then((dnsName) => app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS)
              .then((dnsData) => serviceMdata.getNameAndTag()
                  .then((res) => {
                    const payload = {};
                    payload[service || 'www'] = res.name;
                    return dnsData.quickSetup(payload);
                  }))));
      }))
    .then(() => domain);
};


const createRandomPrivateServiceDomain = async (content, path, service, authedApp) => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = authedApp || await createAuthenticatedTestApp();
  return app.mutableData.newRandomPrivate(consts.TAG_TYPE_WWW)
    .then((serviceMdata) => serviceMdata.quickSetup()
      .then(() => {
        const nfs = serviceMdata.emulateAs('NFS');
        // let's write the file
        return nfs.create(content)
          .then((file) => nfs.insert(path || '', file))
          .then(() => app.crypto.sha3Hash(domain)
            .then((dnsName) => app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS))
              .then((dnsData) => serviceMdata.serialise()
                  .then((serial) => {
                    const payload = {};
                    payload[service || ''] = serial;
                    return dnsData.quickSetup(payload);
                  })));
      }))
    .then(() => domain);
};

/**
 * Delete Service
 * @param publicName
 * @param serviceName
 */
const deleteService = (app, domain, service) => app.crypto.sha3Hash(domain)
    .then((hashedPubName) => app.mutableData.newPublic(hashedPubName, consts.TAG_TYPE_DNS))
    .then((md) => removeFromMData(md, service));

const removeFromMData = (md, key) => md.getEntries()
    .then((entries) => entries.get(key)
      .then((value) => entries.mutate()
        .then((mut) => mut.delete(key, value.version + 1)
          .then(() => md.applyEntriesMutation(mut))
        )));

const containersPermissions = { _public: ['Read', 'Insert'], _publicNames: ['Read', 'Insert', 'ManagePermissions'] };

describe('Browsing', () => {
  let app;
  let unregisteredApp;
  before(async () => {
    app = await createAuthenticatedTestApp('_test_scope', containersPermissions);
    unregisteredApp = await createUnregisteredTestApp();
  });

  it('fetch existing WebID', async () => {
    const TYPE_TAG = 15639;
    const profile = {
      uri: 'safe://mywebid.gabriel',
      name: 'Gabriel Viganotti',
      nickname: 'bochaco',
      website: 'safe://mywebsite.gabriel',
      avatar: 'safe://mywebsite.gabriel/images/myavatar',
    };

    xorname = h.createRandomXorName();
    md = await app.mutableData.newPublic(xorname, TYPE_TAG);
    await md.quickSetup({});
    const webId = await md.emulateAs('WebID');
    await webId.create(profile);

    // let's fetch it now
    // const options = { Accept: 'text/turtle' }
    const options = { accept: 'application/ld+json' };
    // const options = { accept: 'application/rdf+xml' }
    const turtleWebId = await unregisteredApp.webFetch(profile.uri, options);
    console.log('FETCHED WebID:', turtleWebId);
  });

  it('returns rejected promise if no url is provided', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', '', app)
      .then(() => should(unregisteredApp.webFetch()).be.rejectedWith(errConst.MISSING_URL.msg));
  });

  it('fetch content', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('fetch empty content', () => {
    const content = '';
    return createRandomDomain(content, 'emptyfile.txt', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/emptyfile.txt`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('fetches file with non-explicit mime type', async () => {
    const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
    const domain = await createRandomDomain(content, '/streaming', null, app);
    const response = await unregisteredApp.webFetch(`safe://${domain}/streaming`);
    return should(response.headers['Content-Type']).be.equal('application/octet-stream');
  });

  it('fetch any path on any url', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/any/path/html', 'whatever', app)
        .then((domain) => unregisteredApp.webFetch(`safe://whatever.${domain}/any/path/html`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('find any service fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/yumyum.html', 'whatever.valid_service', app)
        .then((domain) => unregisteredApp.webFetch(`safe://whatever.valid_service.${domain}/yumyum.html`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('find private service', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomPrivateServiceDomain(content, '/yumyum.html', 'www', app)
        .then((domain) => unregisteredApp.webFetch(`safe://www.${domain}/yumyum.html`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('find missing slash fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, 'test.html', 'whatever.valid_service', app)
        .then((domain) => unregisteredApp.webFetch(`safe://whatever.valid_service.${domain}/test.html`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('fetch index.html fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('fetch www fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', 'www', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('fetch index.html on www fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', 'www', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('subdirectory fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/subdir/index.html', 'www', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/subdir/`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('empty subdirectory fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, 'index.html', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('/my.folder/index.html', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/my.folder/index.html', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/my.folder/index.html`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('/index.html', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/index.html`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('/my.folder/', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/my.folder/index.html', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/my.folder/`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('/path/my.file', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/path/my.file', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/path/my.file`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('trailing slash after domain', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', 'www', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  it('url encoded filename', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/spa ce.ht"ml', '', app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/spa ce.ht"ml`)
          .then((data) => should(data.body.toString()).equal(content)));
  });

  describe('WebFetch partial content', () => {
    it('fetch partial content', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const startByte = 3;
      const endByte = 9;
      const exptedReturn = 'lo worl';

      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`,
                  { range: { start: startByte, end: endByte } })
          .then((data) => {
            should.not.exist(data.parts);
            should(data.body.toString()).equal(exptedReturn);
            should(data.body.toString()).equal(
                        content.substring(startByte, endByte + 1));
            should(data.headers['Content-Range']).equal(`bytes ${startByte}-${endByte}/${content.length}`);
            return should(data.headers['Content-Length']).equal(exptedReturn.length);
          }));
    });

    it('fetches partial content starting at 0', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const exptedReturn = 'hello wo';
      const endByte = 7;
      const startByte = 0;

      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`,
                  { range: { start: startByte, end: endByte } })
          .then((data) => {
            should.not.exist(data.parts);
            should(data.body.toString()).equal(exptedReturn);
            should(data.body.toString()).equal(
                        content.substring(startByte, endByte + 1));
            should(data.headers['Content-Range']).equal(`bytes ${startByte}-${endByte}/${content.length}`);
            return should(data.headers['Content-Length']).equal(exptedReturn.length);
          }));
    });

    it('fetch full length with range', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const numberOfBytes = content.length - 1;
      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: 0, end: numberOfBytes } })
          .then((data) => {
            should.not.exist(data.parts);
            should(data.body.toString()).equal(content);
            should(data.headers['Content-Range']).equal(`bytes 0-${numberOfBytes}/${content.length}`);
            return should(data.headers['Content-Length']).equal(content.length);
          }));
    });

    it('with range option as array composed of single object, requesting complete file', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const numberOfBytes = content.length - 1;
      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range: [{ start: 0, end: numberOfBytes }] })
          .then((data) => {
            should.not.exist(data.parts);
            should(data.body.toString()).equal(content);
            should(data.headers['Content-Range']).equal(`bytes 0-${numberOfBytes}/${content.length}`);
            return should(data.headers['Content-Length']).equal(content.length);
          }));
    });

    it('with range option as array composed of single object', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const range = [{ start: 3, end: 12 }];
      return createRandomDomain(content, '/streaming.mp4', null, app)
          .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range })
            .then((data) => {
              should.not.exist(data.parts);
              should(data.body.toString()).equal(content.substring(3, 13));
              should(data.headers['Content-Range']).equal(`bytes 3-12/${content.length}`);
              return should(data.headers['Content-Length']).equal((range[0].end - range[0].start) + 1);
            }));
    });

    it('with range option as array composed of single object, with start but no ending byte', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const range = [{ start: 6 }];
      return createRandomDomain(content, '/streaming.mp4', null, app)
          .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range })
            .then((data) => {
              should.not.exist(data.parts);
              should(data.body.toString()).equal(content.substring(6, content.length + 1));
              should(data.headers['Content-Range']).equal(`bytes 6-${content.length - 1}/${content.length}`);
              return should(data.headers['Content-Length']).equal(content.length - range[0].start);
            }));
    });

    it('without range end param', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const startByte = 4;
      const numberOfBytes = content.length - 1;

      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: startByte } })
          .then((data) => {
            should.not.exist(data.parts);
            should(data.body.toString()).equal(content.substring(startByte));
            should(data.headers['Content-Range']).equal(`bytes ${startByte}-${numberOfBytes}/${content.length}`);
            return should(data.headers['Content-Length']).equal(content.length - startByte);
          }));
    });

    it('without range start param', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const endByte = 4;

      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range: { end: endByte } })
          .then((data) => {
            should.not.exist(data.parts);
            should(data.body.toString()).equal(content.substring(0, endByte + 1));
            should(data.headers['Content-Range']).equal(`bytes ${0}-${endByte}/${content.length}`);
            return should(data.headers['Content-Length']).equal(endByte + 1);
          }));
    });

    it('range end beyond data length', async () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming.mp4', null, app);
      return should(unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: 0, end: content.length } }))
        .be.rejectedWith(errConst.INVALID_BYTE_RANGE.msg);
    });

    // safe_app lib is not validating for invalid start offset
    it.skip('range start beyond data length', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => should(unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: 1000 } }))
          .be.rejectedWith('NFS error: Invalid byte range specified'));
    }); // ;

    // safe_app lib is not making validating for invalid start offset
    it.skip('negative range start param', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      return createRandomDomain(content, '/streaming.mp4', null, app)
        .then((domain) => should(unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: -1 } }))
          .be.rejectedWith('Invalid range start value'));
    }); // ;

    it('fetches multipart ranges', async () => {
      const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming.mp4', null, app);
      const range = [
        { start: 2, end: 4 },
        { start: 7, end: 9 },
        { start: 13, end: 17 }
      ];
      const data = await unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range });
      should.not.exist(data.body);
      should(data).have.property('parts');
      should(data.parts[0].body.toString()).be.equal(content.slice(2, 5));
      should(data.parts[1].body.toString()).be.equal(content.slice(7, 10));
      return should(data.parts[2].body.toString()).be.equal(content.slice(13, 18));
    });

    it('returns separate multipart headers for Content-Range', async () => {
      const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming.mp4', null, app);
      const range = [
        { start: 2, end: 4 },
        { start: 7, end: 9 },
        { start: 13, end: 17 }
      ];
      const data = await unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range });
      should.not.exist(data.body);
      should(data.headers['Content-Type']).be.equal('multipart/byteranges');
      should(data.parts[0].headers['Content-Range']).be.equal(`bytes 2-4/${content.length}`);
      should(data.parts[1].headers['Content-Range']).be.equal(`bytes 7-9/${content.length}`);
      return should(data.parts[2].headers['Content-Range']).be.equal(`bytes 13-17/${content.length}`);
    });

    it('fetches multipart ranges for file without explicit mime types', async () => {
      const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming', null, app);
      const range = [
        { start: 2, end: 4 },
        { start: 7, end: 9 },
        { start: 13, end: 17 }
      ];
      const data = await unregisteredApp.webFetch(`safe://${domain}/streaming`, { range });
      should.not.exist(data.body);
      should(data).have.property('parts');
      should(data.headers['Content-Type']).be.equal('multipart/byteranges');
      return data.parts.map((part) => should(part.headers['Content-Type']).be.equal('application/octet-stream'));
    });

    it('throws error for invalid multipart range', async () => {
      const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming.mp4', null, app);
      const range = [
        { start: 7, end: 50 }
      ];
      return should(unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range }))
        .be.rejectedWith(errConst.INVALID_BYTE_RANGE.msg);
    });

    it('multipart ranges: offset byte without byte length', async () => {
      const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming.mp4', null, app);
      const range = [
        { start: 2, end: 4 },
        { start: 7, end: 9 },
        { start: 13 }
      ];
      const data = await unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range });
      should.not.exist(data.body);
      should(data.parts[2].body.toString()).be.equal(content.slice(13, content.length + 1));
      return should(data.parts[2].headers['Content-Range']).be.equal(`bytes 13-${content.length - 1}/${content.length}`);
    });

    it('fetches multipart ranges for file with explicit mime types', async () => {
      const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming.mp4', null, app);
      const range = [
        { start: 2, end: 4 },
        { start: 7, end: 9 },
        { start: 13 }
      ];
      const data = await unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range });
      should.not.exist(data.body);
      return data.parts.map((part) => should(part.headers['Content-Type']).be.equal('video/mp4'));
    });

    it('multipart ranges: byte length provided with no starting byte position', async () => {
      const content = `hello world, lorem ipsum on ${Math.round(Math.random() * 100000)}`;
      const domain = await createRandomDomain(content, '/streaming.mp4', null, app);
      const range = [
        { start: 2, end: 4 },
        { start: 7, end: 9 },
        { end: 20 }
      ];
      const data = await unregisteredApp.webFetch(`safe://${domain}/streaming.mp4`, { range });
      should.not.exist(data.body);
      should(data.parts[2].body.toString()).be.equal(content.slice(0, 21));
      return should(data.parts[2].headers['Content-Range']).be.equal(`bytes 0-20/${content.length}`);
    });
  });

  describe('errors', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    let domain; // eslint-disable-line no-unused-vars
    let client;
    before(() => createRandomDomain(content, '/subdir/index.html', 'www', app)
      .then((testDomain) => {
        domain = testDomain;
      }).then(() => { client = unregisteredApp; }));

    it('should throw error when a previously existing service is removed', async () => {
      const deletedService = 'nonexistant';
      let testDomain;
      return createRandomDomain(content, '', deletedService, app)
          .then((returnedDomain) => {
            testDomain = returnedDomain;
            return deleteService(app, testDomain, deletedService);
          })
          .then(() => should(unregisteredApp.webFetch(`safe://${deletedService}.${testDomain}`))
            .be.rejectedWith('Service not found. Entry does not exist.'));
    });

    it('should not find dns', () => should(client.webFetch('safe://domain_doesnt_exist'))
      .be.rejectedWith('Requested public name is not found'));

    it('should be case sensitive', () => should(client.webFetch(`safe://${domain}/SUBDIR/index.html`))
      .be.rejectedWith('NFS error: File not found')
        .then((err) => should(err.code).be.equal(-301))
    );

    it('should not find service', () => should(client.webFetch(`safe://faulty_service.${domain}`))
      .be.rejectedWith('Requested service is not found'));

    it('should not find file', () => should(client.webFetch(`safe://www.${domain}/404.html`))
      .be.rejectedWith('NFS error: File not found')
        .then((err) => should(err.code).be.equal(-301))
    );

    it('should not find file in subdirectory', () => should(client.webFetch(`safe://www.${domain}/subdir/404.html`))
      .be.rejectedWith('NFS error: File not found')
        .then((err) => should(err.code).be.equal(-301))
    );

    it('wrong path', () => createRandomDomain(content, '/my.file', '', app)
      .then((newdomain) => should(unregisteredApp.webFetch(`safe://${newdomain}/my.file/`))
        .be.rejectedWith('NFS error: File not found')
      ));

    it('wrong deeper path', () => createRandomDomain(content, '/my.file/my.other.file', '', app)
      .then((newdomain) => should(unregisteredApp.webFetch(`safe://${newdomain}/my.file/my.other.file/`))
        .be.rejectedWith('NFS error: File not found')
      ));
  });

  describe('webFetch helper functions', () => {
    let content;
    let domain;
    before(async () => {
      content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      domain = await createRandomDomain(content, '', '', app);
    });
    describe('getContainerFromPublicId', () => {
      it('returns MutableData interface service', async () => {
        const { serviceMd: md } = await getContainerFromPublicId.call(app, domain);
        return should.exist(md.getNameAndTag);
      });

      it('rejects with error for non-existent public ID', async () => should(getContainerFromPublicId.call(app, 'publicID')).be.rejectedWith('Requested public name is not found'));

      it('rejects with error for non-existent service', async () => should(getContainerFromPublicId.call(app, domain, 'serviceName')).be.rejectedWith('Requested service is not found'));
    });

    describe('tryDifferentPaths', () => {
      it('returns file and mime type as object', async () => {
        const { serviceMd: md } = await getContainerFromPublicId.call(app, domain);
        const emulation = await md.emulateAs('NFS');
        const { file, mimeType } = await tryDifferentPaths(emulation.fetch.bind(emulation), `/${consts.INDEX_HTML}`);
        should(mimeType).be.equal('text/html');
        return should.exist(file.size);
      });

      it('rejects with error if first argument is not a function', async () => should(tryDifferentPaths('not a function', '/')).be.rejectedWith('fetchFn is not a function'));

      it('rejects with error if second argument is not passed', async () => should(tryDifferentPaths(() => {})).be.rejectedWith('Cannot read property \'startsWith\' of undefined'));
    });

    describe('readContentFromFile', () => {
      it('returns file contents as HTTP compliant response', async () => {
        const { serviceMd: md } = await getContainerFromPublicId.call(app, domain);
        const emulation = await md.emulateAs('NFS');
        const { file, mimeType } = await tryDifferentPaths(emulation.fetch.bind(emulation), `/${consts.INDEX_HTML}`);
        const openedFile = await emulation.open(file, consts.pubConsts.NFS_FILE_MODE_READ);
        const { headers, body } = await readContentFromFile(openedFile, mimeType);
        should.exist(headers);
        should.exist(headers['Content-Type']);
        return should.exist(body);
      });

      it('returns file content range as HTTP compliant response', async () => {
        const { serviceMd: md } = await getContainerFromPublicId.call(app, domain);
        const emulation = await md.emulateAs('NFS');
        const { file, mimeType } = await tryDifferentPaths(emulation.fetch.bind(emulation), `/${consts.INDEX_HTML}`);
        const openedFile = await emulation.open(file, consts.pubConsts.NFS_FILE_MODE_READ);
        const { headers, body } = await readContentFromFile(openedFile, mimeType, { range: { start: 3, end: 12 } }); // eslint-disable-line max-len
        should.exist(headers['Content-Range']);
        should.exist(headers['Content-Length']);
        return should(body.toString()).be.equal(content.slice(3, 13));
      });

      it('returns file content multipart range as HTTP compliant response', async () => {
        const { serviceMd: md } = await getContainerFromPublicId.call(app, domain);
        const emulation = await md.emulateAs('NFS');
        const { file, mimeType } = await tryDifferentPaths(emulation.fetch.bind(emulation), `/${consts.INDEX_HTML}`);
        const openedFile = await emulation.open(file, consts.pubConsts.NFS_FILE_MODE_READ);
        const { headers, parts } = await readContentFromFile(openedFile, mimeType, { range: [{ start: 3, end: 6 }, { start: 8, end: 14 }] }); // eslint-disable-line max-len
        should.exist(headers['Content-Type']);
        should(headers['Content-Type']).be.equal('multipart/byteranges');
        should.exist(parts);
        return should(parts.length).be.equal(2);
      });

      it('requires opened file as first argument', async () => {
        const { serviceMd: md } = await getContainerFromPublicId.call(app, domain);
        const emulation = await md.emulateAs('NFS');
        const { file } = await tryDifferentPaths(emulation.fetch.bind(emulation), `/${consts.INDEX_HTML}`);
        return should(readContentFromFile(file)).be.rejectedWith('File not found.');
      });
    });
  });
});

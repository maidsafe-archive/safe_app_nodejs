const should = require('should');
const h = require('./helpers');
const consts = require('../src/consts');

const createAnonTestApp = h.createAnonTestApp;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

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


const createRandomPrivateServiceDomain = async (content, path, service) => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = await createAuthenticatedTestApp();
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
        .then((mut) => mut.remove(key, value.version + 1)
          .then(() => md.applyEntriesMutation(mut))
        )));

describe('Browsing', () => {
  it('returns rejected promise if no url is provided', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', '')
      .then(() => createAnonTestApp()
        .then((app) => {
          should(app.webFetch()).be.rejected();
        }
      ));
  }).timeout(20000);

  it('fetch content', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('fetch empty content', () => {
    const content = '';
    return createRandomDomain(content, 'emptyfile.txt', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/emptyfile.txt`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('fetch any path on any url', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/any/path/html', 'whatever')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://whatever.${domain}/any/path/html`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('find any service fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/yumyum.html', 'whatever.valid_service')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://whatever.valid_service.${domain}/yumyum.html`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('find private service', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomPrivateServiceDomain(content, '/yumyum.html', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://www.${domain}/yumyum.html`)
          .then((data) => should(data.body.toString()).equal(content))));
  }).timeout(20000);

  it('find missing slash fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, 'test.html', 'whatever.valid_service')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://whatever.valid_service.${domain}/test.html`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('fetch index.html fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('fetch www fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('fetch index.html on www fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('subdirectory fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/subdir/index.html', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/subdir/`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('empty subdirectory fallback', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, 'index.html', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((data) => should(data.body.toString()).equal(content))
        ));
  }).timeout(20000);

  it('/my.folder/index.html', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/my.folder/index.html', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/my.folder/index.html`)
          .then((data) => should(data.body.toString()).equal(content))
        ));
  }).timeout(20000);

  it('/index.html', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/index.html`)
          .then((data) => should(data.body.toString()).equal(content))
        ));
  }).timeout(20000);

  it('/my.folder/', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/my.folder/index.html', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/my.folder/`)
          .then((data) => should(data.body.toString()).equal(content))
        ));
  }).timeout(20000);

  it('/path/my.file', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/path/my.file', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/path/my.file`)
          .then((data) => should(data.body.toString()).equal(content))
        ));
  }).timeout(20000);

  it('trailing slash after domain', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  it('url encoded filename', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/spa ce.ht"ml', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/spa ce.ht"ml`)
          .then((data) => should(data.body.toString()).equal(content))
      ));
  }).timeout(20000);

  describe('WebFetch partial content', () => {
    it('fetch partial content', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const startByte = 3;
      const endByte = 9;
      const exptedReturn = 'lo worl';

      return createRandomDomain(content, '/streaming.mp4')
        .then((domain) => createAnonTestApp()
          .then((app) => app.webFetch(`safe://${domain}/streaming.mp4`,
                    { range: { start: startByte, end: endByte } })
            .then((data) => {
              should(data.body.toString()).equal(exptedReturn);
              should(data.body.toString()).equal(
                          content.substring(startByte, endByte + 1));
              should(data.headers['Content-Range']).equal(`bytes ${startByte}-${endByte}/${content.length}`);
              should(data.headers['Content-Length']).equal(exptedReturn.length);
            })
        ));
    }).timeout(20000);

    it('fetches partial content starting at 0', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const exptedReturn = 'hello wo';
      const endByte = 7;
      const startByte = 0;

      return createRandomDomain(content, '/streaming.mp4')
        .then((domain) => createAnonTestApp()
          .then((app) => app.webFetch(`safe://${domain}/streaming.mp4`,
                    { range: { start: startByte, end: endByte } })
            .then((data) => {
              should(data.body.toString()).equal(exptedReturn);
              should(data.body.toString()).equal(
                          content.substring(startByte, endByte + 1));
              should(data.headers['Content-Range']).equal(`bytes ${startByte}-${endByte}/${content.length}`);
              should(data.headers['Content-Length']).equal(exptedReturn.length);
            })
        ));
    }).timeout(20000);

    it('fetch full length with range', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const numberOfBytes = content.length - 1;
      return createRandomDomain(content, '/streaming.mp4')
        .then((domain) => createAnonTestApp()
          .then((app) => app.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: 0, end: numberOfBytes } })
            .then((data) => {
              should(data.body.toString()).equal(content);
              should(data.headers['Content-Range']).equal(`bytes 0-${numberOfBytes}/${content.length}`);
              should(data.headers['Content-Length']).equal(content.length);
            })
        ));
    }).timeout(20000);

    it('without range end param', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      const startByte = 4;
      const numberOfBytes = content.length - 1;

      return createRandomDomain(content, '/streaming.mp4')
        .then((domain) => createAnonTestApp()
          .then((app) => app.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: startByte } })
            .then((data) => {
              should(data.body.toString()).equal(content.substring(startByte));
              should(data.headers['Content-Range']).equal(`bytes ${startByte}-${numberOfBytes}/${content.length}`);
              should(data.headers['Content-Length']).equal(content.length - startByte);
            })
        ));
    }).timeout(20000);

    it('range end beyond data length', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      return createRandomDomain(content, '/streaming.mp4')
        .then((domain) => createAnonTestApp()
          .then((app) => should(app.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: 0, end: content.length } }))
            .be.rejectedWith('NFS error: Invalid byte range specified')
        ));
    }).timeout(20000);

    // safe_app lib is not validating for invalid start offset
    it.skip('range start beyond data length', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      return createRandomDomain(content, '/streaming.mp4')
        .then((domain) => createAnonTestApp()
          .then((app) => should(app.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: 1000 } }))
            .be.rejectedWith('NFS error: Invalid byte range specified')
        ));
    }); // .timeout(20000);

    // safe_app lib is not making validating for invalid start offset
    it.skip('negative range start param', () => {
      const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
      return createRandomDomain(content, '/streaming.mp4')
        .then((domain) => createAnonTestApp()
          .then((app) => should(app.webFetch(`safe://${domain}/streaming.mp4`, { range: { start: -1 } }))
            .be.rejectedWith('Invalid range start value')
        ));
    }); // .timeout(20000);
  });

  describe('errors', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    let domain; // eslint-disable-line no-unused-vars
    let client;
    before(function bfore() {
      this.timeout(20000);
      return createRandomDomain(content, '/subdir/index.html', 'www')
        .then((testDomain) => {
          domain = testDomain;
        }).then(() => {
          createAnonTestApp().then((app) => {
            client = app;
          });
        });
    });

    it('should throw error when a previously existing service is removed', async () => {
      const app = await createAuthenticatedTestApp();
      const deletedService = 'nonexistant';
      let testDomain;
      return createRandomDomain(content, '', deletedService, app)
          .then((returnedDomain) => {
            testDomain = returnedDomain;
            return deleteService(app, testDomain, deletedService);
          })
          .then(() => app.webFetch(`safe://${deletedService}.${testDomain}`)
          .should.be.rejectedWith('Service not found. Entry does not exist.'));
    }).timeout(20000);

    it('should not find dns', () =>
      client.webFetch('safe://domain_doesnt_exist')
        .should.be.rejectedWith('Requested public name is not found')
    );

    it('should be case sensitive', () =>
      client.webFetch(`safe://${domain}/SUBDIR/index.html`)
        .should.be.rejectedWith('NFS error: File not found')
        .then((err) => should(err.code).be.equal(-301))
    );

    it('should not find service', () =>
      client.webFetch(`safe://faulty_service.${domain}`)
        .should.be.rejectedWith('Requested service is not found')
    );

    it('should not find file', () =>
      client.webFetch(`safe://www.${domain}/404.html`)
        .should.be.rejectedWith('NFS error: File not found')
        .then((err) => should(err.code).be.equal(-301))
    );

    it('should not find file in subdirectory', () =>
      client.webFetch(`safe://www.${domain}/subdir/404.html`)
        .should.be.rejectedWith('NFS error: File not found')
        .then((err) => should(err.code).be.equal(-301))
    );

    it('wrong path', () => createRandomDomain(content, '/my.file', '')
      .then((newdomain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${newdomain}/my.file/`)
          .should.be.rejectedWith('NFS error: File not found')
        ))
    ).timeout(20000);

    it('wrong deeper path', () => createRandomDomain(content, '/my.file/my.other.file', '')
      .then((newdomain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${newdomain}/my.file/my.other.file/`)
          .should.be.rejectedWith('NFS error: File not found')
        ))
    ).timeout(20000);
  });
});

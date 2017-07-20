const should = require('should');
const h = require('./helpers');
const consts = require('../src/consts');

const createAnonTestApp = h.createAnonTestApp;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

function createRandomDomain(content, path, service) {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = createAuthenticatedTestApp();
  return app.mutableData.newRandomPublic(consts.TAG_TYPE_WWW)
    .then((serviceMdata) => serviceMdata.quickSetup()
      .then(() => {
        const nfs = serviceMdata.emulateAs('NFS');
        // let's write the file
        return nfs.create(content)
          .then((file) => nfs.insert(path || '', file))
          .then(() => app.crypto.sha3Hash(domain)
            .then((dnsName) => app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS)
              .then((dnsData) => serviceMdata.getNameAndTag()
                  .then((res) => {
                    const payload = {};
                    payload[service || ''] = res.name;
                    return dnsData.quickSetup(payload);
                  }))));
      }))
    .then(() => domain);
}


function createRandomPrivateServiceDomain(content, path, service) {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const app = createAuthenticatedTestApp();
  return app.mutableData.newRandomPrivate(consts.TAG_TYPE_WWW)
    .then((serviceMdata) => serviceMdata.quickSetup()
      .then(() => {
        const nfs = serviceMdata.emulateAs('NFS');
        // let's write the file
        return nfs.create(content)
          .then((file) => nfs.insert(path || '', file))
          .then(() => app.crypto.sha3Hash(domain)
            .then((dnsName) => app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS)
              .then((dnsData) => serviceMdata.serialise()
                  .then((serial) => {
                    const payload = {};
                    payload[service || ''] = serial;
                    return dnsData.quickSetup(payload);
                  }))));
      }))
    .then(() => domain);
}

describe('Browsing', () => {
  it('fetch content', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('fetch any path on any url', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/any/path/html', 'whatever')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://whatever.${domain}/any/path/html`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('find any service fallback', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/yumyum.html', 'whatever.valid_service')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://whatever.valid_service.${domain}/yumyum.html`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('find private service', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomPrivateServiceDomain(content, '/yumyum.html', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://www.${domain}/yumyum.html`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('find missing slash fallback', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, 'test.html', 'whatever.valid_service')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://whatever.valid_service.${domain}/test.html`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('fetch index.html fallback', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('fetch www fallback', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('fetch index.html on www fallback', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/index.html', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('subdirectory fallback', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, '/subdir/index.html', 'www')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}/subdir/`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
      ));
  });

  it('empty subdirectory fallback', function test() {
    this.timeout(20000);
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    return createRandomDomain(content, 'index.html', '')
      .then((domain) => createAnonTestApp()
        .then((app) => app.webFetch(`safe://${domain}`)
          .then((f) => app.immutableData.fetch(f.dataMapName))
          .then((i) => i.read())
          .then((co) => should(co.toString()).equal(content))
        ));
  });

  describe('errors', () => {
    const content = `hello world, on ${Math.round(Math.random() * 100000)}`;
    let domain; // eslint-disable-line no-unused-vars
    let client;
    before(function setup() {
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

    it('should not find dns', () =>
      client.webFetch('safe://$domain_doesnt_exist')
        .should.be.rejectedWith('Core error: Routing client error -> Requested data not found')
    );

    it('should be case sensitive', () =>
      client.webFetch('safe://$domain/SUBDIR/index.html')
        .should.be.rejectedWith('Core error: Routing client error -> Requested data not found')
    );

    it('should not find service', () =>
      client.webFetch('safe://faulty_service.$domain')
        .should.be.rejectedWith('Core error: Routing client error -> Requested data not found')
    );

    it('should not find file', () =>
      client.webFetch('safe://www.$domain/404.html')
        .should.be.rejectedWith('Core error: Routing client error -> Requested data not found')
    );

    it('should not find file in subdirectory', () =>
      client.webFetch('safe://www.$domain/subdir/404.html')
        .should.be.rejectedWith('Core error: Routing client error -> Requested data not found')
    );
  });
});

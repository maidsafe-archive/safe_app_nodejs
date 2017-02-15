const should = require('should');
const h = require('./helpers');
const c = require('crypto');
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
          .then(() => {
            const dnsName = c.createHash('sha256').update(domain).digest();
            return app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS)
              .then((dnsData) => serviceMdata.getNameAndTag()
                  .then((res) => {
                    const payload = {};
                    payload[service || ''] = res.name;
                    return dnsData.quickSetup(payload);
                  }));
          });
      })).then(() => domain);
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
});

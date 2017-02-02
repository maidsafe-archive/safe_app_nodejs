const should = require('should');
const h = require('./helpers');
const c = require('crypto');
const consts = require('../src/consts');

const createAnonTestApp = h.createAnonTestApp;
const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Browsing', () => {
  const domain = `test_${Math.round(Math.random() * 100000)}`;
  const content = `hello world, on ${domain}`;

  before(function setup() {
    this.timeout(5000);
    const app = createAuthenticatedTestApp();
    return app.mutableData.newRandomPublic(consts.TAG_TYPE_WWW)
      .then((serviceMdata) => serviceMdata.quickSetup()
        .then(() => {
          const nfs = serviceMdata.emulateAs('NFS');
          // let's write the file
          return nfs.create(content)
            .then((file) => nfs.insert('', file))
            .then(() => {
              const dnsName = c.createHash('sha256').update(domain).digest();
              return app.mutableData.newPublic(dnsName, consts.TAG_TYPE_DNS)
                .then(dnsData => serviceMdata.getNameAndTag()
                    .then(res => dnsData.quickSetup({'': res.name})));
            });
        }));
  });

  it('fetch content', () => createAnonTestApp()
    .then((app) => app.webFetch(`safe://${domain}`)
      .then((f) => app.immutableData.fetch(f.data_map_name))
      .then((i) => i.read())
      .then((co) => should(co).equal(content))
  ));
});

const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;


describe('Mutable Data', () => {
  const app = createAuthenticatedTestApp();
  const TAG_TYPE = 15639;

  it('create random entry and read its name', () => app.mutableData.newRandomPublic(TAG_TYPE)
          .then((m) => m.getNameAndTag())
          .then((r) => {
            should(r.name).not.be.undefined();
            should(r.tag).equal(TAG_TYPE);
          }));

  it('create random private entry and read its name', () => app.mutableData.newRandomPrivate(TAG_TYPE)
          .then((m) => m.getNameAndTag())
          .then((r) => {
            should(r.name).not.be.undefined();
            should(r.tag).equal(TAG_TYPE);
          }));

  it('create custom private entry and read its name', () => app.mutableData.newPrivate('test-name-private-01010101010101', TAG_TYPE)
          .then((m) => m.getNameAndTag())
          .then((r) => {
            should(r.name).not.be.undefined();
            should(r.tag).equal(TAG_TYPE);
          }));

  it('create custom public entry and read its name', () => app.mutableData.newPublic('test-name-public-010101010101010', TAG_TYPE)
          .then((m) => m.getNameAndTag())
          .then((r) => {
            should(r.name).not.be.undefined();
            should(r.tag).equal(TAG_TYPE);
          }));

  describe('I/O', () => {
    it('can write and read from new', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup({ key: 'value' })
        .then(() => m.get('key')
          .then((v) => {
            should(v.version).equal(0);
            should(v.buf.toString()).equal('value');
          })))
    );
  });
});

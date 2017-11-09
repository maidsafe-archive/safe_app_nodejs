const should = require('should');
const h = require('../helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Mutable Data Entries', function testContainer() {
  this.timeout(30000);
  const app = createAuthenticatedTestApp();
  const TAG_TYPE = 15639;
  const TEST_ENTRIES = { key1: 'value1', key2: 'value2' };

  it('get entries and check length', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.len())
      .then((len) => {
        should(len).equal(Object.keys(TEST_ENTRIES).length);
      })
  );

  it('get entries and get a value', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.get('key1'))
      .then((value) => {
        should(value).not.be.undefined();
        should(value.buf.toString()).equal('value1');
        should(value.version).equal(0);
      })
  );

  it('insert & get a single value', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.insert('newKey', 'newValue')
        .then(entries.get('newKey')
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('newValue');
          should(value.version).equal(0);
        }))
  ));

  it('insert & get a single value from private MD', () => app.mutableData.newRandomPrivate(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.insert('newKey', 'newValue')
        .then(entries.get('newKey')
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('newValue');
          should(value.version).equal(0);
        }))
  ));

  it('forEach on list of entries', (done) => {
    app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.forEach((key, value) => {
        should(value.version).be.equal(0);
        should(TEST_ENTRIES).have.ownProperty(key.toString());
        should(TEST_ENTRIES[key.toString()]).be.equal(value.buf.toString());
      }).then(() => done(), (err) => done(err)));
  });

  it('get list of keys', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
      .then((keys) => keys.len())
      .then((len) => {
        should(len).equal(Object.keys(TEST_ENTRIES).length);
      })
  );

  it('forEach on list of keys', (done) => {
    app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
      .then((keys) => keys.forEach((key) => {
        should(TEST_ENTRIES).have.ownProperty(key.toString());
      }).then(() => done(), (err) => done(err)));
  });

  it('get list of values', () => app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
      .then((values) => values.len())
      .then((len) => {
        should(len).equal(Object.keys(TEST_ENTRIES).length);
      })
  );

  it('forEach on list of values', (done) => {
    app.mutableData.newRandomPublic(TAG_TYPE)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
      .then((values) => values.forEach((value) => {
        should(TEST_ENTRIES).matchAny((v) => {
          should(v).be.eql(value.buf.toString());
          should(value.version).be.equal(0);
        });
      }).then(() => done(), (err) => done(err)));
  });
});

const should = require('should');
const h = require('../helpers');

describe('Mutable Data Entries', () => {
  let app;
  const TYPE_TAG = 15639;
  const TEST_ENTRIES = { key1: 'value1', key2: 'value2' };

  before(async () => {
    app = await h.createAuthenticatedTestApp();
  });


  it('get entries and check length', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.len())
      .then((len) => should(len).equal(Object.keys(TEST_ENTRIES).length))
  );

  it('get entries and get a value', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.get('key1'))
      .then((value) => {
        should(value).not.be.undefined();
        should(value.buf.toString()).equal('value1');
        return should(value.version).equal(0);
      })
  );

  it('insert & get a single value', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.insert('newKey', 'newValue')
        .then(entries.get('newKey')
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('newValue');
          return should(value.version).equal(0);
        }))
  ));

  it('insert & get a single value from private MD', () => app.mutableData.newRandomPrivate(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getEntries()))
      .then((entries) => entries.insert('newKey', 'newValue')
        .then(entries.get('newKey')
        .then((value) => {
          should(value).not.be.undefined();
          should(value.buf.toString()).equal('newValue');
          return should(value.version).equal(0);
        }))
  ));

  it('get list of entries', async () => {
    const m = await app.mutableData.newRandomPublic(TYPE_TAG);
    await m.quickSetup(TEST_ENTRIES);
    const entries = await m.getEntries();
    const entriesArray = await entries.listEntries();
    const testKeys = Object.keys(TEST_ENTRIES);
    return entriesArray.map((entry, i) => {
      should(entry.key.toString()).be.equal(testKeys[i]);
      return should(entry.value.buf.toString()).be.equal(TEST_ENTRIES[testKeys[i]]);
    });
  }).timeout(10000);

  it('get list of keys', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
      .then((keys) => should(keys.length).equal(Object.keys(TEST_ENTRIES).length))
  );

  it('check list of keys', (done) => {
    app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
      .then((keys) => Promise.all(keys.map((key) =>
        should(TEST_ENTRIES).have.ownProperty(key.toString())
      )).then(() => done(), (err) => done(err)));
  });

  it('get empty list of keys', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup({}).then(() => m.getKeys()))
      .then((keys) => should(keys.length).equal(0))
  );

  it('get list of values', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
      .then((values) => should(values.length).equal(Object.keys(TEST_ENTRIES).length))
  );

  it('check list of values', (done) => {
    app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
      .then((values) => Promise.all(values.map((value) =>
        should(TEST_ENTRIES).matchAny((v) => {
          should(v).be.eql(value.buf.toString());
          should(value.version).be.equal(0);
        })
      )).then(() => done(), (err) => done(err)));
  });

  it('get empty list of values', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup({}).then(() => m.getValues()))
      .then((values) => should(values.length).equal(0))
  );
}).timeout(30000);

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

  it('list entries after deleting an entry', async () => {
    const md = await app.mutableData.newRandomPrivate(TYPE_TAG);
    await md.quickSetup({ key1: 'value1' });
    let entries = await md.getEntries();
    let listEntries = await entries.listEntries();
    let value = listEntries[0].value;
    should(value).not.be.undefined();
    should(value.buf.toString()).equal('value1');
    should(value.version).equal(0);

    const mut = await app.mutableData.newMutation();
    await mut.delete('key1', 1);
    await md.applyEntriesMutation(mut);
    entries = await md.getEntries();
    listEntries = await entries.listEntries();
    value = listEntries[0].value;
    should(value).not.be.undefined();
    should(value.buf.toString()).equal('');
    return should(value.version).equal(1);
  });

  it('get list of keys', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
      .then((keys) => should(keys.length).equal(Object.keys(TEST_ENTRIES).length))
  );

  it('check list of keys', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getKeys()))
      .then((keys) => Promise.all(keys.map((key) =>
        should(TEST_ENTRIES).have.ownProperty(key.toString())))));

  it('get empty list of keys', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup({}).then(() => m.getKeys()))
      .then((keys) => should(keys.length).equal(0))
  );

  it('get list of values', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
      .then((values) => should(values.length).equal(Object.keys(TEST_ENTRIES).length))
  );

  it('check list of values', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((m) => m.quickSetup(TEST_ENTRIES).then(() => m.getValues()))
    .then((values) => Promise.all(values.map((value) =>
      should(TEST_ENTRIES).matchAny((v) => {
        should(v).be.eql(value.buf.toString());
        return should(value.version).be.equal(0);
      })
    ))));

  it('get empty list of values', () => app.mutableData.newRandomPublic(TYPE_TAG)
      .then((m) => m.quickSetup({}).then(() => m.getValues()))
      .then((values) => should(values.length).equal(0))
  );

  it('fail to decrypt a private MD entry using wrong encryption keys', async () => {
    const privMd = await app.mutableData.newRandomPrivate(TYPE_TAG);
    await privMd.quickSetup();
    const nameAndTag = await privMd.getNameAndTag();
    const mut = await app.mutableData.newMutation();
    const encKey = await privMd.encryptKey('encryptedKey');
    const encValue = await privMd.encryptValue('encryptedValue');
    await mut.insert(encKey, encValue);
    await privMd.applyEntriesMutation(mut);
    const notMyPrivMd = await app.mutableData.newPrivate(nameAndTag.name,
                                                          nameAndTag.typeTag,
                                                          h.createRandomSecKey(),
                                                          h.createRandomNonce());
    const val = await notMyPrivMd.get(encKey);
    return should(notMyPrivMd.decrypt(val.buf)).be.rejectedWith('Core error: Symmetric decryption failed');
  });
}).timeout(30000);

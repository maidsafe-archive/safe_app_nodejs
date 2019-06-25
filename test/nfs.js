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
const { pubConsts: CONSTANTS } = require('../src/consts');
const errConst = require('../src/error_const');

describe('NFS emulation', () => {
  let app;
  const TYPE_TAG = 15639;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
  });

  it('opens file in write mode, writes, and returns fetched file', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((md) => md.quickSetup({}).then(() => md.emulateAs('nfs')))
    .then((nfs) => nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE)
      .then((file) => file.write('hello, SAFE world!')
        .then(() => file.close())
        .then(() => nfs.insert('hello.txt', file))
      )
      .then(() => should(nfs.fetch('hello.txt')).be.fulfilled())
    )
  );

  it('can write a buffer to a file', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((md) => md.quickSetup({}).then(() => md.emulateAs('nfs')))
    .then((nfs) => nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE)
      .then((file) => file.write(Buffer.from('hello, SAFE world!'))
        .then(() => file.close())
        .then(() => nfs.insert('hello.txt', file))
      )
      .then(() => should(nfs.fetch('hello.txt')).be.fulfilled())
    )
  );

  it('reads a file and returns file contents', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((md) => md.quickSetup({}).then(() => md.emulateAs('nfs')))
    .then((nfs) => nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE)
      .then((file) => file.write('hello, SAFE world!')
        .then(() => file.close())
        .then(() => nfs.insert('hello.txt', file))
      )
      .then(() => nfs.fetch('hello.txt'))
      .then((retrievedFile) => nfs.open(retrievedFile, CONSTANTS.NFS_FILE_MODE_READ))
      .then((file) => file.read(CONSTANTS.NFS_FILE_START, CONSTANTS.NFS_FILE_END))
      .then((data) => should(data.toString()).be.equal('hello, SAFE world!'))
    )
  );

  it('provides helper function to create and save file to the network', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((md) => md.quickSetup({}).then(() => md.emulateAs('nfs')))
    .then((nfs) => should(nfs.create('testing')).be.fulfilled())
  );

  it('deletes file', () => app.mutableData.newRandomPrivate(TYPE_TAG)
    // Note we use lowercase 'nfs' below to test that it is case insensitive
    .then((md) => md.quickSetup({}).then(() => md.emulateAs('nfs')))
    .then((nfs) => nfs.create('Hello world')
      .then((file) => nfs.insert('test.txt', file))
      .then(() => nfs.delete('test.txt', 1))
      .then(() => should(nfs.fetch('test.txt')).be.rejected())
    )
  );

  it('nfs creation and modification date for read', () => {
    let creationDate;
    return app.mutableData.newRandomPrivate(TYPE_TAG)
      .then((md) => md.quickSetup({}).then(() => md.emulateAs('NFS')))
      .then((nfs) => nfs.create('Hello world')
        .then((file) => nfs.insert('test.txt', file))
        .then((fileInserted) => { creationDate = fileInserted.created; })
        .then(() => nfs.fetch('test.txt'))
        .then((file) => nfs.open(file, CONSTANTS.NFS_FILE_MODE_READ))
        .then((fileToRead) => fileToRead.close()
          .then(() => {
            should(creationDate.getTime()).be.equal(fileToRead.created.getTime());
            return should(creationDate.getTime()).be.belowOrEqual(fileToRead.modified.getTime());
          })
        )
      );
  });

  it('nfs creation and modification dates for write', () => {
    let creationDate;
    return app.mutableData.newRandomPrivate(TYPE_TAG)
      .then((md) => md.quickSetup({}).then(() => md.emulateAs('NFS')))
      .then((nfs) => nfs.create('Hello world')
        .then((file) => nfs.insert('test.txt', file))
        .then((fileInserted) => { creationDate = fileInserted.created; })
        .then(() => nfs.fetch('test.txt'))
        .then((file) => nfs.open(file, CONSTANTS.NFS_FILE_MODE_OVERWRITE))
        .then((fileToUpdate) => fileToUpdate.write('Hello again!')
          .then(() => fileToUpdate.close())
          .then(() => {
            should(creationDate.getTime()).be.equal(fileToUpdate.created.getTime());
            return should(creationDate.getTime()).be.belowOrEqual(fileToUpdate.modified.getTime());
          })
        )
      );
  });

  it('create, delete, update, fetch and finally open to read a file', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((md) => md.quickSetup({}).then(() => md.emulateAs('nfs'))
      .then((nfs) => nfs.create('Hello world')
        .then((file) => nfs.insert('test.txt', file))
        .then(() => nfs.delete('test.txt', 1))
        .then(() => nfs.create('Hello world'))
        .then((file) => md.get('test.txt').then((value) => nfs.update('test.txt', file, value.version + 1)))
        .then(() => nfs.fetch('test.txt'))
        .then((file) => nfs.open(file, 4))
        .then((f) => f.read(CONSTANTS.NFS_FILE_START, CONSTANTS.NFS_FILE_END))
        .then((co) => should(co.toString()).be.equal('Hello world'))
      ))
  );

  it('reads file size', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    let file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    await nfs.insert('hello.txt', file);
    file = await nfs.fetch('hello.txt');
    let size = await file.size();
    should(size).be.equal(18);
    file = await nfs.open(file, CONSTANTS.NFS_FILE_MODE_READ);
    size = await file.size();
    return should(size).be.equal(18);
  });

  it('returns file version from underlying mutable data entry version', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    let file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    await nfs.insert('hello.txt', file);
    file = await nfs.fetch('hello.txt');
    await nfs.open(file, CONSTANTS.NFS_FILE_MODE_READ);
    return should(file.version).be.equal(0);
  });

  it('throws error if close is called on a non-open file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    return should(file.close())
      .be.rejectedWith(Error, { message: errConst.ERR_FILE_NOT_FOUND.msg });
  });

  it('throws error if write is called on a non-open file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    return should(file.write('hello'))
      .be.rejectedWith(Error, { message: errConst.ERR_FILE_NOT_FOUND.msg });
  });

  it('throws error if read is called on a non-open file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    return should(file.read())
      .be.rejectedWith(Error, { message: errConst.ERR_FILE_NOT_FOUND.msg });
  });

  it('resolves file size if file is not open', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    const size = await file.size();
    return should(size).be.equal(18);
  });

  it('inserts file with user metadata', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const userMetadata = 'text/plain';
    let file = await nfs.create('hello, SAFE world!');
    file = await nfs.insert('hello.txt', file, userMetadata);
    return should(file.userMetadata.toString())
      .be.equal(userMetadata);
  });

  it('updates file user metadata', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const userMetadata = 'text/plain';
    let file = await nfs.create('hello, SAFE world!');
    file = await nfs.insert('hello.txt', file, userMetadata);
    should(file.userMetadata.toString()).be.equal(userMetadata);
    const fileVersion = file.version;
    file = await nfs.update('hello.txt', file, fileVersion + 1, 'text/javascript');
    should(file.version).be.equal(1);
    return should(file.userMetadata.toString())
      .be.equal('text/javascript');
  });

  it('automatically obtains correct file version when passing constant', async () => {
    const m = await app.mutableData.newRandomPublic(TYPE_TAG);
    await m.quickSetup({});
    const nfs = await m.emulateAs('nfs');
    const userMetadata = 'text/plain';
    let file = await nfs.create('hello, SAFE world!');
    file = await nfs.insert('hello.txt', file, userMetadata);
    should(file.version).be.equal(0);
    file = await nfs.update('hello.txt', file, CONSTANTS.GET_NEXT_VERSION, 'text/javascript');
    return should(file.version).be.equal(1);
  });

  it('throws error if invalid user metadata type is passed while updating file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const userMetadata = 'text/plain';
    let file = await nfs.create('hello, SAFE world!');
    file = await nfs.insert('hello.txt', file, userMetadata);
    const fileVersion = file.version;
    const test = () => nfs.update('hello.txt', file, fileVersion + 1, { meta: 'data' });
    return should(test).throw(/string, Buffer, ArrayBuffer, Array/);
  });

  it('throws error if invalid user metadata type is passed while inserting file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = mData.emulateAs('nfs');
    const file = nfs.create('hello, SAFE world!');
    const test = () => nfs.insert('hello.txt', file, 5);
    return should(test).throw(/"value" argument must not be/);
  });
});

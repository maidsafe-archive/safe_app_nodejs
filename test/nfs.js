const should = require('should');
const h = require('./helpers');
const { pubConsts: CONSTANTS } = require('../src/consts');

describe('NFS emulation', () => {
  let app;
  const TYPE_TAG = 15639;

  before(async () => {
    app = await h.createAuthenticatedTestApp();
  });

  it('opens file in write mode, writes, and returns fetched file', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
    .then((nfs) => nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE)
        .then((file) => file.write('hello, SAFE world!')
          .then(() => file.close())
          .then(() => nfs.insert('hello.txt', file))
        )
        .then(() => should(nfs.fetch('hello.txt')).be.fulfilled())
      )
  );

  it('reads a file and returns file contents', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
    .then((nfs) => nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE)
      .then((file) => file.write('hello, SAFE world!')
        .then(() => file.close())
        .then(() => nfs.insert('hello.txt', file))
      )
      .then(() => nfs.fetch('hello.txt'))
      .then((retrievedFile) => nfs.open(retrievedFile, CONSTANTS.NFS_FILE_MODE_READ))
      .then((file) => file.read(CONSTANTS.NFS_FILE_START, CONSTANTS.NFS_FILE_END))
      .then((data) => {
        should(data.toString()).be.equal('hello, SAFE world!');
      })
    )
  );

  it('provides helper function to create and save file to the network', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
    .then((nfs) => should(nfs.create('testing')).be.fulfilled())
  );

  it('deletes file', () => app.mutableData.newRandomPrivate(TYPE_TAG)
    // Note we use lowercase 'nfs' below to test that it is case insensitive
    .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs')))
    .then((nfs) => nfs.create('Hello world')
      .then((file) => nfs.insert('test.txt', file))
      .then(() => nfs.delete('test.txt', 1))
      .then(() => {
        should(nfs.fetch('test.txt')).be.rejected();
      })
    )
  );

  it('nfs creation and modification date for read', () => {
    let creationDate;
    return app.mutableData.newRandomPrivate(TYPE_TAG)
      .then((m) => m.quickSetup({}).then(() => m.emulateAs('NFS')))
      .then((nfs) => nfs.create('Hello world')
        .then((file) => nfs.insert('test.txt', file))
        .then((fileInserted) => { creationDate = fileInserted.created; })
        .then(() => nfs.fetch('test.txt'))
        .then((file) => nfs.open(file, CONSTANTS.NFS_FILE_MODE_READ))
        .then((fileToRead) => fileToRead.close()
          .then(() => {
            should(creationDate.getTime()).be.equal(fileToRead.created.getTime());
            should(creationDate.getTime()).be.belowOrEqual(fileToRead.modified.getTime());
          })
        )
      );
  });

  it('nfs creation and modification dates for write', () => {
    let creationDate;
    return app.mutableData.newRandomPrivate(TYPE_TAG)
      .then((m) => m.quickSetup({}).then(() => m.emulateAs('NFS')))
      .then((nfs) => nfs.create('Hello world')
        .then((file) => nfs.insert('test.txt', file))
        .then((fileInserted) => { creationDate = fileInserted.created; })
        .then(() => nfs.fetch('test.txt'))
        .then((file) => nfs.open(file, CONSTANTS.NFS_FILE_MODE_OVERWRITE))
        .then((fileToUpdate) => fileToUpdate.write('Hello again!')
          .then(() => fileToUpdate.close())
          .then(() => {
            should(creationDate.getTime()).be.equal(fileToUpdate.created.getTime());
            should(creationDate.getTime()).be.belowOrEqual(fileToUpdate.modified.getTime());
          })
        )
      );
  });

  it('create, delete, update, fetch and finally open to read a file', () => app.mutableData.newRandomPublic(TYPE_TAG)
    .then((m) => m.quickSetup({}).then(() => m.emulateAs('nfs'))
      .then((nfs) => nfs.create('Hello world')
        .then((file) => nfs.insert('test.txt', file))
        .then(() => nfs.delete('test.txt', 1))
        .then(() => nfs.create('Hello world'))
        .then((file) => m.get('test.txt').then((value) => nfs.update('test.txt', file, value.version + 1)))
        .then(() => nfs.fetch('test.txt'))
        .then((file) => nfs.open(file, 4))
        .then((f) => f.read(CONSTANTS.NFS_FILE_START, CONSTANTS.NFS_FILE_END))
        .then((co) => {
          should(co.toString()).be.equal('Hello world');
        })
      ))
  );

  it('reads file size', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = await mData.emulateAs('nfs');
    let file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    await nfs.insert('hello.txt', file);
    file = await nfs.fetch('hello.txt');
    let size = await file.size();
    should(size).be.equal(18);
    file = await nfs.open(file, CONSTANTS.NFS_FILE_MODE_READ);
    size = await file.size();
    should(size).be.equal(18);
  });

  it('returns file version from underlying mutable data entry version', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = await mData.emulateAs('nfs');
    let file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    await nfs.insert('hello.txt', file);
    file = await nfs.fetch('hello.txt');
    await nfs.open(file, CONSTANTS.NFS_FILE_MODE_READ);
    should(file.version).be.equal(0);
  });

  it('throws error if close is called on a non-open file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = await mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    should(file.close()).be.rejectedWith(Error, { message: 'File is not open' });
  });

  it('throws error if write is called on a non-open file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = await mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    should(file.write('hello')).be.rejectedWith(Error, { message: 'File is not open' });
  });

  it('throws error if read is called on a non-open file', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = await mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    should(file.read()).be.rejectedWith(Error, { message: 'File is not open' });
  });

  it('resolves file size if file is not open', async () => {
    const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
    await mData.quickSetup({});
    const nfs = await mData.emulateAs('nfs');
    const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
    await file.write('hello, SAFE world!');
    await file.close();
    const size = await file.size();
    should(size).be.equal(18);
  });
//  describe('internal function', () => {
//    it.only('verifies if file meta data is String instance', async () => {
//      const mData = await app.mutableData.newRandomPublic(TYPE_TAG);
//      await mData.quickSetup({});
//      const nfs = await mData.emulateAs('nfs');
//      const file = await nfs.open(null, CONSTANTS.NFS_FILE_MODE_OVERWRITE);
//    });
//  });
}).timeout(30000);

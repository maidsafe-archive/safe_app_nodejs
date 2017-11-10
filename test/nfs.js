const should = require('should');
const h = require('./helpers');
const { pubConsts: CONSTANTS } = require('../src/consts');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('NFS emulation', function testContainer() {
  this.timeout(30000);
  const app = createAuthenticatedTestApp();
  const TYPE_TAG = 15639;

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
        .then((f) => f.read(0, 0))
        .then((co) => {
          should(co.toString()).be.equal('Hello world');
        })
      ))
  );
});

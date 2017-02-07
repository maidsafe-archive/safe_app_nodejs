const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;


describe('Mutable Data', () => {
  const app = createAuthenticatedTestApp();
  const TAG_TYPE = 15639;
  const TAG_TYPE_RESERVED = 10000;
  const TAG_TYPE_INVALID = '_invalid_tag';
  const TEST_NAME_PRIVATE = 'test-name-private-01010101010101';
  const TEST_NAME_PUBLIC  = 'test-name-public--01010101010101';
  const TEST_NAME_INVALID = 'name-shorter-than-32-bytes-long';

  describe('Create with invalid values', () => {
    it.skip('create random public with reserved tag type', () => {
      return should(app.mutableData.newRandomPublic(TAG_TYPE_RESERVED)).be.rejected();
    });

    it.skip('create random private with reserved tag type', () => {
      return should(app.mutableData.newRandomPrivate(TAG_TYPE_RESERVED)).be.rejected();
    });

    it('create random public with invalid tag vaue', () => {
      return should(app.mutableData.newRandomPublic(TAG_TYPE_INVALID)).be.rejected();
    });

    it('create random private with invalid tag value', () => {
      return should(app.mutableData.newRandomPrivate(TAG_TYPE_INVALID)).be.rejected();
    });

    it.skip('create custom public with reserved tag type', () => {
      return should(app.mutableData.newPublic(TEST_NAME_PUBLIC, TAG_TYPE_RESERVED)).be.rejected();
    });

    it.skip('create custom private with reserved tag type', () => {
      return should(app.mutableData.newPrivate(TEST_NAME_PRIVATE, TAG_TYPE_RESERVED)).be.rejected();
    });

    it('create custom public with invalid tag value', () => {
      return should(app.mutableData.newPublic(TEST_NAME_PUBLIC, TAG_TYPE_INVALID)).be.rejected();
    });

    it('create custom private with invalid tag value', () => {
      return should(app.mutableData.newPrivate(TEST_NAME_PRIVATE, TAG_TYPE_INVALID)).be.rejected();
    });

    it('create custom public with invalid name', () => {
      return should(app.mutableData.newPublic(TEST_NAME_INVALID, TAG_TYPE)).be.rejected();
    });

    it('create custom private with invalid name', () => {
      return should(app.mutableData.newPrivate(TEST_NAME_INVALID, TAG_TYPE)).be.rejected();
    });
  })

  describe('MutableData info', () => {
    it('create random public entry and read its name', () =>
        app.mutableData.newRandomPublic(TAG_TYPE)
            .then((m) => m.getNameAndTag())
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create random private entry and read its name', () =>
        app.mutableData.newRandomPrivate(TAG_TYPE)
            .then((m) => m.getNameAndTag())
            .then((r) => {
              should(r.name).not.be.undefined();
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create custom public entry and read its name', () =>
        app.mutableData.newPublic(TEST_NAME_PUBLIC, TAG_TYPE)
            .then((m) => m.getNameAndTag())
            .then((r) => {
              should(r.name).not.be.undefined();
              // test XOR_NAME generation algorithm applied to the name provided???
              should(r.name).have.length(TEST_NAME_PUBLIC.length);
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it('create custom private entry and read its name', () =>
        app.mutableData.newPrivate(TEST_NAME_PRIVATE, TAG_TYPE)
            .then((m) => m.getNameAndTag())
            .then((r) => {
              should(r.name).not.be.undefined();
              // test XOR_NAME generation algorithm applied to the name provided???
              should(r.name).have.length(TEST_NAME_PUBLIC.length);
              should(r.tag).equal(TAG_TYPE);
            })
    );

    it.only('mdata version', () => {
      return app.mutableData.newRandomPrivate(TAG_TYPE)
          .then((m) => m.put().then(() => m.getVersion()))
          .then((version) => {
            should(version).equal(0);
            // test that after a change in mdata (not in the entries) version is incremented
          })

    });
  });

  describe('Entries', () => {
      it('get non-existing key', () => app.mutableData.newRandomPrivate(TAG_TYPE)
          .then((md) => md.get('_non-existing-key'))
          .then((value) => {
            console.log("value:", value);
            should(value).not.be.undefined();
          })
      );

      it('insert and get a single entry', () => {
      });

      it('update a single entry', () => {
      });

      it('update a single entry and check version', () => {
      });

      it('delete a single entry', () => {
      });

      it('get list of entries', () => {
      });

      it('get list of keys', () => {
      });

      it('get list of values', () => {
      });

      it('mutate entries in bulk and check versions', () => {
      });

      it('single mutation followed by a bulk mutation', () => {
      });

      it.skip('encrypt entry key', () => {
      });

      it.skip('encrypt entry value', () => {
      });
  });

  describe('Permissions', () => {
    it('get list of permissions', () => {
    });

    it('get list of user\'s permissions', () => {
    });

    it('insert a permission', () => {
    });

    it('update a permission', () => {
    });

    it('delete a permission', () => {
    });

  });

  describe('Owners', () => {
    it('change oenwership', () => {
    });
  });


});

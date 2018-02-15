const error = require('../src/error_const');
const should = require('should');


describe('Error Constants', () => {
  it('FAILED_TO_LOAD_LIB', () => {
    should.exist(error.FAILED_TO_LOAD_LIB);
    should(error.FAILED_TO_LOAD_LIB.code).be.equal(1);
    should(error.FAILED_TO_LOAD_LIB.msg('theReason')).endWith('theReason');
  });


  it('MALFORMED_APP_INFO', () => {
    should.exist(error.MALFORMED_APP_INFO);
    should(error.MALFORMED_APP_INFO.code).be.equal(2);
  });

  it('ERR_NO_SUCH_DATA', () => {
    should.exist(error.ERR_NO_SUCH_DATA);
    should(error.ERR_NO_SUCH_DATA).be.equal(-103);
  });

  it('ERR_NO_SUCH_ENTRY', () => {
    should.exist(error.ERR_NO_SUCH_ENTRY);
    should(error.ERR_NO_SUCH_ENTRY).be.equal(-106);
  });

  it('ERR_FILE_NOT_FOUND', () => {
    should.exist(error.ERR_FILE_NOT_FOUND);
    should(error.ERR_FILE_NOT_FOUND).be.equal(-301);
  });

  it('MISSING_PERMS_ARRAY', () => {
    should.exist(error.MISSING_PERMS_ARRAY);
  });

  it('INVALID_SHARE_MD_PERMISSION', () => {
    should.exist(error.INVALID_SHARE_MD_PERMISSION);
    should(error.INVALID_SHARE_MD_PERMISSION.msg('theReason')).endWith('theReason');
  });

  it('INVALID_PERMS_ARRAY', () => {
    should.exist(error.INVALID_PERMS_ARRAY);
  });

  it('MISSING_URL', () => {
    should.exist(error.MISSING_URL);
  });

  it('INVALID_URL', () => {
    should.exist(error.INVALID_URL);
  });

  it('MISSING_AUTH_URI', () => {
    should.exist(error.MISSING_AUTH_URI);
  });

  it('MISSING_CONTAINERS_OBJECT', () => {
    should.exist(error.MISSING_CONTAINERS_OBJECT);
  });

  it('MISSING_CONTAINER_STRING', () => {
    should.exist(error.MISSING_CONTAINER_STRING);
  });

  it('NON_DEV', () => {
    should.exist(error.NON_DEV);
  });

  it('MISSING_PUB_ENC_KEY', () => {
    should.exist(error.MISSING_PUB_ENC_KEY);
  });

  it('MISSING_SEC_ENC_KEY', () => {
    should.exist(error.MISSING_SEC_ENC_KEY);
  });
});

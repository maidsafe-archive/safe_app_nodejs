const error = require('../src/error_const');
const should = require('should');


describe('Error Constants', () => {
  it('FAILED_TO_LOAD_LIB', () => {
    should.exist(error.FAILED_TO_LOAD_LIB);
    should(error.FAILED_TO_LOAD_LIB.msg('theReason')).endWith('theReason');
  });


  it('MALFORMED_APP_INFO', () => {
    should.exist(error.MALFORMED_APP_INFO);
  });

  it('ERR_NO_SUCH_DATA', () => {
    should.exist(error.ERR_NO_SUCH_DATA);
    should(error.ERR_NO_SUCH_DATA.code).be.equal(-103);
  });

  it('ERR_NO_SUCH_ENTRY', () => {
    should.exist(error.ERR_NO_SUCH_ENTRY);
    should(error.ERR_NO_SUCH_ENTRY.code).be.equal(-106);
  });

  it('ERR_FILE_NOT_FOUND', () => {
    should.exist(error.ERR_FILE_NOT_FOUND);
    should(error.ERR_FILE_NOT_FOUND.code).be.equal(-301);
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
    should(new RegExp('theReason').test(error.MISSING_SEC_ENC_KEY.msg('theReason'))).be.true();
    should.exist(error.MISSING_SEC_ENC_KEY);
  });

  it('LOGGER_INIT_ERROR', () => {
    should(error.LOGGER_INIT_ERROR.msg('theReason')).endWith('theReason');
    should.exist(error.LOGGER_INIT_ERROR);
  });

  it('CONFIG_PATH_ERROR', () => {
    should(error.CONFIG_PATH_ERROR.msg('theReason')).endWith('theReason');
    should.exist(error.CONFIG_PATH_ERROR);
  });

  it('XOR_NAME', () => {
    should.exist(error.XOR_NAME);
  });

  it('NONCE', () => {
    should.exist(error.NONCE);
  });

  it('TYPE_TAG_NAN', () => {
    should.exist(error.TYPE_TAG_NAN);
  });

  it('SETUP_INCOMPLETE', () => {
    should.exist(error.SETUP_INCOMPLETE);
  });

  it('INVALID_PERM', () => {
    should(error.INVALID_PERM.msg('theReason')).startWith('theReason');
    should.exist(error.INVALID_PERM);
  });
});

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
});

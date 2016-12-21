const lib = require('../src/native/lib');
const should = require('should');

describe('Smoke test', () => {
  it('confirms there is a lib', () => {
    should(lib).be.Object();
  });
});

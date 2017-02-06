const should = require('should');
const h = require('./helpers');

describe('Immutable Data', () => {
  const app = h.createAuthenticatedTestApp();
  it('write read simple ', () => {
    const testString = `test-${Math.random()}`;

    return app.immutableData.create()
      .then((w) =>w.write(testString)
        .then(() => w.close())
        .then((addr) => app.immutableData.fetch(addr)
           .then((r) => r.read())
           .then((res) => {
             should(res.toString()).equal(testString);
           })));
  });
});

const should = require('should');
const h = require('./helpers');

describe('Immutable Data', () => {
  const app = h.createAuthenticatedTestApp();
  it('write read simple ', () => {

    const testString = "test-" + Math.random();

    return app.immutableData.create().then((w) => {
    	console.log("created", w);
      return w.write(testString).then(() => {console.log("after"); return w.close()})
    }).then((addr) => {console.log("fetching", addr); return app.immutableData.fetch(addr)}
    ).then(r => r.read()
    ).then(res => should(res).equal(testString))
  });
});
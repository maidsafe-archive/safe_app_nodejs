const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Access Container', () => {
  const app = createAuthenticatedTestApp();

  it('is authenticated for testing', () => {
    should(app.auth.registered).be.true();
  });

  it('has read access to `_test`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('_test').then((hasAccess) => {
        should(hasAccess).be.true();
      })));

  it('can\'t access to `__does_not_exist`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('__does_not_exist')
          .should.be.rejected()));

  it('read info of `_test`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.getAccessContainerInfo('_test').then((ctnr) => ctnr.getNameAndTag()).then(resp => {
        should(resp.name).is.not.undefined();
        should(resp.tag).equal(15000);
      })));
});

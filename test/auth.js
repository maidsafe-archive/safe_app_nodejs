const should = require('should');
const h = require('./helpers');

const createAuthenticatedTestApp = h.createAuthenticatedTestApp;

describe('Access Container', () => {
  const app = createAuthenticatedTestApp();

  it('is authenticated for testing', () => {
    should(app.auth.registered).be.true();
  });

  xit('has read access to `_test`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('_test').then((hasAccess) => {
        should(hasAccess).be.true();
      })));

  xit('can\'t access to `__does_not_exist`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.canAccessContainer('__does_not_exist').then((hasAccess) => {
        should(hasAccess).be.false();
      })));

  xit('read info of `_test`', () => app.auth.refreshContainerAccess().then(() =>
      app.auth.getAccessContainerInfo('_test').then((ctnr) => ctnr.getAddressInfo()).then((address, tag) => {
        should(address).is.true();
        should(tag).equals(15000);
      })));
});

const lib = require('../src/native/lib');
const App = require('../src/app');

const createTestApp = (scope) => new App({ id: 'net.maidsafe.test.javascript.id',
  name: 'JS Test',
  vendor: 'MaidSafe Ltd.',
  scope
});

function createAuthenticatedTestApp(scope) {
	const app = createTestApp(scope);
	app._connection = lib.gen_testing_app_with_access();
	app.auth._registered = true;
	return app;
}

module.exports = {
	createTestApp,
	createAuthenticatedTestApp
};
const createSAFEApp = require('../src/').initializeApp;

const appInfo = {
	'id': 'net.maidsafe.examples.node-js-test-app',
	'name': 'NodeJS example App',
	'vendor': 'MaidSafe.net Ltd.'
}

const containers = {
	'_public': ['Insert', 'Read', 'Update']
}

createSAFEApp(appInfo).then(app =>
	app.auth.genAuthUri(containers).then(res => {
		console.log('Trying to open request # ' + res.req_id + ' as ' + res.uri);
		return app.auth.openUri(res.uri);
	})
);

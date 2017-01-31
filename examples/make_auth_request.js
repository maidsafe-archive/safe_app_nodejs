const createSAFEApp = require('../src/').initializeApp;
const lib = require('../src/native/lib'); // FIXME: url opening should be exposed differently!

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
		console.log('trying to open request no ' + res.req_id + ' as ' + res.uri);
		return lib.openUri(res.uri);
	})
);
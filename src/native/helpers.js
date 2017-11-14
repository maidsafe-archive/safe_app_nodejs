const api = require('./api');

let helpers = { };

api.forEach((mod) => {
	if (mod.helpers){
		Object.assign(helpers, mod.helpers);
	}
});


module.exports = helpers;

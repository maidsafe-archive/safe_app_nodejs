
const App = require('./app');
const autoref = require('./helpers').autoref;
const version = require('../packages.json').version;

function initializeApp(appInfo, opts) {
  return autoref(App.registered(appInfo, opts));
}

function fromAuthURI(appInfo, responseUrl) {
  // tbd
  return App.fromAuthUri(appInfo, responseUrl);
}

module.exports = {
  VERSION: version,
  initializeApp,
  fromAuthURI
};

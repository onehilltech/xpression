var blueprint = require ('@onehilltech/blueprint')
  , path      = require ('path')
  ;

// Export the application as a module. This allows other applications to integrate
// our application logic into their application logic.
var appPath = path.resolve (__dirname, '../app');
module.exports = exports = new blueprint.ApplicationModule ('com.onehilltech.gatekeeper', appPath);

// Export the authentication package.
exports.auth = require ('./authentication');
exports.authentication = exports.auth;
exports.newClient = require ('./GatekeeperClient');
exports.authorization = require ('./authorization');
exports.roles = require ('./roles');
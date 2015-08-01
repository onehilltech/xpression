var winston = require ('winston')
  , path    = require ('path')
  , all     = require ('require-all')
  ;

var Server        = require ('./Server')
  , RouterBuilder = require ('./RouterBuilder')
  ;

/**
 * @class Application
 *
 * The main Blueprint.js application.
 *
 * @param appPath
 * @constructor
 */
function Application (appPath) {
  this._appPath = appPath;
  this._server = new Server (this._appPath);

  winston.log ('info', 'application path: %s', this._appPath);

  // Load all the models into memory.
  this._models = all ({
    dirname     :  path.join (this._appPath, 'models'),
    filter      :  /(.+)\.js$/,
    excludeDirs :  /^\.(git|svn)$/
  });

  // Load all the controllers into memory.
  winston.info ('loading controllers; please be patient...')
  this._controllers = all ({
    dirname     :  path.join (this._appPath, 'controllers'),
    filter      :  /(.+Controller)\.js$/,
    excludeDirs :  /^\.(git|svn)$/,
    resolve     : function (Controller) {
      winston.log ('debug', 'instantiating controller %s...', Controller.name);
      return new Controller ();
    }
  });

  // Load all the routers into memory, and bind to the controllers. Once the routers,
  // are built, instruct the server to use the built routers.
  var routersPath = path.join (this._appPath, 'routers');
  var routers = all ({
    dirname     :  routersPath,
    filter      :  /(.+Router)\.js$/,
    excludeDirs :  /^\.(git|svn)$/,
  });

  var routerBuilder = new RouterBuilder (routersPath, this._controllers);
  this._mainRouter = routerBuilder.build (routers).getRouter ();
  this._server.use (this._mainRouter);

  // Lastly, set the static routes for the server.
  this._server.static (path.join (this._appPath, '../public_html'));
}

/**
 * Start the application.
 */
Application.prototype.start = function () {
  winston.log ('info', 'starting the Blueprint.js application');
  this._server.listen ();
};

/**
 * Get the models defined by the application.
 */
Application.prototype.__defineGetter__ ('models', function () {
  return this._models;
});

module.exports = exports = Application;

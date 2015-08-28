var util = require ('util')
  , path = require ('path')
  , fs   = require ('fs')
  ;

var BaseController    = require ('./BaseController')
  , Application       = require ('./Application')
  , ApplicationModule = require ('./ApplicationModule')
  ;

exports.BaseController = BaseController;
exports.ApplicationModule = ApplicationModule;

function theApp () {
  return process.mainModule.blueprint;
}

function verifyInitialized () {
  if (!theApp ())
    throw new Error ('Application not initialized; must call Application(appPath) first');
}

// Singleton application for the module. Resolve the location of the application
// directory, and initialize the application to the resolved location.
Object.defineProperty (exports, 'Schema', {
  get : function () {
    verifyInitialized ();
    return process.mainModule.app.Schema;
  }
});

/**
 * Get the application for the module. If the application has not been
 * initialized, then an exception is thrown.
 */
Object.defineProperty (exports, 'app', {
  get : function () {
    verifyInitialized ();
    return theApp ();
  }
});

/**
 * Helper method to define different controllers. This method ensures the controller
 * is an instance of BaseController.
 */
exports.controller = function (controller, base) {
  base = base || BaseController;
  util.inherits (controller, base);
};

/**
 * Register a model with the application database.
 *
 * @param name
 * @param schema
 */
exports.model = function (name, schema) {
  verifyInitialized ();
  return theApp ().database.registerModel (name, schema);
}

/**
 * Factory method for creating an Blueprint.js application. The application is installed
 * in the main module.
 *
 * @param appPath
 * @constructor
 */
exports.Application = function (appPath) {
  var app = theApp ();
  if (app) throw new Error ('Application is already initialized');

  // Create a new application, initialize the application, and return the
  // application to the caller.
  app = new Application (appPath);
  app.init ();

  // Install the application in the main module. We define it as a property
  // so that it cannot be set.
  Object.defineProperty (process.mainModule, 'blueprint', {
    get : function () { return app; }
  });

  return app;
};

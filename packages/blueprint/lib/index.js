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

// Locate the masterprint for the application. The masterprint is the top-level
// Blueprint module for the application that is using another Blueprint application
// as a library module. We need to masterprint when registering the database models
// with Mongoose. Without the masterprint, the database models are registered on
// the connection in this loaded module, not the top-level application.

var parent = module;

while (parent.parent !== null)
  parent = parent.parent;

var masterprint = parent.require ('blueprint');

// Singleton application for the module. Resolve the location of the application
// directory, and initialize the application to the resolved location.
var app;

Object.defineProperty (exports, 'Schema', {
  get : function () { return masterprint.ApplicationModule.Schema; }
});

/**
 * Get the application for the module. If the application has not been
 * initialized, then an exception is thrown.
 */
Object.defineProperty (exports, 'app', {
  get : function () {
    if (!app) throw new Error ('Application is not initialized; must all Application(appPath) first');

    return app;
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
  return masterprint.app.database.registerModel (name, schema);
}

/**
 * Factory method for creating an Blueprint.js application.
 *
 * @param appPath
 * @constructor
 */
exports.Application = function (appPath) {
  if (app)
    throw new Error ('Application is already initialized');

  // Create a new application, initialize the application, and return the
  // application to the caller.
  app = new Application (appPath);
  app.init ();

  return app;
};

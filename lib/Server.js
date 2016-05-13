var express     = require ('express')
  , winston     = require ('winston')
  , path        = require ('path')
  , extend      = require ('extend')
  , async       = require ('async')
  , consolidate = require ('consolidate')
  , fs          = require ('fs')
  , fse         = require ('fs-extra')
  ;

var Path     = require ('./Path')
  , Uploader = require ('./Uploader')
  ;

var VIEW_CACHE_PATH  = 'data/views';
var UPLOAD_PATH = 'data/uploads'

var DEFAULT_VIEW_ENGINE = 'pug';

/**
 * Configure the middleware for the application.
 *
 * @param app
 * @param config
 */
function configureMiddleware (app, config) {
  if (!config.morgan)
    config.morgan = { format : 'combined' };

  // Make a new express application.
  var middleware = {};

  // Configure the different middleware for the server. Some of the middleware
  // is required. Some of the middleware is optional. For the middleware that is
  // required, we provide default options if no options are provided. For the
  // middleware that is optional, it is only included in the server if options
  // are provided for it.

  var configurators = {
    morgan : function (app, opts) {
      winston.log ('debug', 'morgan format: %s', opts.format);
      middleware.morgan = require ('morgan');

      app.use (middleware.morgan (opts.format, opts.options));
    },

    cookies : function (app, opts) {
      winston.log('debug', 'cookie parser: %s', opts.cookies);
      middleware.cookies = require('cookie-parser');

      app.use (middleware.cookies (opts.cookies));
    },

    bodyParser : function (app, opts) {
      middleware.bodyParser = require('body-parser');

      for (key in opts) {
        if (opts.hasOwnProperty(key)) {
          var f = middleware.bodyParser[key];

          if (!f)
            throw new Error(util.format('%s is an unsupported middleware type', key));

          winston.log('debug', 'bodyParser.%s: %s', key, opts[key]);
          app.use (f.call (middleware.bodyParser, opts[key]));
        }
      }
    },

    validator : function (app, opts) {
      winston.log('debug', 'express validator: %s', opts);
      middleware.validator = require('express-validator');

      app.use (middleware.validator (opts));
    },

    session : function (app, opts) {
      winston.log('debug', 'express session: %s', opts);
      middleware.session = require('express-session');

      app.use (middleware.session (opts));
    }
  };

  for (var key in config) {
    if (config.hasOwnProperty (key)) {
      // Locate the configurator for this configuration.
      var configurator = configurators[key];

      if (configurator)
        configurator (app, config[key])
    }
  }

  // Make sure that Passport is configured as the last middleware.
  if (config.passport) {
    var passport = middleware.passport = require ('passport');
    app.use (passport.initialize ());

    if (config.passport.session) {
      if (!config.session)
        throw new Error ('Session configuration is missing');

      // Configure the Express application to use passport sessions.
      app.use (passport.session ());

      // Configure Passport to serialize and deserialize user sessions.
      passport.serializeUser (config.passport.session.serializer);
      passport.deserializeUser (config.passport.session.deserializer);
    }
  }

  // Add the custom middleware to the end.
  if (config.custom)
    app.use (config.custom);

  return middleware
}

/**
 * @class Protocol
 *
 * @param protocol
 * @param port
 * @constructor
 */
function Protocol (name, protocol, port) {
  this._name = name;
  this._protocol = protocol;
  this._port = port;
}

/**
 * Instruct the protocol to start listening for events.
 *
 * @param port
 * @param callback
 */
Protocol.prototype.listen = function (port, callback) {
  if (!callback)
    callback = port;

  if (typeof port === 'function')
    port = this._port;

  port = port || this._port;

  winston.log ('info', '[%s]: listening on port %d...', this._name, port);
  this._protocol.listen (port, callback);
};

/**
 * Private function to configure the protocols based on the configuration.
 *
 * @param protocolConfigs
 * @param app
 * @returns {Array}
 */
function configureProtocols (protocolConfigs, app) {
  var configurators = {
    http  : function (opts, app) {
      var protocol = require ('http').createServer (app);
      var port = opts.port || 80;

      return new Protocol ('http', protocol, port);
    },

    https : function (opts, app) {
      var protocol = require ('https').createServer (opts.options, app);
      var port = opts.port || 443;

      return new Protocol ('https', protocol, port);
    }
  };

  var protocols = [];

  for (var protocolType in protocolConfigs) {
    if (protocolConfigs.hasOwnProperty (protocolType)) {
      var configurator = configurators[protocolType];

      if (!configurator)
        throw new Error ('Unsupported protocol: ' + protocolType);

      protocols.push (configurator (protocolConfigs[protocolType], app));
    }
  }

  return protocols;
}

/**
 * @class Server
 *
 * Server abstraction that integrates an Express.js application with the
 * protocols for handling events over the network.
 *
 * @param config
 * @constructor
 */
function Server (appPath, config) {
  config = config || {};

  this._appPath = appPath;
  this._config = config;
  this._app = express ();
  this._protocols = [];

  // Configure the middleware for the Express.js application.
  if (config.middleware)
    this._middleware = configureMiddleware (this._app, config.middleware);

  if (config.protocols)
    this._protocols = configureProtocols (config.protocols, this._app);

  if (config.statics) {
    var self = this;

    async.each(config.statics, function (iter, callback) {
      var staticPath = path.resolve (self._appPath, iter);
      winston.log('debug', 'static path: ', staticPath);

      self._app.use(express.static(staticPath));
      callback ();
    });
  }

  // Initialize the uploader for the server.
  var uploadPath = Path.resolve (appPath, UPLOAD_PATH);
  uploadPath.createIfNotExists ();
  this._uploader = new Uploader ({dest : uploadPath.path});

  // Setup the views for the server, and the view engine. There can be a
  // single view engine, or there can be multiple view engines. The view
  // engine must be supported by consolidate.js.
  this._viewCachePath = Path.resolve (this._appPath, VIEW_CACHE_PATH);
  this._viewCachePath.createIfNotExists ();

  this._app.set ('views', this._viewCachePath.path);

  var viewEngine = config['view_engine'] || DEFAULT_VIEW_ENGINE;
  this._app.set ('view engine', viewEngine);

  if (config['view_engines']) {
    // We are going to load multiple view engines in addition to the default
    // view engine for the server.
    var viewEngines = config['view_engines'];
    var length = viewEngines.length;

    for (var i = 0; i < length; ++ i) {
      var engine = viewEngines[i];
      this._app.engine (engine, consolidate[engine]);
    }
  }

  // Set the locals for the server application.
  if (config.locals)
    extend (true, this._app.locals, config.locals);
}

/**
 * Start listening for requests.
 *
 * @param listenCallback
 * @param done
 */
Server.prototype.listen = function (done) {
  if (this._protocols.length === 0)
    winston.log ('warn', 'server has no protocols; cannot receive any requests');

  async.each (this._protocols, function (protocol, callback) {
    protocol.listen (callback);
  }, done);
};

/**
 * Import views from a path. This allows the views in the specified path to be
 * be used in the render() method by controllers.
 *
 * @param path
 */
Server.prototype.importViews = function (srcPath) {
  winston.log ('debug', 'importing views from %s', srcPath);

  var options = {
    recursive: true,
    preserveTimestamps: true,
  };

  fse.copySync (srcPath, this._viewCachePath.path, options);
};

/**
 * Get the middleware for the server. The available middleware is defined in
 * the server.config.js file.
 */
Server.prototype.__defineGetter__ ('middleware', function () {
  return this._middleware;
});

Server.prototype.__defineGetter__ ('upload', function () {
  return this._uploader;
});

/**
 * Set the main router for the server.
 *
 * @param router
 */
Server.prototype.setMainRouter = function (router) {
  this._app.use (router);
};

Server.prototype.__defineGetter__ ('app', function () {
  return this._app;
});

module.exports = exports = Server;
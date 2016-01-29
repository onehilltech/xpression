var mongoose  = require ('mongoose')
  , winston   = require ('winston')
  , util      = require ('util')
  , fs        = require ('fs')
  , async     = require ('async')
  ;

var GridFS = require ('./GridFS')
  , Path   = require ('./Path')
  ;

/**
 * @class Database
 *
 * Wrapper class that simplifies working with the database.
 *
 * @param opts
 * @constructor
 */
function Database (opts) {
  this._opts = opts;

  winston.log ('debug', 'database connection: %s', opts.connstr);
  winston.log ('debug', 'database options: %s', util.inspect (opts.options));

  // Create a new connection, and initialize GridFS on this connection.
  this._conn = mongoose.createConnection ();
  this._gridFS = new GridFS (this._conn);
}

Database.Schema = mongoose.Schema;

/**
 * Set the messenter for the database.
 *
 * @param messenger
 */
Database.prototype.setMessenger = function (messenger) {
  this._messenger = messenger;
};

/**
 * Connect to the database.
 *
 * @param callback
 */
Database.prototype.connect = function (callback) {
  var self = this;

  // Connect to the database.
  winston.log ('info', 'connecting to database');

  this._conn.open (this._opts.connstr, this._opts.options, function (err) {
    if (!err && self._messenger)
      self._messenger.emit ('database.connect', self);

    callback (err);
  });
};

/**
 * Disconnect from the database.
 *
 * @param callback
 */
Database.prototype.disconnect = function (callback) {
  var self = this;

  winston.log ('info', 'disconnecting from database');

  this._conn.close (function (err) {
    if (!err && self._messenger)
      self._messenger.emit ('database.disconnect', self);

    callback (err);
  });
};

/**
 * Register a model with the database.
 *
 * @param name
 * @param schema
 * @returns {*}
 */
Database.prototype.registerModel = function (name, schema) {
  winston.log ('info', 'model registration: %s', name);

  if (this._conn.models[name])
    return this._conn.models[name];

  winston.log ('info', 'model registration: %s', name);

  var model = this._conn.model (name, schema);

  if (this._messenger)
    this._messenger.emit ('database.model', this, model);

  return model;
};

/**
 * Seed the database. Each separate file in the \a path contains the data for
 * each model (or collection) in the database. The name of the file is the
 * name of the target collection.
 *
 * @param path
 * @param env
 */
Database.prototype.seed = function (collection, seed, done) {
  done = done || function (err, seed) {};
  var pre = seed.pre || function (model, done) { done (); };
  var post = seed.post || function (model, done) { done (); };

  // Locate the collection model in the database, then use the data in the
  // seed to add the documents to the collection.
  var Model = this._conn.models[collection];

  if (!Model)
    return done (new Error (util.format ('collection does not exist [%s]', collection)));

  // Run the 'pre' function for the seed.
  pre (Model, function (err) {
    if (err) return done (err);

    // Seed the database with data from the loaded seed.
    Model.create (seed.data, function (err, docs) {
      if (err) return done (err);

      // Save the created documents, and return the seed to the caller.
      seed.documents = docs;

      // Run the 'post' function for the seed.
      post (Model, function (err) {
        if (err) return done (err);

        // Return the seed with the updated data.
        return done (null, seed);
      });
    });
  });
};

Database.prototype.__defineGetter__ ('gridfs', function () {
  return this._gridFS;
});

Database.prototype.__defineGetter__ ('models', function () {
  return this._conn.models;
});

Database.prototype.__defineGetter__ ('Schema', function () {
  return Database.Schema;
});

/**
 * Create a GridFS write stream to the database.
 *
 * @param file
 * @param metadata
 * @returns {Stream}
 */
Database.prototype.createWriteStream = function (opts) {
  return this._gridFS.createWriteStream (opts);
};


// Export the database, and the different class types.
module.exports = exports = Database;
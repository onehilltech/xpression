'use strict';

const _        = require ('underscore')
  , objectPath = require ('object-path')
  , instances  = require ('./validators')
  ;

module.exports = makeValidationSchema;

function makeValidationSchemaForPath (path, opts) {
  // Build the general-purpose schema for the path.
  var schema = {};
  var opts = opts || {};

  // The 'optional' property has to be the first key in the partial schema
  // object in order for validation by schema to work.
  var allOptional = opts.allOptional || false;

  if (!path.isRequired ||
      objectPath.has (path.options, 'default') ||
      objectPath.get (path.options, 'validation.optional', false) ||
      allOptional)
  {
    schema.optional = true;
  }

  // Build the instance schema for the path.
  var instanceValidator = instances[path.instance];

  if (instanceValidator) {
    var instanceSchema = instanceValidator (path);
    schema = _.extend (schema, instanceSchema);
  }

  return schema;
}

function makeValidationSchema (model, opts) {
  var opts = opts || {};
  var pathPrefix = (opts.pathPrefix + '.') || '';

  var schema = model.schema;
  var validation = {};

  for (var key in schema.paths) {
    if (!schema.paths.hasOwnProperty (key) || key === '__v')
      continue;

    var fullKey = pathPrefix + key;
    validation[fullKey] = makeValidationSchemaForPath (schema.paths[key], {allOptional: opts.allOptional});
  }

  return validation;
}

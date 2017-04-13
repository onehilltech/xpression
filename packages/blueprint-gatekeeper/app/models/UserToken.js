'use strict';

const mongodb   = require ('@onehilltech/blueprint-mongodb')
  , blueprint   = require ('@onehilltech/blueprint')
  , async       = require ('async')
  , Schema      = mongodb.Schema
  , ObjectId    = mongodb.Schema.Types.ObjectId
  , AccessToken = require ('./AccessToken')
  , Account     = require ('./Account')
  , serializer  = require ('../middleware/serializers') (blueprint.app.configs.gatekeeper.token)
  ;

var options     = require ('./commonOptions') ()
  ;

options.discriminatorKey = AccessToken.schema.options.discriminatorKey;

var schema = new Schema ({
  /// Account that owns the token.
  account: {type: ObjectId, ref: Account.modelName, index: true},

  /// Optional refresh token for the user.
  refresh_token: {type: ObjectId, index: true, unique: true, sparse: true}
}, options);

schema.methods.serialize = function (callback) {
  async.parallel ({
    access_token: function (callback) {
      const payload = { scope: this.scope };
      const options = { jwtid: this.id };

      serializer.generateToken (payload, options, callback);
    }.bind (this),

    refresh_token: function (callback) {
      const payload = {  };
      const options = { jwtid: this.refresh_token.toString () };

      serializer.generateToken (payload, options, callback);
    }.bind (this)
  }, callback);
};

schema.methods.serializeSync = function () {
  return {
    access_token: serializer.generateToken ({ scope: this.scope }, { jwtid: this.id }),
    refresh_token: serializer.generateToken ({ }, { jwtid: this.refresh_token.toString () })
  };
};

module.exports = AccessToken.discriminator ('user_token', schema);
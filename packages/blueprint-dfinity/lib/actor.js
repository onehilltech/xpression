/*
 * Copyright (c) 2022 One Hill Technologies, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { BO, computed } = require ('@onehilltech/blueprint');
const Actor = require("@dfinity/agent").Actor;
const { mapValues } = require ('lodash');

/**
 * Make the string definition to the IDL definition.
 *
 * @param IDL            Current IDL version
 * @param definition      String definition
 * @return               IDL definition
 */
function mapDefinition (IDL, definition) {
  return definition.map (term => {
    // Use a simple map. We may want to replace the switch for a function that transforms
    // the text term into to an IDL property.

    switch (term) {
      case 'text': return IDL.Text;
      case 'blob': return IDL.Vec (IDL.Nat8);

      case 'principal': return IDL.Principal;

      case 'nat': return IDL.Nat;
      case 'nat8': return IDL.Nat8;
      case 'nat16': return IDL.Nat16;
      case 'nat32': return IDL.Nat32;
      case 'nat64': return IDL.Nat64;

      case 'int': return IDL.Int;
      case 'int8': return IDL.Int8;
      case 'int16': return IDL.Int16;
      case 'int32': return IDL.Int32;
      case 'int64': return IDL.Int64;

      case 'float32': return IDL.Float32;
      case 'float64': return IDL.Float64;

      case 'bool': return IDL.Bool;
      case 'null': return IDL.Null;

      case 'reserved': return IDL.Reserved;
      case 'empty': return IDL.Empty;

      default:
        // Let's try to handle the more complex type definitions.
        if (term.startsWith ('vec')) {
          const vectorType = term.substring (0, 3);
          return IDL.Vec (mapDefinition (IDL, vectorType));
        }
        else if (term.startsWith ('opt')) {
          const optType = term.substring (0, 3);
          return IDL.Opt (mapDefinition (IDL, optType));
        }
        else {
          throw new Error (`We do not understand '${term}' IDL definition type.`);
        }
    }
  })
}

/**
 * @class Actor
 *
 * The base class for actor objects.
 */
module.exports = BO.extend ({
  /**
   *
   * @return {null}
   */
  idl: computed ({
    get () { return this._idl_ }
  }),

  /**
   * Create an instance of this actor.
   *
   * @param options       Creation options
   */
  createInstance (options) {
    return Actor.createActor (this._createIdlFactory.bind (this), options);
  },

  /**
   * Register an action on the actor.
   *
   * @param name            Name of the action.
   * @param definition       The IDL definition for the action.
   * @private
   */
  defineAction (name, definition) {
    (this._idl_ = this._idl_ || {})[name] = definition;
  },

  /**
   * Create an IDL factory for this actor.
   *
   * @param IDL
   * @returns {*}
   * @private
   */
  _createIdlFactory ({ IDL }) {
    // Map each of the actions defined in this actor to its IDL definition. We then
    // use the collection of definitions to instantiate the actor service.

    const service = mapValues (this._idl_, (definition) => {
      const [input, output, type] = definition;
      const inputDefinition = mapDefinition (IDL, input);
      const outputDefinition = mapDefinition (IDL, output)

      return IDL.Func (inputDefinition, outputDefinition, type);
    });

    return IDL.Service (service);
  },

  /// The actions known to the actor.
  _idl_: null,
});

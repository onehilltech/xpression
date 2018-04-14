/*
 * Copyright (c) 2018 One Hill Technologies, LLC
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

const {expect} = require ('chai');
const ListenerLoader = require ('../../../lib/listener-loader');
const messaging = require ('../../../lib/messaging');
const path = require ('path');

describe ('lib | ListenerLoader', function () {
  describe ('load', function () {
    it ('should load listeners', function () {
      const dirname = path.resolve (__dirname, '../../dummy/app/listeners');

      let app = { messaging: messaging () };
      let loader = new ListenerLoader ({app});

      return loader.load ({dirname}).then (results => {
        expect (results).to.have.property ('blueprint.app.init').that.has.keys (['echo','legacy']);

        expect (app.messaging)
          .to.have.property ('messengers')
          .to.have.property ('_')
          .to.have.property ('_eventListeners')
          .to.have.property ('blueprint.app.init')
          .to.have.property ('_on')
          .to.have.length (2);
      });
    });
  })
});
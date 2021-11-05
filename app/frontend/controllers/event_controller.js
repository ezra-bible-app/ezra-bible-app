/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */


/**
 * This controller implements pub/sub pattern and serves as a broker (event bus) between
 * event emitter (publisher) and event consumer subscriber.
 * https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
 * 
 * @module eventController
 * @category Controller
 */

var messages = {};

function notCreated(event) {
  return !(event in messages);
}

/**
 * @callback SubscribedCallback
 * @param {*} payload Optional payload
 */

/**
 * @typedef {Object} Subscription
 * @property {function} remove Function to call to unsubscribe from the event
 */

/**
 * The function to be called to subscribe to the future events
 * @param {string} event Event key to be notified on publish
 * @param {SubscribedCallback} callback Function to call when when event is published
 * @returns {Subscription} subscription
 */
module.exports.subscribe = function subscribe(event, callback) {
  if (notCreated(event)) {
    messages[event] = [];
  }

  const index = messages[event].push(callback) - 1;
  
  return {
    remove: () => {
      delete messages[event][index];
    }
  };
};

module.exports.publish = function publish(event, payload=undefined) {
  if (notCreated(event)) {
    return;
  }
  
  var results = [];

  for (let subscribedCallback of messages[event]) {
    if (typeof subscribedCallback === 'function') {
      const r = subscribedCallback(payload);
      results.push(r);
    }
  }

  return results;
};

module.exports.publishAsync = async function publishAsync(event, payload=undefined) {

  const promisifiedResults = this.publish(event, payload);

  return await Promise.all(promisifiedResults);
};


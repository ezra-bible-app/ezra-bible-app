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

var subscribers = {};

function notCreated(event) {
  return !(event in subscribers);
}

/**
 * @typedef { "on-start-repo-update" | "on-progress-repo-update" | "on-complete-repo-update" } RepoUpdateEvents
 */
/**
 * @typedef { "on-bible-text-loaded" | "on-bible-translation-changed" } BibleTextEvents
 */
/**
 * @typedef { "on-all-translations-removed" | "on-translation-removed" } ModuleAssistantEvents
 */
/**
 * @typedef { "on-locale-changed" } I18nEvents
 */
/**
 * For consistency event name should be a string in-kebab-case with the following template: "on-[action]-[object]"
 * @typedef { RepoUpdateEvents | BibleTextEvents | ModuleAssistantEvents | I18nEvents } Event
 */

/**
 * @callback SubscribedCallback
 * @param {*} payload Optional payload
 */

/**
 * @typedef {Object} Subscription
 * @property {function} remove Function to call to unsubscribe from the event
 */

/**
 * This function subscribes callback to be called when future events are published
 * @param {Event} event Event key to be notified on publish
 * @param {SubscribedCallback} callback Function to call when when event is published
 * @returns {Subscription} subscription
 */
module.exports.subscribe = function subscribe(event, callback) {
  if (notCreated(event)) {
    subscribers[event] = [];
  }

  const index = subscribers[event].push(callback) - 1;
  
  return {
    remove: () => {
      delete subscribers[event][index];
    }
  };
};

/**
 * This function calls all callbacks that subscribed to the specific event
 * @param {Event} event Event key to be notified
 * @param {*} payload 
 * @returns {[]} Array of callback results
 */
module.exports.publish = function publish(event, payload=undefined) {
  if (notCreated(event)) {
    return;
  }
  
  var results = [];

  for (let subscribedCallback of subscribers[event]) {
    if (typeof subscribedCallback === 'function') {
      const r = subscribedCallback(payload);
      results.push(r);
    }
  }

  return results;
};

/**
 * This function calls all callbacks that subscribed to the specific event and awaits for all callbacks to finish
 * @param {Event} event Event key to be notified
 * @param {*} payload 
 * @returns {Promise<[]>} Promise that resolves to array of callback results
 */
module.exports.publishAsync = async function publishAsync(event, payload=undefined) {

  const promisifiedResults = this.publish(event, payload);

  var results = [];
  
  try {
    // TODO: It's better to use Promise.allSettled()
    results = await Promise.all(promisifiedResults);
  } catch(error) {
    console.log('One of callbacks was rejected:', error);
    console.trace();
  }

  return results;
};

/**
 * This function unsubscribes all callbacks from the specific event
 * @param { Event | RegExp } event Event key to unsubscribe, can be a RegExp
 */
module.exports.unsubscribeAll = function unsubscribeAll(event) {
  if (typeof event === 'string') {
    subscribers[event] = [];

  } else if (event instanceof RegExp) {
    const allEvents = Object.keys(subscribers);
    
    allEvents.forEach(key => {
      if (event.test(key)) {
        subscribers[key] = [];
      }
    });
  }
};
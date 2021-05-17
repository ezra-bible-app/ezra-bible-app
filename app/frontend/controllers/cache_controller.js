
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

const localeController = require("./locale_controller.js");

const CACHE_NAME = 'html-cache';

/** 
 * Function for checking and getting item from the cache
 * @param {string} key
 * @returns {Promise<string|boolean>} cached string or false if cache is invalid or not exists
 */
module.exports.getCachedItem = async function (key) {
  var cached = false;

  const cacheInvalid = await this.isCacheInvalid();

  const hasCached = await ipcSettings.has(key, CACHE_NAME);

  if (!cacheInvalid && hasCached) {
    cached = await ipcSettings.get(key, undefined, CACHE_NAME);
  }

  return cached;
}


module.exports.isCacheInvalid = async function () {
  var lastUsedVersion = await ipcSettings.get('lastUsedVersion', undefined);
  var currentVersion = await ipcGeneral.getAppVersion();

  var lastUsedLanguage = await ipcSettings.get('lastUsedLanguage', undefined);
  var currentLocale = localeController.getLocale();

  /*
  console.log("Last version: " + lastUsedVersion);
  console.log("Current version: " + currentVersion);
  console.log("Last used language: " + lastUsedLanguage);
  console.log("Current language: " + currentLanguage);
  */

  return currentVersion != lastUsedVersion || currentLanguage != lastUsedLanguage;
}

module.exports.isCacheOutdated = async function () {
  var tabConfigTimestamp = await ipcSettings.get('tabConfigurationTimestamp', null, CACHE_NAME);

  if (tabConfigTimestamp === null) {
    return false;
  }

  tabConfigTimestamp = new Date(tabConfigTimestamp);

  var dbUpdateTimestamp = new Date(await ipcDb.getLastMetaRecordUpdate());

  if (dbUpdateTimestamp != null && dbUpdateTimestamp.getTime() > tabConfigTimestamp.getTime()) {
    return true;
  } else {
    return false;
  }
}


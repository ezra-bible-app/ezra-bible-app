
/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const i18nController = require("./i18n_controller.js");

const CACHE_NAME = 'html-cache';

/** 
 * Function for checking and getting item from the cache
 * @param {string} key cache key
 * @param {boolean | any} defaultValue default value to return if no cache on that key or cache is invalid
 * @param {boolean} shouldCheckIfInvalid should it check for validity of the cache
 * @returns {Promise<string|boolean>} cached string or false/default value if cache is invalid or not exists
 */
module.exports.getCachedItem = async function (key, defaultValue=false, shouldCheckIfInvalid=true) {
  var cached = defaultValue;

  const isCacheInvalid = shouldCheckIfInvalid && await this.isCacheInvalid();

  if (!isCacheInvalid && (await this.hasCachedItem(key))) {
    cached = await ipcSettings.get(key, defaultValue, CACHE_NAME);
  }

  return cached;
};

module.exports.hasCachedItem = async function(key) {
  return await ipcSettings.has(key, CACHE_NAME);
};

module.exports.setCachedItem = async function (key, value) {
  await ipcSettings.set(key, value, CACHE_NAME);

  if (key === 'tabConfiguration') {
    const currentTime = new Date(Date.now());
    await ipcSettings.set('tabConfigurationTimestamp', currentTime, CACHE_NAME);
  }

};

module.exports.deleteCache = async function (key) {
  await ipcSettings.delete(key, CACHE_NAME);
};

module.exports.isCacheInvalid = async function () {
  let lastUsedVersion = await ipcSettings.get('lastUsedVersion', undefined);
  let currentVersion = await ipcGeneral.getAppVersion();

  let cacheLocale = await ipcSettings.get('cacheLocale', undefined, CACHE_NAME);
  let currentLocale = i18nController.getLocale();

  let lastDropboxSyncResult = await ipcSettings.get('lastDropboxSyncResult', '');

  /*console.log("Last version: " + lastUsedVersion);
  console.log("Current version: " + currentVersion);
  console.log("Last used language: " + cacheLocale);
  console.log("Current language: " + currentLocale);*/

  return currentVersion != lastUsedVersion || currentLocale != cacheLocale || lastDropboxSyncResult == 'DOWNLOAD';
};

module.exports.isCacheOutdated = async function () {
  var tabConfigTimestamp = await this.getCachedItem('tabConfigurationTimestamp', null, false);

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
};

//FIXME: if this is used only for checking cache validity store it in cache file and move it to appController
module.exports.saveLastUsedVersion = async function () {
  await ipcSettings.storeLastUsedVersion();
};

module.exports.saveLastLocale = async function () {
  await ipcSettings.set('cacheLocale', i18nController.getLocale(), CACHE_NAME);
};
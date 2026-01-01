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

const IpcRenderer = require('./ipc_renderer.js');
const i18nController = require('../controllers/i18n_controller.js');

class IpcGeneral {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
    this._cachedAppVersion = null;
  }

  async initPersistentIpc(androidVersion=undefined) {
    var timeoutMs = 15000;
    console.time('initPersistentIpc');
    var result = await this._ipcRenderer.callWithTimeout('general_initPersistentIpc', timeoutMs, androidVersion);
    console.timeEnd('initPersistentIpc');
    return result;
  }

  async initDatabase(androidVersion=undefined, connectionType=undefined) {
    var timeoutMs = 15000;
    console.time('initDatabase');
    var result = await this._ipcRenderer.callWithTimeout('general_initDatabase', timeoutMs, androidVersion, connectionType);
    console.timeEnd('initDatabase');
    return result;
  }

  async setConnectionType(connectionType) {
    var result = await this._ipcRenderer.call('general_setConnectionType', connectionType);
    return result;
  }

  async getMajorOsVersion() {
    return await this._ipcRenderer.call('general_getMajorOsVersion');
  }

  async getAppVersion() {
    if (this._cachedAppVersion == null) {
      this._cachedAppVersion = await this._ipcRenderer.call('general_getAppVersion');
    }

    return this._cachedAppVersion;
  }

  async isTest() {
    return await this._ipcRenderer.call('general_isTest');
  }

  async getSearchStatisticChartData(bibleTranslationId, bookList, bibleBookStats, localeCode=i18nController.getLocale()) {
    return await this._ipcRenderer.call('general_getSearchStatisticChartData', bibleTranslationId, localeCode, bookList, bibleBookStats);
  } 

  async getBookNames(bibleBooks, localeCode=i18nController.getLocale()) {
    return await this._ipcRenderer.call('general_getBookNames', bibleBooks, localeCode);
  }

  async getSystemFonts() {
    return await this._ipcRenderer.call('general_getSystemFonts');
  }

  /**
   * This can be used to check which functions are called how often as a basis for performance optimization.
   * Returns an object where the keys are function names and values call counts.
   */
  async getIpcCallStats() {
    return await this._ipcRenderer.call('general_getIpcCallStats');
  }

  /**
   * Resets the IPC call statistics.
   */
  async resetIpcCallStats() {
    return await this._ipcRenderer.call('general_resetIpcCallStats');
  }

  async setSendCrashReports(sendCrashReports) {
    return await this._ipcRenderer.call('general_setSendCrashReports', sendCrashReports);
  }
}

module.exports = IpcGeneral;

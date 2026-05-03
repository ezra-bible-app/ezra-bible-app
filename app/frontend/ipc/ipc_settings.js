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

class IpcSettings {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
    this._cache = {};
  }

  async preloadAll(configName='config') {
    if (platformHelper.isTest()) {
      return;
    }

    const allSettings = await this._ipcRenderer.call('settings_getAll', configName);
    if (allSettings !== null && allSettings !== undefined) {
      this._cache[configName] = allSettings;
    }
  }

  async set(settingsKey, settingsValue, configName='config') {
    if (this._cache[configName] !== undefined) {
      this._cache[configName][settingsKey] = settingsValue;
    }
    return await this._ipcRenderer.call('settings_set', configName, settingsKey, settingsValue);
  }

  async get(settingsKey, defaultValue=false, configName='config') {
    if (platformHelper.isTest()) {
      return defaultValue;
    }

    if (this._cache[configName] !== undefined) {
      const cachedValue = this._cache[configName][settingsKey];
      return cachedValue !== undefined ? cachedValue : defaultValue;
    }

    return await this._ipcRenderer.call('settings_get', configName, settingsKey, defaultValue);
  }

  async has(settingsKey, configName='config') {
    if (this._cache[configName] !== undefined) {
      return Object.prototype.hasOwnProperty.call(this._cache[configName], settingsKey);
    }
    return await this._ipcRenderer.call('settings_has', configName, settingsKey);
  }

  async delete(settingsKey, configName='config') {
    if (this._cache[configName] !== undefined) {
      delete this._cache[configName][settingsKey];
    }
    return await this._ipcRenderer.call('settings_delete', configName, settingsKey);
  }

  async storeLastUsedVersion() {
    return await this._ipcRenderer.call('settings_storeLastUsedVersion');
  }

  async getConfigFilePath() {
    return await this._ipcRenderer.call('settings_getConfigFilePath');
  }
}

module.exports = IpcSettings;
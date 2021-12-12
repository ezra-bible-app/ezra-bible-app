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

const IpcMain = require('./ipc_main.js');
const PlatformHelper = require('../../lib/platform_helper.js');
const Conf = require('conf');
const fs = require('fs-extra');

class IpcSettingsHandler {
  constructor(androidVersion=undefined) {
    this.platformHelper = new PlatformHelper();
    this._ipcMain = new IpcMain();
    this._isElectron = this.platformHelper.isElectron();
    this._isCordova = this.platformHelper.isCordova();
    this._isTest = this.platformHelper.isTest();
    this._androidVersion = androidVersion;
    this._configurations = {};
    this.initIpcInterface();
  }

  getConfig(configName='config') {
    if (this._configurations[configName] === undefined) {

      var configOptions = {
        projectSuffix: '',
        configName: configName,
      };

      const userDataPath = this.platformHelper.getUserDataPath(false, this._androidVersion);
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }

      configOptions['cwd'] = userDataPath;
      this._configurations[configName] = new Conf(configOptions);

      console.log('Using settings file ' + this._configurations[configName].path);
    }

    return this._configurations[configName];
  }

  initIpcInterface() {
    this._ipcMain.add('settings_set', (configName, settingsKey, settingsValue) => {
      var config = this.getConfig(configName);

      if (this.platformHelper.isDebug() && settingsKey !== 'tabConfiguration' && settingsKey !== 'bookSelectionMenuCache') {
        console.log(`IpcSettingsHandler: Setting ${settingsKey} to ${settingsValue}`);
      }

      return config.set(settingsKey, settingsValue);
    });

    this._ipcMain.add('settings_get', (configName, settingsKey, defaultValue) => {
      var config = this.getConfig(configName);
      return config.get(settingsKey, defaultValue);
    });

    this._ipcMain.add('settings_has', (configName, settingsKey) => {
      var config = this.getConfig(configName);
      return config.has(settingsKey);
    });

    this._ipcMain.add('settings_delete', (configName, settingsKey) => {
      var config = this.getConfig(configName);
      return config.delete(settingsKey);
    });

    this._ipcMain.add('settings_storeLastUsedVersion', () => {
      var config = this.getConfig();
      var pjson = require('../../../package.json');
      var lastUsedVersion = pjson.version;

      if (this.platformHelper.isDebug()) {
        console.log(`IpcSettingsHandler: Setting lastUsedVersion to ${lastUsedVersion}`);
      }

      return config.set('lastUsedVersion', lastUsedVersion);
    });

    this._ipcMain.add('settings_getConfigFilePath', () => {
      return this.getConfig().path;
    });

    this._ipcMain.add('settings_storeNightModeCss', () => {
      var config = this.getConfig();
      var useNightMode = config.get('useNightMode', false);
      var userDataPath = this.platformHelper.getUserDataPath();
      var fileName = path.join(userDataPath, 'theme.css');

      var bgColor = 'null';
      if (useNightMode) {
        bgColor = '#1e1e1e';
      } else {
        bgColor = 'white';
      }

      var fileContent = `
        body {
          background-color: ${bgColor};
        }
      `;

      const fs = require('fs');
      var ret = null;

      try {
        ret = fs.writeFileSync(fileName, fileContent);
      } catch (e) {
        console.error('Could not write to ' + fileName);
      }

      return ret;
    });
  }
}

module.exports = IpcSettingsHandler;

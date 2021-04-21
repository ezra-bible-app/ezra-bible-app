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
  constructor() {
    this.platformHelper = new PlatformHelper();
    this._ipcMain = new IpcMain();
    this._isElectron = this.platformHelper.isElectron();
    this._isCordova = this.platformHelper.isCordova();
    this._isTest = this.platformHelper.isTest();
    this._configurations = {};
    this.initIpcInterface();
  }

  migrate(configName, configOptions) {
    if (configName == 'config') {
      var configPath = this._configurations[configName].path;
      var oldConfigPath = null;

      if (this.platformHelper.isWin()) {
        oldConfigPath = configPath.replace('Ezra Bible App', 'ezra-project\\Config');
      } else {
        oldConfigPath = configPath.replace('ezra-bible-app', 'ezra-project');
      }

      const migratedOption = 'migratedToEzraBibleApp';
      var configMigrated = this._configurations[configName].has(migratedOption);
      
      if (!configMigrated && fs.existsSync(oldConfigPath)) {
        console.log(`Found old configuration for Ezra Bible App at ${oldConfigPath}... moving it to the new directory ${configPath}.`);

        try {
          fs.moveSync(oldConfigPath, configPath, { overwrite: true });

          console.log("Re-loading configuration based on moved file");
          this._configurations[configName] = new Conf(configOptions);
        } catch (e) {
          console.error(`Could not migrate configuration from ${oldConfigPath} to ${configPath}!`);
        }

        // We set this flag in any case (whether or not the operation above was successfull)
        this._configurations[configName].set(migratedOption, true);
      }
    }
  }

  getConfig(configName='config') {
    if (this._configurations[configName] === undefined) {

      var configOptions = {
        projectSuffix: '',
        configName: configName,
      };

      configOptions['cwd'] = this.platformHelper.getUserDataPath();
      this._configurations[configName] = new Conf(configOptions);
      this.migrate(configName, configOptions);

      console.log('Using settings file ' + this._configurations[configName].path);
    }

    return this._configurations[configName];
  }

  initIpcInterface() {
    this._ipcMain.add('settings_set', (configName, settingsKey, settingsValue) => {
      var config = this.getConfig(configName);
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
      return config.set('lastUsedVersion', lastUsedVersion);
    });

    this._ipcMain.add('settings_storeLastUsedLanguage', (lang) => {
      var config = this.getConfig();
      return config.set('lastUsedLanguage', lang);
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

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

const PlatformHelper = require('../../lib/platform_helper.js');
const IpcI18nHandler = require('./ipc_i18n_handler.js');
const IpcNsiHandler = require('./ipc_nsi_handler.js');
const IpcDbHandler = require('./ipc_db_handler.js');
const IpcGeneralHandler = require('./ipc_general_handler.js');
const IpcSettingsHandler = require('./ipc_settings_handler.js');

class IPC {
  constructor() {
    if (global.ipcInitialized === undefined) {
      global.ipcInitialized = false;
    }

    if (global.nonPersistentIpcInitialized === undefined) {
      global.nonPersistentIpcInitialized = false;
    }

    this.platformHelper = new PlatformHelper();

    if (this.platformHelper.isElectron()) {
      // For Electron we initialize the settings handler at construction.
      // This is not possible for Cordova, because there we cannot be sure whether we have write permissions at this point.
      // So on Cordova the settings handler is initialized in the init method (see below!).
      this.ipcSettingsHandler = new IpcSettingsHandler();
    }
  }

  // On Android we initialize in two steps, first the non persistent part (before permissions are available).
  // After the user has enabled write permissions, the initialization of persistent stuff
  // (settings, node-sword-interface) is handled.
  initNonPersistentIpc() {
    if (!global.nonPersistentIpcInitialized) {
      global.nonPersistentIpcInitialized = true;
      global.ipcI18nHandler = new IpcI18nHandler();
      global.ipcGeneralHandler = new IpcGeneralHandler();
    }
  }

  async init(isDebug, electronMainWindow=undefined) {
    if (!global.ipcInitialized) {
      global.ipcInitialized = true;

      this.initNonPersistentIpc();

      if (this.platformHelper.isCordova()) {
        // In case of Electron this has already been initalized before (see c'tor), but for Cordova we still need to do it!
        this.ipcSettingsHandler = new IpcSettingsHandler();
      }

      global.ipcNsiHandler = new IpcNsiHandler();

      if (this.platformHelper.isElectron()) {
        ipcNsiHandler.setMainWindow(electronMainWindow);

        await this.initDatabase(isDebug);
      }
    }
  }

  async initDatabase(isDebug) {
    global.ipcDbHandler = new IpcDbHandler();
    await ipcDbHandler.initDatabase(isDebug);
  }
}

module.exports = IPC;

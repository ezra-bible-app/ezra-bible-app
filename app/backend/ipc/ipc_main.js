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

class IpcMain {
  constructor() {
    this._mainWindow = null;
    var platformHelper = new PlatformHelper();
    this._isElectron = platformHelper.isElectron();
    this._isCordova = platformHelper.isCordova();
    this._callCounters = {};
    this._showDebugOutput = false;
    this._registeredHandlers = [];

    if (this._isElectron) {

      const { ipcMain } = require('electron');
      this._electronIpcMain = ipcMain;

    } else if (this._isCordova) {

      this._cordova = global.cordova;
    }
  }

  setMainWindow(mainWindow) {
    this._mainWindow = mainWindow;
  }

  add(functionName, callbackFunction) {
    if (this._registeredHandlers.includes(functionName)) {
      return;
    }

    this._registeredHandlers.push(functionName);
    this._callCounters[functionName] = 0;

    if (this._isElectron) {

      return this._electronIpcMain.handle(functionName, async (event, ...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) {
          console.log(functionName + ' ' + args + ' ' + this._callCounters[functionName]);
        }
        var returnValue = await callbackFunction(...args);
        return returnValue;
      });

    } else if (this._isCordova) {

      return this._cordova.channel.on(functionName, async (...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) {
          console.log(functionName + ' ' + args + ' ' + this._callCounters[functionName]);
        }
        var returnValue = await callbackFunction(...args);
        this._cordova.channel.post(functionName, returnValue);
      });

    }
  }

  addWithProgressCallback(functionName, callbackFunction, progressChannel) {
    if (this._registeredHandlers.includes(functionName)) {
      return;
    }

    this._registeredHandlers.push(functionName);
    this._callCounters[functionName] = 0;

    if (this._isElectron) {

      return this._electronIpcMain.handle(functionName, async (event, ...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) {
          console.log(functionName + ' ' + this._callCounters[functionName]);
        }
        return callbackFunction((progress) => { 
          this.message(progressChannel, progress); 
        }, ...args);
      });

    } else if (this._isCordova) {

      return this._cordova.channel.on(functionName, async (...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) {
          console.log(functionName + ' ' + this._callCounters[functionName]);
        }
        var returnValue = await callbackFunction((progress) => {
          this.message(progressChannel, progress);
        }, ...args);
        this._cordova.channel.post(functionName, returnValue);
      });

    }
  }

  addSync(functionName, callbackFunction) {
    if (this._registeredHandlers.includes(functionName)) {
      return;
    }

    this._registeredHandlers.push(functionName);
    this._callCounters[functionName] = 0;

    if (this._isElectron) {
      return this._electronIpcMain.on(functionName, async (event, ...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) { console.log(functionName + ' ' + this._callCounters[functionName]); }
        var returnValue = await callbackFunction(...args);
        event.returnValue = returnValue;
      });
    } else if (this._isCordova) {
      // TODO
    }
  }

  async message(channel, message) {
    if (this._isElectron) {
      return this.electronIpcMessage(channel, message);
    } else if (this._isCordova) {
      return this.cordovaIpcMessage(channel, message);
    }
  }

  async electronIpcMessage(channel, message) {
    if (this._mainWindow != null) {
      return this._mainWindow.webContents.send(channel, message);
    }
  }

  async cordovaIpcMessage(channel, message) {
    return this._cordova.channel.post(channel, message);
  }
}

module.exports = IpcMain;
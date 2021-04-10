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

class IpcRenderer {
  constructor() {
    var platformHelper = new PlatformHelper();
    this._isElectron = platformHelper.isElectron();
    this._isCordova = platformHelper.isCordova();

    if (this._isElectron) {
      const { ipcRenderer } = require('electron');
      this._electronIpcRenderer = ipcRenderer;
    } else if (this._isCordova) {
      this.returnValues = {};
      this.waitCounters = {};
    }
  }

  async call(functionName, ...args) {
    if (this._isElectron) {
      return this.electronIpcCall(functionName, ...args);
    } else if (this._isCordova) {
      return this.cordovaIpcCall(functionName, undefined, ...args);
    }
  }

  async callWithTimeout(functionName, timeoutMs, ...args) {
    if (this._isElectron) {
      return this.electronIpcCall(functionName, ...args);
    } else if (this._isCordova) {
      return this.cordovaIpcCall(functionName, timeoutMs, ...args);
    }
  }

  async callWithProgressCallback(functionName, callbackChannel, callbackFunction, timeoutMs, ...args) {
    if (callbackFunction !== undefined) {
      if (this._isElectron) {
        this.addElectronListenerWithCallback(callbackChannel, callbackFunction);
      } else if (this._isCordova) {
        this.addCordovaListenerWithCallback(callbackChannel, callbackFunction);
      }
    }

    if (this._isElectron) {
      return this.electronIpcCall(functionName, ...args);
    } else if (this._isCordova) {
      return this.cordovaIpcCall(functionName, timeoutMs, ...args);
    }
  }

  callSync(functionName, ...args) {
    if (this._isElectron) {
      return this.electronIpcCallSync(functionName, ...args);
    } else if (this._isCordova) {
      return this.cordovaIpcCallSync(functionName, ...args);
    }
  }

  async electronIpcCall(functionName, ...args) {
    return this._electronIpcRenderer.invoke(functionName, ...args);
  }

  async cordovaIpcCall(functionName, timeoutMs, ...args) {
    if (!this.returnValues.hasOwnProperty(functionName)) {
      this.registerNodeCallback(functionName);
    }

    this.returnValues[functionName] = undefined;
    this.waitCounters[functionName] = 0;
    nodejs.channel.post(functionName, ...args);

    var result = null;

    try {
      result = await this.getNodeResponse(functionName, timeoutMs);
    } catch (error) {
      console.error("Did not get node response for " + functionName);
    }

    return result;
  }

  electronIpcCallSync(functionName, ...args) {
    return this._electronIpcRenderer.sendSync(functionName, ...args);
  }

  cordovaIpcCallSync(functionName, ...args) {
    // TODO
  }

  addElectronListenerWithCallback(channel, callbackFunction) {
    this._electronIpcRenderer.on(channel, (event, message) => {
      if (callbackFunction !== undefined) {
        callbackFunction(message);
      }
    });
  }

  addCordovaListenerWithCallback(channel, callbackFunction) {
    nodejs.channel.on(channel, (message) => {
      if (callbackFunction !== undefined) {
        callbackFunction(message);
      }
    });
  }

  // Cordova specific method
  registerNodeCallback(functionName) {
    nodejs.channel.on(functionName, (returnValue) => {
      this.returnValues[functionName] = returnValue;
    });
  }

  // Cordova specific method
  waitForNodeResponse(functionName, timeoutMs, resolve, reject) {
    this.waitCounters[functionName] += 1;
    var returnValue = this.returnValues[functionName];

    const cycleTimeMs = 25;
    var timeoutCycles = 160; // 4s

    if (timeoutMs !== undefined) {
      timeoutCycles = timeoutMs / cycleTimeMs;
    }

    if (returnValue === undefined) {
      if (this.waitCounters[functionName] > timeoutCycles) {
        reject(null);
      } else {
        setTimeout(() => {
          //console.log('Waiting for node response for ' + functionName + ' ...');
          this.waitForNodeResponse(functionName, timeoutMs, resolve, reject);
        }, cycleTimeMs);
      }
    } else {
      resolve(returnValue);
    }
  }

  // Cordova specific method
  getNodeResponse(functionName, timeoutMs) {
    return new Promise((resolve, reject) => {
      this.waitForNodeResponse(functionName, timeoutMs, resolve, reject);
    });
  }
}

module.exports = IpcRenderer;
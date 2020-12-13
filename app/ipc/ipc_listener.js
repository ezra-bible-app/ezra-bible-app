const PlatformDetector = require('./platform_detector.js');

class IpcListener {
  constructor() {
    var platformDetector = new PlatformDetector();
    this._isElectron = platformDetector.isElectron();
    this._isCordova = platformDetector.isCordova();

    if (this._isElectron) {
      const { ipcMain } = require('electron');
      this._electronIpcMain = ipcMain;
    }
  }

  addCallback(functionName, callbackFunction) {
    if (this._isElectron) {
      return this._electronIpcMain.handle(functionName, async (event, ...args) => {
        return await callbackFunction(...args);
      });
    } else if (this._isCordova) {
      // TODO
    }
  }
}

module.exports = IpcListener;
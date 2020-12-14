const PlatformDetector = require('./platform_detector.js');

class IpcRenderer {
  constructor() {
    var platformDetector = new PlatformDetector();
    this._isElectron = platformDetector.isElectron();
    this._isCordova = platformDetector.isCordova();

    if (this._isElectron) {
      const { ipcRenderer } = require('electron');
      this._electronIpcRenderer = ipcRenderer;
    }
  }

  async call(functionName, ...args) {
    if (this._isElectron) {
      return this.electronIpcCall(functionName, ...args);
    } else if (this._isCordova) {
      return this.cordovaIpcCall(functionName, ...args);
    }
  }

  async callWithProgressCallback(functionName, callbackChannel, callbackFunction) {
    this.addElectronListenerWithCallback(callbackChannel, callbackFunction);

    if (this._isElectron) {
      return this.electronIpcCall(functionName);
    } else if (this._isCordova) {
      return this.cordovaIpcCall(functionName);
    }
  }

  async electronIpcCall(functionName, ...args) {
    return this._electronIpcRenderer.invoke(functionName, ...args);
  }

  async cordovaIpcCall(functionName, ...args) {
    // TODO
  }

  addElectronListenerWithCallback(channel, callbackFunction) {
    this._electronIpcRenderer.on(channel, (event, message) => {
      callbackFunction(message);
    });
  }
}

module.exports = IpcRenderer;
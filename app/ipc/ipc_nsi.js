const { ipcRenderer } = require('electron');

class IpcNsi {
  constructor() {
  }

  async getAllLocalModules() {
    var modules = await ipcRenderer.invoke('nsi_getAllLocalModules');
    return modules;
  }
}

module.exports = IpcNsi;
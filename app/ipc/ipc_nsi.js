const { ipcRenderer } = require('electron');

class IpcNsi {
  constructor() {
  }

  async getAllLocalModules(moduleType='BIBLE') {
    var modules = await ipcRenderer.invoke('nsi_getAllLocalModules', moduleType);
    return modules;
  }
}

module.exports = IpcNsi;
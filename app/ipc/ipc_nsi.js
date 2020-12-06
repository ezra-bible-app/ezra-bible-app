const { ipcRenderer } = require('electron');

class IpcNsi {
  constructor() {
  }

  async getAllLocalModules(moduleType='BIBLE') {
    var modules = await ipcRenderer.invoke('nsi_getAllLocalModules', moduleType);
    return modules;
  }

  async getBookText(moduleCode, bookCode, startVerseNr=-1, verseCount=-1) {
    var bookText = await ipcRenderer.invoke('nsi_getBookText', moduleCode, bookCode, startVerseNr, verseCount);
    return bookText;
  }
}

module.exports = IpcNsi;
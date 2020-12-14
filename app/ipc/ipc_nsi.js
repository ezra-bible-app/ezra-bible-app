const IpcRenderer = require('./ipc_renderer.js');

class IpcNsi {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
  }

  async getAllLocalModules(moduleType='BIBLE') {
    var modules = await this._ipcRenderer.call('nsi_getAllLocalModules', moduleType);
    return modules;
  }

  async getBookText(moduleCode, bookCode, startVerseNr=-1, verseCount=-1) {
    var bookText = await this._ipcRenderer.call('nsi_getBookText', moduleCode, bookCode, startVerseNr, verseCount);
    return bookText;
  }

  async repositoryConfigExisting() {
    return await this._ipcRenderer.call('nsi_repositoryConfigExisting');
  }

  async updateRepositoryConfig(progressCallback) {
    return await this._ipcRenderer.callWithProgressCallback('nsi_updateRepositoryConfig',
                                                            'nsi_updateRepoConfigProgress',
                                                            progressCallback);
  }
}

module.exports = IpcNsi;
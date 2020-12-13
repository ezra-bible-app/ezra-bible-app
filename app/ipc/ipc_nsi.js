const IpcBroker = require('./ipc_broker.js');

class IpcNsi {
  constructor() {
    this._ipcBroker = new IpcBroker();
  }

  async getAllLocalModules(moduleType='BIBLE') {
    var modules = await this._ipcBroker.call('nsi_getAllLocalModules', moduleType);
    return modules;
  }

  async getBookText(moduleCode, bookCode, startVerseNr=-1, verseCount=-1) {
    var bookText = await this._ipcBroker.call('nsi_getBookText', moduleCode, bookCode, startVerseNr, verseCount);
    return bookText;
  }

  async repositoryConfigExisting() {
    return await this._ipcBroker.call('nsi_repositoryConfigExisting');
  }

  async updateRepositoryConfig(progressCallback) {
    return await this._ipcBroker.callWithProgressCallback('nsi_updateRepositoryConfig',
                                                          'update-repo-config-progress',
                                                          progressCallback);
  }
}

module.exports = IpcNsi;
const { ipcRenderer } = require('electron');
const IpcRenderer = require('./ipc_renderer.js');

class IpcDb {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
  }

  async createNewTag(newTagTitle, type) {
    return await this._ipcRenderer.call('db_createNewTag', newTagTitle, type);
  }

  async removeTag(id) {
    return await this._ipcRenderer.call('db_removeTag', id);
  }
}

module.exports = IpcDb;
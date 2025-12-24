
class DropboxHandler {
  constructor() {
    this._config = global.ipc.ipcSettingsHandler.getConfig();
  }
}

module.exports = DropboxHandler;
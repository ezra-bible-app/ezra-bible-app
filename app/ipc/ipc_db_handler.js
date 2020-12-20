const { app, ipcMain } = require('electron');
const IpcMain = require('./ipc_main.js');

let dbHelper = null;
let dbDir = null;

class IpcDbHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this._tagsPersistanceController = null;

    this.initIpcInterface();
  }

  async initDatabase() {
    const DbHelper = require.main.require('./app/helpers/db_helper.js');
    const userDataDir = app.getPath('userData');
    dbHelper = new DbHelper(userDataDir);
    dbDir = dbHelper.getDatabaseDir();

    await dbHelper.initDatabase(dbDir);
    global.models = require.main.require('./app/database/models')(dbDir);

    const TagsPersistanceController = require.main.require('./app/controllers/tags_persistance_controller.js');
    this._tagsPersistanceController = new TagsPersistanceController(global.models);
  }

  initIpcInterface() {
    this._ipcMain.add('db_createNewTag', async (newTagTitle, type) => {
      return await this._tagsPersistanceController.create_new_tag(newTagTitle, type);
    });

    this._ipcMain.add('db_removeTag', async (id) => {
      return await this._tagsPersistanceController.destroy_tag(id);
    });

    this._ipcMain.add('db_updateTagsOnVerses', async (tagId, verseObjects, versification, action) => {
      return await this._tagsPersistanceController.update_tags_on_verses(tagId, verseObjects, versification, action);
    });
  }
}

module.exports = IpcDbHandler;
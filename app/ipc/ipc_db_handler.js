const { app, ipcMain } = require('electron');

let dbHelper = null;
let dbDir = null;

class IpcDbHandler {
  constructor() {
    this._tagsPersistanceController = null;
    this._models = null;
  }

  async init() {
    const DbHelper = require.main.require('./app/helpers/db_helper.js');
    const userDataDir = app.getPath('userData');
    dbHelper = new DbHelper(userDataDir);
    dbDir = dbHelper.getDatabaseDir();

    await dbHelper.initDatabase(dbDir);
    this._models = require.main.require('./app/database/models')(dbDir);

    const TagsPersistanceController = require.main.require('./app/controllers/tags_persistance_controller.js');
    this._tagsPersistanceController = new TagsPersistanceController(this._models);

    this._db_createNewTag_counter = 0;
    ipcMain.handle('db_createNewTag', async (event, new_tag_title, type) => {
      this._db_createNewTag_counter++;
      console.log('db_createNewTag ' + this._db_createNewTag_counter);
      var newTag = await this._tagsPersistanceController.create_new_tag(new_tag_title, type);
      return newTag;
    });
  }
}

module.exports = IpcDbHandler;
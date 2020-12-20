const { ipcRenderer } = require('electron');
const IpcRenderer = require('./ipc_renderer.js');

class IpcDb {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
  }

  async createNewTag(newTagTitle, type) {
    var new_tag = await this._ipcRenderer.call('db_createNewTag', newTagTitle, type);
    tags_controller.tag_store.resetBookTagStatistics();

    await tags_controller.update_tag_list(app_controller.tab_controller.getTab().getBook(), true);
    await app_controller.tag_selection_menu.requestTagsForMenu();

    var current_timestamp = new Date(Date.now()).getTime();
    tags_controller.tag_store.updateTagTimestamp(new_tag.id, current_timestamp);
    await tags_controller.tag_store.updateLatestAndOldestTagData();

    await tags_controller.update_tags_view_after_verse_selection(true);
  }
}

module.exports = IpcDb;
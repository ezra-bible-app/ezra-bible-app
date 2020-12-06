const { ipcRenderer } = require('electron');

class IpcDb {
  constructor() {}

  async createNewTag(newTagTitle, type) {
    var new_tag = null;

    ipcRenderer.invoke('db_createNewTag', newTagTitle, type).then((tag) => {
      new_tag = tag;
      tags_controller.tag_store.resetBookTagStatistics();
      return tags_controller.update_tag_list(app_controller.tab_controller.getTab().getBook(), true);
    }).then(() => {
      return app_controller.tag_selection_menu.requestTagsForMenu();
    }).then(() => {
      var current_timestamp = new Date(Date.now()).getTime();
      tags_controller.tag_store.updateTagTimestamp(new_tag.id, current_timestamp);
      return tags_controller.tag_store.updateLatestAndOldestTagData();
    }).then(() => {
      return tags_controller.update_tags_view_after_verse_selection(true);
    });
  }
}

module.exports = IpcDb;
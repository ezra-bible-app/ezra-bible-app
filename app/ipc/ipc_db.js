const { ipcRenderer } = require('electron');
const IpcRenderer = require('./ipc_renderer.js');
const VerseBox = require("../ui_models/verse_box.js");

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

  assignTagToVerses(tagId, verseBoxes) {
    this.updateTagsOnVerses(tagId, verseBoxes, "add");
  }

  async removeTagFromVerses(tagId, verseBoxes) {
    await this.updateTagsOnVerses(tagId, verseBoxes, "remove");
  }

  async updateTagsOnVerses(tagId, verseBoxes, action) {
    var increment = (action == "add" ? true : false);
    tags_controller.update_tag_verse_count(tagId, verseBoxes, increment);

    var verseObjects = [];

    for (var verseBox of verseBoxes) {
      var verseBoxModel = new VerseBox(verseBox);
      var verseObject = verseBoxModel.getVerseObject();
      verseObjects.push(verseObject);
    }

    var translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var versification = await app_controller.translation_controller.getVersification(translationId);

    return await this._ipcRenderer.call('db_updateTagsOnVerses', tagId, verseObjects, versification, action);
  }

  async getTagCount() {
    return await this._ipcRenderer.call('db_getTagCount');
  }

  async getAllTags(bibleBookId=0, lastUsed=false, onlyStats=false) {
    return await this._ipcRenderer.call('db_getAllTags', bibleBookId, lastUsed, onlyStats);
  }

  async getBookTitleTranslation(shortName) {
    return await this._ipcRenderer.call('db_getBookTitleTranslation', shortName, i18n.language);
  }

  async isNtBook(bookCode) {
    return await this._ipcRenderer.call('db_isNtBook', bookCode);
  }

  async isOtBook(bookCode) {
    return await this._ipcRenderer.call('db_isOtBook', bookCode);
  }
}

module.exports = IpcDb;
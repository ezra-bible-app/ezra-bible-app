/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const IpcRenderer = require('./ipc_renderer.js');
const VerseBox = require('../ui_models/verse_box.js');
const PlatformHelper = require('../../lib/platform_helper.js');
const i18nController = require('../controllers/i18n_controller.js');

class IpcDb {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
    this._platformHelper = new PlatformHelper();
    this._isCordova = this._platformHelper.isCordova();
    this._getAllTagsCounter = 0;
    this._cachedBookTitleTranslations = {};
  }

  async closeDatabase() {
    return await this._ipcRenderer.call('db_close');
  }

  async getDatabasePath() {
    return await this._ipcRenderer.call('db_getDatabasePath');
  }

  async createNewTag(newTagTitle) {
    return await this._ipcRenderer.call('db_createNewTag', newTagTitle);
  }

  async removeTag(id) {
    return await this._ipcRenderer.call('db_removeTag', id);
  }

  async updateTag(id, newTitle) {
    return await this._ipcRenderer.call('db_updateTag', id, newTitle).then((result) => {
      if (result.success) {
        tags_controller.renameTagInView(id, newTitle);
      }

      return result;
    });
  }

  async assignTagToVerses(tagId, verseBoxes) {
    return await this.updateTagsOnVerses(tagId, verseBoxes, "add");
  }

  async removeTagFromVerses(tagId, verseBoxes) {
    return await this.updateTagsOnVerses(tagId, verseBoxes, "remove");
  }

  async updateTagsOnVerses(tagId, verseBoxes, action) {
    var increment = (action == "add" ? true : false);
    tags_controller.updateTagVerseCount(tagId, verseBoxes, increment);

    var verseObjects = [];

    for (var verseBox of verseBoxes) {
      var verseBoxModel = new VerseBox(verseBox);
      var verseObject = verseBoxModel.getVerseObject();
      verseObjects.push(verseObject);
    }

    var translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    var versification = await swordModuleHelper.getVersification(translationId);

    return await this._ipcRenderer.call('db_updateTagsOnVerses', tagId, verseObjects, versification, action);
  }

  async getTagCount() {
    return await this._ipcRenderer.call('db_getTagCount');
  }

  async getAllTags(bibleBookId=0, lastUsed=false, onlyStats=false) {
    var getAllTagsCounter = null;
    
    if (this._isCordova) {
      this._getAllTagsCounter += 1;
      getAllTagsCounter = this._getAllTagsCounter;
      console.time('getAllTags_' + getAllTagsCounter);
    }

    var timeoutMs = 5000;
    var allTags = await this._ipcRenderer.callWithTimeout('db_getAllTags', timeoutMs, bibleBookId, lastUsed, onlyStats);
    
    if (this._isCordova) console.timeEnd('getAllTags_' + getAllTagsCounter);
    
    return allTags;
  }

  async getBookVerseTags(bibleBookId, versification) {
    return await this._ipcRenderer.call('db_getBookVerseTags', bibleBookId, versification);
  }

  async getVerseTagsByVerseReferenceIds(verseReferenceIds, versification) {
    return await this._ipcRenderer.call('db_getVerseTagsByVerseReferenceIds', verseReferenceIds, versification);
  }

  async createTagGroup(title) {
    return await this._ipcRenderer.call('db_createTagGroup', title);
  }

  async getAllTagGroups() {
    return await this._ipcRenderer.call('db_getAllTagGroups');
  }

  async persistNote(noteValue, verseObject, versification) {
    return await this._ipcRenderer.call('db_persistNote', noteValue, verseObject, versification);
  }

  async getVerseNotesByBook(bibleBookId, versification) {
    return await this._ipcRenderer.call('db_getVerseNotesByBook', bibleBookId, versification);
  }

  async getBookNotes(bookShortTitle) {
    return await this._ipcRenderer.call('db_getBookNotes', bookShortTitle);
  }

  async getNotesByVerseReferenceIds(verseReferenceIds, versification) {
    return await this._ipcRenderer.call('db_getNotesByVerseReferenceIds', verseReferenceIds, versification);
  }

  async getBibleBook(shortTitle) {
    return await this._ipcRenderer.call('db_getBibleBook', shortTitle);
  }

  async getBibleBooksFromSearchResults(searchResults) {
    return await this._ipcRenderer.call('db_getBibleBooksFromSearchResults', searchResults);
  }

  async getBibleBooksFromTagIds(tagIds) {
    return await this._ipcRenderer.call('db_getBibleBooksFromTagIds', tagIds);
  }

  async getBibleBooksFromXrefs(xrefs) {
    return await this._ipcRenderer.call('db_getBibleBooksFromXrefs', xrefs);
  }

  async getBookTitleTranslation(shortName) {
    var currentLocale = i18nController.getLocale();
    var translation = null;

    if (!(currentLocale in this._cachedBookTitleTranslations)) {
      this._cachedBookTitleTranslations[currentLocale] = {};
    }

    if (!(shortName in this._cachedBookTitleTranslations[currentLocale])) {
      translation = await this._ipcRenderer.call('db_getBookTitleTranslation', shortName, i18nController.getLocale());
      this._cachedBookTitleTranslations[currentLocale][shortName] = translation;
    } else {
      translation = this._cachedBookTitleTranslations[currentLocale][shortName];
    }

    return translation;
  }

  async getBookLongTitle(bookCode) {
    return await this._ipcRenderer.call('db_getBookLongTitle', bookCode);
  }

  async findBookTitle(title) {
    return await this._ipcRenderer.call('db_findBookTitle', title);
  }

  async isNtBook(bookCode) {
    return await this._ipcRenderer.call('db_isNtBook', bookCode);
  }

  async isOtBook(bookCode) {
    return await this._ipcRenderer.call('db_isOtBook', bookCode);
  }

  async isApocryphalBook(bookCode) {
    return await this._ipcRenderer.call('db_isApocryphalBook', bookCode);
  }

  async getVerseReferencesByBookAndAbsoluteVerseNumber(bookCode, absoluteVerseNr, versification) {
    return await this._ipcRenderer.call('db_getVerseReferencesByBookAndAbsoluteVerseNumber', bookCode, absoluteVerseNr, versification);
  }

  async getVerseReferencesFromVerseObjects(verseObjects, versification) {
    return await this._ipcRenderer.call('db_getVerseReferencesFromVerseObjects', verseObjects, versification);
  }

  async getVerseReferencesByTagIds(tagIds) {
    return await this._ipcRenderer.call('db_getVerseReferencesByTagIds', tagIds);
  }

  async getVerseReferencesByXrefs(xrefs) {
    return await this._ipcRenderer.call('db_getVerseReferencesByXrefs', xrefs);
  }

  async getAbsoluteVerseNumbersFromReference(sourceVersification, bookCode, absoluteVerseNr, chapter, verseNr) {
    return await this._ipcRenderer.call('db_getAbsoluteVerseNumbersFromReference',
                                        sourceVersification,
                                        bookCode,
                                        absoluteVerseNr,
                                        chapter,
                                        verseNr);
  }

  async getLastMetaRecordUpdate() {
    return await this._ipcRenderer.call('db_getLastMetaRecordUpdate');
  }

  async exportUserData(exportFilePath=undefined) {
    return await this._ipcRenderer.call('db_exportUserData', exportFilePath);
  }
}

module.exports = IpcDb;
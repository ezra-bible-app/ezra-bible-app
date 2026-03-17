/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const i18nHelper = require('../helpers/i18n_helper.js');
const { Mutex } = require('async-mutex');

class IpcDb {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
    this._platformHelper = new PlatformHelper();
    this._isCordova = this._platformHelper.isCordova();
    this._getAllTagsCounter = 0;
    this._cachedBookTitleTranslations = {};
    this._cachedTagList = [];
    this._getAllTagsLock = new Mutex();
  }

  async closeDatabase() {
    return await this._ipcRenderer.call('db_close');
  }

  async syncDropbox() {
    let connectionType = undefined;

    if (this._platformHelper.isCordova()) {
      connectionType = navigator.connection.type;
    }

    return await this._ipcRenderer.call('db_syncDropbox', connectionType);
  }

  async isDropboxAccessUpgradeNeeded() {
    return await this._ipcRenderer.call('db_isDropboxAccessUpgradeNeeded');
  }

  async getDatabasePath() {
    return await this._ipcRenderer.call('db_getDatabasePath');
  }

  async getDatabaseSize() {
    return await this._ipcRenderer.call('db_getDatabaseSize');
  }

  async createNewTag(newTagTitle, createNoteFile=false, tagGroups=null) {
    return await this._ipcRenderer.call('db_createNewTag', newTagTitle, createNoteFile, tagGroups);
  }

  async removeTag(id, deleteNoteFile=false) {
    return await this._ipcRenderer.call('db_removeTag', id, deleteNoteFile);
  }

  async updateTag(id, newTitle, addTagGroups, removeTagGroups) {
    return await this._ipcRenderer.call('db_updateTag', id, newTitle, addTagGroups, removeTagGroups);
  }

  async assignTagToVerses(tagId, verseBoxes) {
    return await this.updateTagsOnVerses(tagId, verseBoxes, "add");
  }

  async removeTagFromVerses(tagId, verseBoxes) {
    return await this.updateTagsOnVerses(tagId, verseBoxes, "remove");
  }

  async updateTagsOnVerses(tagId, verseBoxes, action) {
    var increment = (action == "add" ? true : false);
    tag_assignment_panel.updateTagVerseCount(tagId, verseBoxes, increment);

    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var referenceSeparator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

    var verseObjects = [];

    for (var verseBox of verseBoxes) {
      var verseBoxModel = new VerseBox(verseBox);
      var verseObject = await verseBoxModel.getVerseObject(referenceSeparator);
      verseObjects.push(verseObject);
    }

    var translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    var versification = await swordModuleHelper.getVersification(translationId);

    return await this._ipcRenderer.call('db_updateTagsOnVerses', tagId, verseObjects, versification, action);
  }

  async getTagCount(bibleBookId=0) {
    return await this._ipcRenderer.call('db_getTagCount', bibleBookId);
  }

  async getAllTags(bibleBookId=0, lastUsed=false, onlyStats=false) {
    // We use a semaphore/lock here to ensure that the caching functionality is working properly during startup.
    // Before introducing this lock we observed some parallel getAllTags calls during startup, specifically on Android.
    // Those parallel calls are valid, but we want to ensure that the retrieval of the tag list
    // is only done once at that time and then cached.
    const releaseLock = await this._getAllTagsLock.acquire();

    var getAllTagsCounter = null;
    var debug = false;
    var useCache = false;

    if (app_controller === undefined || app_controller && !app_controller.isStartupCompleted() && !onlyStats) {
      useCache = true;
    }

    var timeoutMs = 5000;
    if (useCache && this._cachedTagList.length == 0 || !useCache) {
      if (debug || this._isCordova) {
        this._getAllTagsCounter += 1;
        getAllTagsCounter = this._getAllTagsCounter;
        console.time('getAllTags_' + getAllTagsCounter);
      }

      var tagList = await this._ipcRenderer.callWithTimeout('db_getAllTags', timeoutMs, bibleBookId, lastUsed, onlyStats);

      if (!useCache) {
        releaseLock();
        return tagList;
      } else {
        this._cachedTagList = tagList;
      }

      if (debug || this._isCordova) console.timeEnd('getAllTags_' + getAllTagsCounter);
    }

    releaseLock();
    return this._cachedTagList;
  }

  async getBookVerseTags(bibleBookId, versification) {
    return await this._ipcRenderer.call('db_getBookVerseTags', bibleBookId, versification);
  }

  async getVerseTagsByVerseReferenceIds(verseReferenceIds, versification) {
    return await this._ipcRenderer.call('db_getVerseTagsByVerseReferenceIds', verseReferenceIds, versification);
  }

  async getTagNote(tagId) {
    return await this._ipcRenderer.call('db_getTagNote', tagId);
  }

  async createTagGroup(title) {
    return await this._ipcRenderer.call('db_createTagGroup', title);
  }

  async updateTagGroup(tagGroupId, title) {
    return await this._ipcRenderer.call('db_updateTagGroup', tagGroupId, title);
  }

  async getAllTagGroups(bibleBookId=0) {
    return await this._ipcRenderer.call('db_getAllTagGroups', bibleBookId);
  }

  async deleteTagGroup(tagGroupId) {
    return await this._ipcRenderer.call('db_deleteTagGroup', tagGroupId);
  }

  async isTagGroupUsedInBook(tagGroupId, bibleBookId) {
    return await this._ipcRenderer.call('db_isTagGroupUsedInBook', tagGroupId, bibleBookId);
  }

  async persistNote(noteValue, verseObject, versification, noteFileId=null) {
    return await this._ipcRenderer.call('db_persistNote', noteValue, verseObject, versification, noteFileId);
  }

  async getVerseNotesByBook(bibleBookId, versification) {
    return await this._ipcRenderer.call('db_getVerseNotesByBook', bibleBookId, versification);
  }

  async getBookNotes(bookShortTitle) {
    return await this._ipcRenderer.call('db_getBookNotes', bookShortTitle);
  }

  async getNotesByVerseReferenceIds(verseReferenceIds, versification, noteFileId=null) {
    return await this._ipcRenderer.call('db_getNotesByVerseReferenceIds', verseReferenceIds, versification, noteFileId);
  }

  async getAllNoteFiles() {
    return await this._ipcRenderer.call('db_getAllNoteFiles');
  }

  async createNoteFile(noteFileTitle) {
    return await this._ipcRenderer.call('db_createNoteFile', noteFileTitle);
  }

  async deleteNoteFile(id) {
    return await this._ipcRenderer.call('db_deleteNoteFile', id);
  }

  async updateNoteFile(id, newTitle) {
    return await this._ipcRenderer.call('db_updateNoteFile', id, newTitle);
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

  async isBookWithOffset(bookCode) {
    return await this._ipcRenderer.call('db_isBookWithOffset', bookCode);
  }

  async getLastMetaRecordUpdate() {
    return await this._ipcRenderer.call('db_getLastMetaRecordUpdate');
  }

  async exportUserData(exportFilePath=undefined) {
    return await this._ipcRenderer.call('db_exportUserData', exportFilePath);
  }

  async persistTagNoteIntroduction(tagId, introduction) {
    return await this._ipcRenderer.call('db_persistTagNoteIntroduction', tagId, introduction);
  }

  async persistTagNoteConclusion(tagId, conclusion) {
    return await this._ipcRenderer.call('db_persistTagNoteConclusion', tagId, conclusion);
  }
}

module.exports = IpcDb;
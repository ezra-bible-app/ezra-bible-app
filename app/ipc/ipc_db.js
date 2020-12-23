/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

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

  async getBookVerseTags(bibleBookId, versification) {
    return await this._ipcRenderer.call('db_getBookVerseTags', bibleBookId, versification);
  }

  async getVerseTagsByVerseReferenceIds(verseReferenceIds, versification) {
    return await this._ipcRenderer.call('db_getVerseTagsByVerseReferenceIds', verseReferenceIds, versification);
  }

  async persistNote(noteValue, verseObject) {
    return await this._ipcRenderer.call('db_persistNote', noteValue, verseObject);
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

  async getBookTitleTranslation(shortName) {
    return await this._ipcRenderer.call('db_getBookTitleTranslation', shortName, i18n.language);
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

  async getVerseReferencesByBookAndAbsoluteVerseNumber(bookCode, absoluteVerseNr, versification) {
    return await this._ipcRenderer.call('db_getVerseReferencesByBookAndAbsoluteVerseNumber', bookCode, absoluteVerseNr, versification);
  }
}

module.exports = IpcDb;
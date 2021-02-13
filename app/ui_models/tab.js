/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

class Tab {
  constructor(defaultBibleTranslationId, interactive=true) {
    this.elementId = null;
    this.book = null;
    this.bookTitle = null;
    this.tagIdList = "";
    this.tagTitleList = "";
    this.taggedVersesTitle = null;
    this.searchTerm = null;
    this.searchResults = null;
    this.searchOptions = {};
    this.xrefs = null;
    this.verseReferenceId = null;
    this.xrefTitle = null;
    this.textType = null;
    this.lastHighlightedNavElementIndex = null;
    this.bibleTranslationId = defaultBibleTranslationId;
    this.selectCount = 0;
    this.addedInteractively = interactive;
    this.cachedText = null;
    this.cachedReferenceVerse = null;
  }

  isValid() {
    return this.getBibleTranslationId() != null &&
           (this.getBook() != null ||
            this.getTagIdList() != "" ||
            this.getSearchTerm() != null ||
            this.getXrefs() != null);
  }

  getTitle() {
    var tabTitle = "";

    if (this.textType == 'book') {
      tabTitle = this.bookTitle;
    } else if (this.textType == 'tagged_verses') {
      tabTitle = this.getTaggedVersesTitle();
    } else if (this.textType == 'search_results') {
      tabTitle = this.getSearchTabTitle(this.searchTerm);
    } else if (this.textType == 'xrefs') {
      tabTitle = this.getXrefTitle();
    }

    return tabTitle;
  }

  getTaggedVersesTitle() {
    return this.taggedVersesTitle;
  }

  getSearchTabTitle(searchTerm) {
    return i18n.t("menu.search") + ": " + searchTerm;
  }

  setBook(bookCode, bookTitle) {
    this.book = bookCode;
    this.bookTitle = bookTitle;
  }

  getBook() {
    return this.book;
  }

  setTagIdList(tagIdList) {
    this.tagIdList = tagIdList;
  }

  getTagIdList() {
    return this.tagIdList;
  }

  setTagTitleList(tagTitleList) {
    this.tagTitleList = tagTitleList;
  }

  getTagTitleList(index=undefined) {
    return this.tagTitleList;
  }

  setTaggedVersesTitle(taggedVersesTitle) {
    this.taggedVersesTitle = taggedVersesTitle;
  }

  setSearchTerm(searchTerm) {
    this.searchTerm = searchTerm;
  }

  getSearchTerm() {
    return this.searchTerm;
  }

  setSearchResults(searchResults) {
    this.searchResults = searchResults;
  }

  getSearchResults() {
    return this.searchResults;
  }

  setSearchOptions(searchType, caseSensitive, extendedVerseBoundaries) {
    this.searchOptions['searchType'] = searchType;
    this.searchOptions['caseSensitive'] = caseSensitive;
    this.searchOptions['extendedVerseBoundaries'] = extendedVerseBoundaries;
  }

  getSearchOptions() {
    return this.searchOptions;
  }

  setXrefs(xrefs) {
    this.xrefs = xrefs;
  }

  getXrefs() {
    return this.xrefs;
  }

  setVerseReferenceId(verseReferenceId) {
    this.verseReferenceId = verseReferenceId;
  }

  getVerseReferenceId() {
    return this.verseReferenceId;
  }

  setXrefTitle(xrefTitle) {
    this.xrefTitle = xrefTitle;
  }

  getXrefTitle() {
    return this.xrefTitle;
  }

  setTextType(textType) {
    this.textType = textType;
  }

  getTextType() {
    return this.textType;
  }

  setBibleTranslationId(bibleTranslationId) {
    this.bibleTranslationId = bibleTranslationId;
  }

  getBibleTranslationId() {
    return this.bibleTranslationId;
  }

  getCachedText() {
    return this.cachedText;
  }
}

Tab.fromJsonObject = function(jsonObject) {
  tab = new Tab();
  Object.assign(tab, jsonObject);
  return tab;
}

module.exports = Tab;
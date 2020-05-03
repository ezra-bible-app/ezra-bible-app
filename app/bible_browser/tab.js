/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
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
    this.searchTerm = null;
    this.searchResults = null;
    this.searchOptions = {};
    this.textType = null;
    this.lastHighlightedNavElementIndex = null;
    this.bibleTranslationId = defaultBibleTranslationId;
    this.selectCount = 0;
    this.addedInteractively = interactive;
  }

  isValid() {
    return this.getBibleTranslationId() != null &&
           (this.getBook() != null ||
            this.getTagIdList() != "" ||
            this.getSearchTerm() != null);
  }

  getTitle() {
    var tabTitle = "";

    if (this.textType == 'book') {
      tabTitle = this.bookTitle;
    } else if (this.textType == 'tagged_verses') {
      tabTitle = this.tagTitleList;
    } else if (this.textType == 'search_results') {
      tabTitle = this.getSearchTabTitle(this.searchTerm);
    }

    return tabTitle;
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

  setSearchOptions(searchType, caseSensitive) {
    this.searchOptions['searchType'] = searchType;
    this.searchOptions['caseSensitive'] = caseSensitive;
  }

  getSearchOptions() {
    return this.searchOptions;
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
}

Tab.fromJsonObject = function(jsonObject) {
  tab = new Tab();
  Object.assign(tab, jsonObject);
  return tab;
}

module.exports = Tab;
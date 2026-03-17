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

const TabSearch = require('../components/tab_search/tab_search.js');
const verseListController = require('../controllers/verse_list_controller.js');

class Tab {
  constructor(defaultBibleTranslationId, interactive=true) {
    this.elementId = null;
    this.book = null;
    this.previousBook = null;
    this.bookTitle = null;
    this.chapter = null;
    this.referenceBookTitle = null;
    this.tagIdList = "";
    this.tagTitleList = "";
    this.taggedVersesTitle = null;
    this.searchTerm = null;
    this.searchResults = null;
    this.searchOptions = {};
    this.searchCancelled = false;
    this.xrefs = null;
    this.referenceVerseElementId = null;
    this.xrefTitle = null;
    this.textType = null;
    this.previousTextType = null;
    this.lastHighlightedNavElementIndex = null;
    this.bibleTranslationId = defaultBibleTranslationId;
    this.secondBibleTranslationId = null;
    this.selectCount = 0;
    this.addedInteractively = interactive;
    this.cachedText = null;
    this.cachedReferenceVerse = null;
    this.location = null;
    this.headersLoaded = false;
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

  setBook(bookCode, bookTitle, referenceBookTitle, chapter=undefined) {
    this.previousBook = this.book;
    this.searchResults = null;
    this.book = bookCode;
    this.bookTitle = bookTitle;
    this.referenceBookTitle = referenceBookTitle;
    this.chapter = chapter;
  }

  getBook() {
    return this.book;
  }

  getContentId() {
    var contentId = null;

    switch (this.textType) {
      case 'book':
        contentId = this.book;
        break;
      
      case 'tagged_verses':
        contentId = this.tagTitleList;
        break;

      case 'search_results':
        contentId = this.searchTerm;
        break;
      
      case 'xrefs':
        contentId = this.xrefs;
        break;
    }

    return contentId;
  }

  setPreviousBook(previousBook) {
    this.previousBook = previousBook;
  }

  getPreviousBook() {
    return this.previousBook;
  }

  isBookChanged() {
    return this.book != this.previousBook || this.bibleTranslationId != this.previousBibleTranslationId;
  }

  isBookUnchanged() {
    return !this.isBookChanged();
  }

  getBookTitle() {
    return this.bookTitle;
  }

  getChapter() {
    return this.chapter;
  }

  setChapter(chapter) {
    this.chapter = chapter;
  }

  getReferenceBookTitle() {
    return this.referenceBookTitle;
  }

  setTagIdList(tagIdList) {
    this.searchResults = null;
    this.tagIdList = tagIdList;
  }

  getTagIdList() {
    return this.tagIdList;
  }

  setTagTitleList(tagTitleList) {
    this.searchResults = null;
    this.tagTitleList = tagTitleList;
  }

  // eslint-disable-next-line no-unused-vars
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

  setSearchOptions(searchType, searchScope, caseSensitive, wordBoundaries, extendedVerseBoundaries) {
    this.searchOptions['searchType'] = searchType;
    this.searchOptions['searchScope'] = searchScope;
    this.searchOptions['caseSensitive'] = caseSensitive;
    this.searchOptions['wordBoundaries'] = wordBoundaries;
    this.searchOptions['extendedVerseBoundaries'] = extendedVerseBoundaries;
  }

  getSearchOptions() {
    return this.searchOptions;
  }

  setSearchCancelled(searchCancelled) {
    this.searchCancelled = searchCancelled;
  }

  isSearchCancelled() {
    return this.searchCancelled;
  }

  setXrefs(xrefs) {
    this.searchResults = null;
    this.xrefs = xrefs;
  }

  getXrefs() {
    return this.xrefs;
  }

  setReferenceVerseElementId(referenceVerseElementId) {
    this.referenceVerseElementId = referenceVerseElementId;
  }

  getReferenceVerseElementId() {
    return this.referenceVerseElementId;
  }

  setXrefTitle(xrefTitle) {
    this.xrefTitle = xrefTitle;
  }

  getXrefTitle() {
    return this.xrefTitle;
  }

  setTextType(textType) {
    this.previousTextType = this.textType;
    this.textType = textType;
  }

  getTextType() {
    return this.textType;
  }

  getPreviousTextType() {
    return this.previousTextType;
  }

  hasTextTypeChanged() {
    return this.textType != this.previousTextType;
  }

  getLastHighlightedNavElementIndex() {
    return this.lastHighlightedNavElementIndex;
  }

  setBibleTranslationId(bibleTranslationId) {
    this.previousBibleTranslationId = this.bibleTranslationId;
    this.bibleTranslationId = bibleTranslationId;
  }

  getBibleTranslationId() {
    return this.bibleTranslationId;
  }

  setSecondBibleTranslationId(secondBibleTranslationId) {
    this.secondBibleTranslationId = secondBibleTranslationId;
  }

  getSecondBibleTranslationId() {
    return this.secondBibleTranslationId;
  }

  getCachedText() {
    return this.cachedText;
  }

  isVerseList() {
    return this.textType == 'tagged_verses' && this.tagIdList != null ||
           this.textType == 'search_results' ||
           this.textType == 'xrefs' && this.xrefs != null;
  }

  isNew() {
    return this.textType == null;
  }

  isBook() {
    return this.textType == 'book';
  }

  hasReferenceVerse() {
    return this.getReferenceVerseElementId() != null;
  }

  getLocation() {
    return this.location;
  }

  setLocation(value) {
    this.location = value;
  }

  initTabSearch(tabIndex=undefined) {
    var verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);

    this.tab_search = new TabSearch();
    this.tab_search.init(
      verseListFrame.parent(),
      '.tab-search',
      '.tab-search-input',
      '.tab-search-occurances',
      '.tab-search-previous',
      '.tab-search-next',
      '.tab-search-is-case-sensitive',
      '.tab-search-word-boundaries',
      '.tab-search-type',
    );
  }
}

Tab.fromJsonObject = function(jsonObject, tabIndex) {
  var tab = new Tab();

  Object.assign(tab, jsonObject);
  tab.initTabSearch(tabIndex);
  tab.previousBibleTranslationId = tab.bibleTranslationId;

  return tab;
};

module.exports = Tab;
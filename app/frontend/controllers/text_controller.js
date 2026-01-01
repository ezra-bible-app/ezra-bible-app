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

const PlatformHelper = require('../../lib/platform_helper.js');
const notesHelper = require('../helpers/notes_helper.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const VerseReferenceHelper = require('../helpers/verse_reference_helper.js');
const Verse = require('../ui_models/verse.js');
const eventController = require('../controllers/event_controller.js');
const referenceVerseController = require('../controllers/reference_verse_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');
const { marked } = require('marked');

/**
 * The TextController is used to load bible text into the text area of a tab.
 * It can handle bible books, tagged verse lists and search results.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.text_controller`.
 * 
 * @category Controller
 */
class TextController {
  constructor() {
    loadScript("app/templates/verse_list.js");
    this.platformHelper = new PlatformHelper();
    this.verseReferenceHelper = new VerseReferenceHelper(ipcNsi);
    this.textUpdateInProgress = false;
  }

  isTextUpdateInProgress() {
    return this.textUpdateInProgress;
  }

  async loadBook(bookCode, bookTitle, referenceBookTitle, instantLoad = true, chapter = undefined) {
    if (platformHelper.isCordova()) {
      uiHelper.showTextLoadingIndicator();
    }

    app_controller.book_selection_menu.hideBookMenu(true);
    await waitUntilIdle();

    app_controller.book_selection_menu.highlightSelectedBookInMenu(bookCode);
    await waitUntilIdle();

    var currentTab = app_controller.tab_controller.getTab();
    currentTab.setTextType('book');
    app_controller.tab_controller.setCurrentTabBook(bookCode, bookTitle, referenceBookTitle, chapter);

    app_controller.tag_selection_menu.resetTagMenu();
    app_controller.module_search_controller.resetSearch();
    await this.prepareForNewText(true, false);
    await waitUntilIdle();

    // Set selected tags and search term to null, since we just switched to a book
    currentTab.setTagIdList(null);
    currentTab.setSearchTerm(null);
    currentTab.setXrefs(null);
    currentTab.setReferenceVerseElementId(null);

    var currentVerseList = verseListController.getCurrentVerseList();
    currentTab.tab_search.setVerseList(currentVerseList);

    var currentTabId = app_controller.tab_controller.getSelectedTabId();
    var currentBook = currentTab.getBook();

    await this.requestTextUpdate(currentTabId,
                                 currentBook,
                                 null,
                                 null,
                                 null,
                                 null,
                                 null,
                                 chapter,
                                 instantLoad);

    await waitUntilIdle();
    await tag_assignment_panel.updateTagList(currentBook);
  }

  async prepareForNewText(resetView, isSearch = false, tabIndex = undefined) {
    if (platformHelper.isCordova() && (tabIndex == 0 || tabIndex == undefined)) {
      uiHelper.showTextLoadingIndicator();
    }

    if (!isSearch) {
      app_controller.module_search_controller.cancelAnyModuleSearch();
    }


    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    if (currentTab != null && currentTab.tab_search != null) {
      currentTab.tab_search.resetSearch();
    }

    await app_controller.navigation_pane.initNavigationPaneForCurrentView(tabIndex);

    var textType = currentTab != null ? currentTab.getTextType() : null;

    if (textType != 'tagged_verses') {
      app_controller.module_search_controller.hideModuleSearchHeader(tabIndex);
    }

    if (textType != 'book') {
      app_controller.book_selection_menu.clearSelectedBookInMenu();
    }

    if (textType == 'book' && currentTab != null && currentTab.isBookUnchanged()) {
      // Do not reset verse list view if the book has not changed.
      resetView = false;
    }

    if (resetView && (tabIndex == 0 || tabIndex == undefined)) {
      if (tabIndex === undefined) {
        if (app_controller.verse_selection != null) {
          app_controller.verse_selection.clearVerseSelection();
        }
      }

      if (currentTab.hasTextTypeChanged()) {
        app_controller.navigation_pane.resetNavigationPane(tabIndex, true);
      }

      verseListController.resetVerseListView();
      let loadingMessage = "";

      if (isSearch) {
        const currentTab = app_controller.tab_controller.getTab(tabIndex);
        const searchTerm = currentTab.getSearchTerm();
        loadingMessage = i18n.t("bible-browser.searching-for") + " <i>" + searchTerm + "</i>";
      } else {
        loadingMessage = i18n.t("bible-browser.loading-bible-text");
      }

      verseListController.showVerseListLoadingIndicator(tabIndex, loadingMessage, !isSearch /* Only show loader visualization if we are not searching */);
      uiHelper.showTextLoadingIndicator();
    }

    var temporary_help = verseListController.getCurrentVerseListFrame(tabIndex).find('.temporary-help, .help-text');
    temporary_help.hide();
  }

  async requestTextUpdate(tabId,
                          book,
                          tagIdList,
                          cachedText,
                          cachedReferenceVerse,
                          searchResults,
                          xrefs,
                          chapter=undefined,
                          instantLoad=true,
                          tabIndex=undefined,
                          searchResultBookId=-1,
                          target=undefined) {

    this.textUpdateInProgress = true;
    var textType = app_controller.tab_controller.getTab(tabIndex).getTextType();

    if (searchResults != null) {
      textType = 'search_results';
    }

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var buttons = currentVerseListMenu.find('.fg-button');

    const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;
    if (!showSearchResultsInPopup) {
      buttons.removeClass('focused-button');
    }

    if (cachedText != null) {
      console.log("Loading text for tab " + tabIndex + " from cache!");
    }

    if (textType == 'book') { // Book text mode

      if (tabIndex === undefined) { 
        app_controller.docxExport.disableExportButton();
      }

      currentVerseListMenu.find('.book-select-button').addClass('focused-button');

      if (cachedText != null) {
        const hasNotes = /\snotes-content\s?=\s?["'][^"']+["']/g.test(cachedText); // check if there are any non-empty notes-content attributes
        await this.renderVerseList(cachedText, cachedReferenceVerse, 'book', tabIndex, false, true, undefined, false, hasNotes);

      } else {
        if (instantLoad) { // Load the whole book instantaneously

          let firstPartHasNotes = false;

          // 1) Only request the first 50 verses and render immediately
          await this.requestBookText(tabIndex, tabId, book,
                                    async (htmlVerseList, hasNotes) => {
                                      firstPartHasNotes = hasNotes;
                                      await this.renderVerseList(htmlVerseList, null, 'book', tabIndex, false, false, undefined, false, hasNotes);
                                    }, 1, 1, 50
          );

          await waitUntilIdle();

          // 2) Now request the rest of the book
          await this.requestBookText(
            tabIndex, tabId, book,
            async (htmlVerseList, hasNotes) => {
              await this.renderVerseList(htmlVerseList, null, 'book', tabIndex, false, false, undefined, true, firstPartHasNotes || hasNotes);
            }, 51, 51, -1
          );

        } else { // Load only one chapter
          await this.loadOneBookChapter(tabIndex, tabId, book, chapter);
        }
      }

    } else if (textType == 'tagged_verses') { // Tagged verse list mode
      if (tabIndex === undefined) { $('.show-book-tag-statistics-button').addClass('ui-state-disabled'); }
      currentVerseListMenu.find('.tag-select-button').addClass('focused-button');

      uiHelper.showTextLoadingIndicator();

      if (cachedText != null) {
        await this.renderVerseList(cachedText, cachedReferenceVerse, 'tagged_verses', tabIndex, true, true);
      } else {
        await this.requestVersesForSelectedTags(
          tabIndex,
          tabId,
          tagIdList,
          async (htmlVerseList) => {
            await this.renderVerseList(htmlVerseList, null, 'tagged_verses', tabIndex, true);
          }
        );
      }

    } else if (textType == 'search_results') { // Search result mode
      if (tabIndex === undefined) { $('.show-book-tag-statistics-button').addClass('ui-state-disabled'); }

      if (!showSearchResultsInPopup) {
        currentVerseListMenu.find('.module-search-button').addClass('focused-button');
      }

      if (cachedText != null) {
        await this.renderVerseList(cachedText, null, 'search_results', tabIndex, true, true);
      } else {
        await this.requestVersesForSearchResults(
          tabIndex,
          tabId,
          searchResults,
          async (htmlVerseList) => {
            await this.renderVerseList(htmlVerseList, null, 'search_results', tabIndex, searchResultBookId <= 0, /* isCache */ false, target);
          },
          searchResultBookId
        );
      }
    } else if (textType == 'xrefs') {

      uiHelper.showTextLoadingIndicator();

      if (cachedText != null) {
        await this.renderVerseList(cachedText, cachedReferenceVerse, 'xrefs', tabIndex, true, true);
      } else {
        await this.requestVersesForXrefs(
          tabIndex,
          tabId,
          xrefs,
          async (htmlVerseList) => {
            await this.renderVerseList(htmlVerseList, null, 'xrefs', tabIndex, true, /* isCache */ false, target);
          }
        );
      }
    }

    this.textUpdateInProgress = false;
  }

  async loadOneBookChapter(tabIndex, tabId, book, chapter) {
    const currentBibleTranslationId = app_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
    const secondBibleTranslationId = app_controller.tab_controller.getTab(tabIndex).getSecondBibleTranslationId();
    const separator = await i18nHelper.getReferenceSeparator(currentBibleTranslationId);
    const reference = chapter + separator + '1';
    const startVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(currentBibleTranslationId, book, reference);
    const startVerseNr2 = await this.verseReferenceHelper.getMappedAbsoluteVerseNumber(currentBibleTranslationId, secondBibleTranslationId, book, startVerseNr, chapter, 1);
    const verseCount = await ipcNsi.getChapterVerseCount(currentBibleTranslationId, book, chapter);

    await this.requestBookText(tabIndex, tabId, book,
                               async (htmlVerseList, hasNotes) => {
                                 await this.renderVerseList(htmlVerseList, null, 'book', tabIndex, false, false, undefined, false, hasNotes);
                               }, startVerseNr, startVerseNr2, verseCount
    );

    uiHelper.hideTextLoadingIndicator();
  }

  async requestBookText(tabIndex,
                        currentTabId,
                        bookShortTitle,
                        renderFunction,
                        startVerseNumber1=-1,
                        startVerseNumber2=-1,
                        numberOfVerses = -1,
                        renderType='html') {

    const tab = app_controller.tab_controller.getTab(tabIndex);
    const currentBibleTranslationId = tab.getBibleTranslationId();
    const secondBibleTranslationId = tab.getSecondBibleTranslationId();
    var localSwordModule = null;

    try {
      localSwordModule = await ipcNsi.getLocalModule(currentBibleTranslationId);
    } catch (e) {
      console.log("ERROR: Could not get local Sword module for " + currentBibleTranslationId);
    }

    if (currentBibleTranslationId == null ||
      currentBibleTranslationId == "" ||
      localSwordModule == null) {

      $('#verse-list-loading-indicator').hide();
      return;
    }

    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    const versification = await swordModuleHelper.getThreeLetterVersification(currentBibleTranslationId);
    var bibleBook = await ipcDb.getBibleBook(bookShortTitle);

    // Only necessary because old saved short titles may not be found directly
    if (bibleBook == null) {
      bookShortTitle = await ipcDb.findBookTitle(bookShortTitle);
      bibleBook = await ipcDb.getBibleBook(bookShortTitle);
    }

    if (bibleBook == null) {
      // If the bibleBook is still null at this point we simply return.
      $('#verse-list-loading-indicator').hide();
      return;
    }

    let verses1 = await ipcNsi.getBookText(currentBibleTranslationId, bookShortTitle, startVerseNumber1, numberOfVerses);
    if (verses1 == null) {
      console.error("Got null result when requesting book text!");
      return;
    }

    let verses2 = [];
    if (secondBibleTranslationId != null && secondBibleTranslationId != "") {
      verses2 = await ipcNsi.getBookText(secondBibleTranslationId, bookShortTitle, startVerseNumber2, numberOfVerses);
    }

    var verseTags = await ipcDb.getBookVerseTags(bibleBook.id, versification);
    var verseNotes = await ipcDb.getVerseNotesByBook(bibleBook.id, versification);
    var bookIntroduction = null;
    var bookHasHeaders = await swordModuleHelper.bookHasHeaders(currentBibleTranslationId, bookShortTitle, false);
    var bookChapterCount = await ipcNsi.getBookChapterCount(currentBibleTranslationId, bookShortTitle);

    if (startVerseNumber1 == 1) { // Only load book introduction if starting with verse 1
      try {
        if (bookHasHeaders) {
          bookIntroduction = await ipcNsi.getBookIntroduction(currentBibleTranslationId, bookShortTitle);

          if (this.platformHelper.isElectron()) {
            const sanitizeHtml = require('sanitize-html');
            bookIntroduction = sanitizeHtml(bookIntroduction);
          }
        }
      } catch (e) {
        console.log("Could not retrieve book introduction for module " + currentBibleTranslationId);
      }
    }

    var bookNotes = null;

    if (startVerseNumber1 == 1) {
      bookNotes = await ipcDb.getBookNotes(bookShortTitle);
    }

    var separator = await i18nHelper.getReferenceSeparator(currentBibleTranslationId);

    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var isInstantLoadingBook = true;
    if (currentTab != null && currentTab.getTextType() == 'book') {
      isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(currentBibleTranslationId, secondBibleTranslationId, bookShortTitle);
    }

    if (renderType == 'html') {
      var verses_as_html = verseListTemplate({
        versification: versification,
        verseListId: currentTabId,
        renderVerseMetaInfo: true,
        renderBibleBookHeaders: false,
        // only render chapter headers with the full book requested
        renderChapterHeaders: isInstantLoadingBook && !bookHasHeaders,
        renderChapterNavigationLinks: !isInstantLoadingBook,
        renderBookNotes: (startVerseNumber1 == 1),
        renderTagNotes: false,
        bookChapterCount: bookChapterCount,
        bookIntroduction: bookIntroduction,
        bookNotes: bookNotes,
        bibleBooks: [bibleBook],
        verses1: verses1,
        verses2: verses2,
        verseTags: verseTags,
        verseNotes: verseNotes,
        referenceSeparator: separator,
        chapterText: bookShortTitle === 'Ps' ? "bible-browser.psalm" : "bible-browser.chapter",
        helper: {
          getNotesTooltip: notesHelper.getTooltipText,
          renderNotes: notesHelper.renderNotes,
          getLocalizedDate: i18nHelper.getLocalizedDate
        }
      });

      const hasNotes = bookNotes !== null || getReferenceIdsFromNotes(verseNotes, startVerseNumber1, startVerseNumber1 + numberOfVerses - 1).length > 0;

      await renderFunction(verses_as_html, hasNotes);
      
    } else if (renderType == 'docx') {
      const notes = {
        [bookShortTitle.toLowerCase()]:  bookNotes,
        ...getNotesForSection(verseNotes, startVerseNumber1, startVerseNumber1 + numberOfVerses - 1)
      };
      renderFunction(verses1, notes);
    }
  }

  /**
   * Loop through each verse to count the number of verses per Bible book.
   */
  getBibleBookStatsFromVerses(verses) {
    var bibleBookStats = {};

    for (var i = 0; i < verses.length; i++) {
      if (verses[i] === undefined) {
        continue;
      }

      var bibleBookShortTitle = verses[i].bibleBookShortTitle;

      if (bibleBookStats[bibleBookShortTitle] === undefined) {
        bibleBookStats[bibleBookShortTitle] = 1;
      } else {
        bibleBookStats[bibleBookShortTitle] += 1;
      }
    }

    return bibleBookStats;
  }

  getBibleTranslationId(tab_index, isSecondBible=false) {
    var bibleTranslationId = null;

    if (app_controller.tab_controller.getTab(tab_index).getBibleTranslationId() == null) {
      if (!isSecondBible) {
        bibleTranslationId = app_controller.tab_controller.defaultBibleTranslationId;
      } else {
        bibleTranslationId = app_controller.tab_controller.defaultSecondBibleTranslationId;
      }
    } else {
      if (!isSecondBible) {
        bibleTranslationId = app_controller.tab_controller.getTab(tab_index).getBibleTranslationId();
      } else {
        bibleTranslationId = app_controller.tab_controller.getTab(tab_index).getSecondBibleTranslationId();
      }
    }

    return bibleTranslationId;
  }

  async requestVersesForSearchResults(tab_index,
                                      current_tab_id,
                                      search_results,
                                      render_function,
                                      searchResultBookId=-1,
                                      render_type='html',
                                      renderVerseMetaInfo=true) {
    if (search_results.length == 0) {
      return;
    }

    const bibleTranslationId = this.getBibleTranslationId(tab_index);
    const secondBibleTranslationId = this.getBibleTranslationId(tab_index, true);

    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    const versification = await swordModuleHelper.getThreeLetterVersification(bibleTranslationId);

    var bibleBooks = await ipcDb.getBibleBooksFromSearchResults(search_results);
    var bookNames = await ipcGeneral.getBookNames(bibleBooks);
    var bibleBookStats = app_controller.module_search_controller.getBibleBookStatsFromSearchResults(search_results);
    var verses1 = [];
    var verses2 = [];

    /**
     * Loop through search results to filter verses by a specific book ID.
     */
    for (let i = 0; i < search_results.length; i++) {
      const currentVerse = search_results[i];
      const currentBookId = currentVerse.bibleBookShortTitle;

      // Skip the books that are not requested
      if (searchResultBookId != -1 && currentBookId != searchResultBookId) {
        continue;
      }

      verses1.push(currentVerse);

      if (secondBibleTranslationId != null) {
        let mappedAbsoluteVerseNumber = await this.verseReferenceHelper.getMappedAbsoluteVerseNumber(bibleTranslationId,
                                                                                                     secondBibleTranslationId,
                                                                                                     currentVerse.bibleBookShortTitle,
                                                                                                     currentVerse.absoluteVerseNr,
                                                                                                     currentVerse.chapter,
                                                                                                     currentVerse.verseNr);
        let resultVerses2 = await ipcNsi.getBookText(secondBibleTranslationId,
                                                     currentVerse.bibleBookShortTitle,
                                                     mappedAbsoluteVerseNumber,
                                                     1);
        let verse2 = resultVerses2[0];

        if (verse2 !== undefined) {
          verses2.push(verse2);
        }
      }
    }

    var verseObjects = [];

    /**
     * Loop through verses1 to create Verse objects for each verse.
     */
    for (let i = 0; i < verses1.length; i++) {
      const currentVerse = verses1[i];
      const currentVerseObject = new Verse(currentVerse.bibleBookShortTitle,
                                           currentVerse.absoluteVerseNr,
                                           currentVerse.chapter,
                                           currentVerse.verseNr,
                                           false);

      verseObjects.push(currentVerseObject);
    }

    var verseReferenceIds = await ipcDb.getVerseReferencesFromVerseObjects(verseObjects, versification);
    var verseTags = await ipcDb.getVerseTagsByVerseReferenceIds(verseReferenceIds, versification);
    var verseNotes = await ipcDb.getNotesByVerseReferenceIds(verseReferenceIds, versification);

    if (render_type == "html") {

      await this.getVersesAsHtml(current_tab_id,
                                 bibleBooks,
                                 bookNames,
                                 bibleBookStats,
                                 verseTags,
                                 verseNotes,
                                 verses1,
                                 verses2,
                                 null,
                                 null,
                                 versification,
                                 render_function,
                                 searchResultBookId <= 0,
                                 false,
                                 renderVerseMetaInfo);

    } else if (render_type == "docx") {
      render_function(verses, bibleBooks);
    }
  }

  async requestVersesForSelectedTags(tab_index,
                                     current_tab_id,
                                     selected_tags,
                                     render_function,
                                     render_type='html',
                                     renderVerseMetaInfo=true) {
    if (selected_tags == '') {
      return;
    }

    let selectedTagList = selected_tags.split(',');

    let renderTagNotes = false;
    let tagNote = null;
    let noteFileId = null;
    let firstTagId = null;

    // If only one tag is selected, we can render the tag note (intro and conclusion) for the tag
    // and also the notes for the verses tagged with this tag.
    if (selectedTagList.length == 1) {
      renderTagNotes = true;

      firstTagId = parseInt(selectedTagList[0]);
      tagNote = await ipcDb.getTagNote(firstTagId);

      const tagObject = await tag_assignment_panel.tag_store.getTag(firstTagId);
      if (tagObject != null && tagObject.noteFileId != null) {
        noteFileId = tagObject.noteFileId;
      }

      await app_controller.noteFilesPanel.setActiveNoteFile(noteFileId, false);
    }

    const bibleTranslationId = this.getBibleTranslationId(tab_index);
    const secondBibleTranslationId = this.getBibleTranslationId(tab_index, true);

    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    var versification = await swordModuleHelper.getThreeLetterVersification(bibleTranslationId);

    const verseReferences = await ipcDb.getVerseReferencesByTagIds(selected_tags);
    var verseReferenceIds = [];
    var verses1 = [];
    var verses2 = [];

    /**
     * Loop through verseReferences to collect unique verse reference IDs and fetch corresponding verses.
     */
    for (let i = 0; i < verseReferences.length; i++) {
      let currentVerseReference = verseReferences[i];

      if (!verseReferenceIds.includes(currentVerseReference.id)) {
        verseReferenceIds.push(currentVerseReference.id);
      } else {
        // Avoid double listing of verses
        continue;
      }

      let currentAbsoluteVerseNumber = versification == 'eng' ? currentVerseReference.absoluteVerseNrEng : currentVerseReference.absoluteVerseNrHeb;
      let secondBibleAbsoluteVerseNumber = await this.verseReferenceHelper.getMappedAbsoluteVerseNumber(bibleTranslationId, secondBibleTranslationId, currentVerseReference.bibleBookShortTitle, currentAbsoluteVerseNumber, currentVerseReference.chapter, currentVerseReference.verseNr);

      let resultVerses = await ipcNsi.getBookText(bibleTranslationId,
                                                  currentVerseReference.bibleBookShortTitle,
                                                  currentAbsoluteVerseNumber,
                                                  1);
      let verse = resultVerses[0];

      if (verse !== undefined) {
        verses1.push(verse);
      }
      
      let verse2 = null;

      if (secondBibleTranslationId != null) {
        let resultVerses2 = await ipcNsi.getBookText(secondBibleTranslationId,
                                                     currentVerseReference.bibleBookShortTitle,
                                                     secondBibleAbsoluteVerseNumber,
                                                     1);
        verse2 = resultVerses2[0];

        if (verse2 !== undefined) {
          verses2.push(verse2);
        }
      }
    }

    var bibleBookStats = this.getBibleBookStatsFromVerses(verses1);
    var bibleBooks = await ipcDb.getBibleBooksFromTagIds(selected_tags);
    var bookNames = await ipcGeneral.getBookNames(bibleBooks);

    var verseTags = await ipcDb.getVerseTagsByVerseReferenceIds(verseReferenceIds, versification);
    var verseNotes = await ipcDb.getNotesByVerseReferenceIds(verseReferenceIds, versification, noteFileId);

    if (render_type == "html") {

      await this.getVersesAsHtml(current_tab_id,
                                 bibleBooks,
                                 bookNames,
                                 bibleBookStats,
                                 verseTags,
                                 verseNotes,
                                 verses1,
                                 verses2,
                                 tagNote,
                                 firstTagId,
                                 versification,
                                 render_function,
                                 true,
                                 renderTagNotes,
                                 renderVerseMetaInfo);

    } else if (render_type == "docx") {
      render_function(verses1, bibleBooks, verseTags, verseNotes);
    }
  }

  async requestVersesForXrefs(tab_index,
                              current_tab_id,
                              xrefs,
                              render_function,
                              render_type='html',
                              renderVerseMetaInfo=true) {
    if (xrefs.length == 0) {
      return;
    }

    const bibleTranslationId = this.getBibleTranslationId(tab_index);
    const secondBibleTranslationId = this.getBibleTranslationId(tab_index, true);

    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    const versification = await swordModuleHelper.getThreeLetterVersification(bibleTranslationId);

    const verseReferences = await ipcDb.getVerseReferencesByXrefs(xrefs);
    var verseReferenceIds = [];
    var verses1 = await ipcNsi.getVersesFromReferences(bibleTranslationId, xrefs);

    var verses2 = [];

    if (secondBibleTranslationId != null && secondBibleTranslationId != "") {
      verses2 = await ipcNsi.getVersesFromReferences(secondBibleTranslationId, xrefs);
    }

    /**
     * Loop through verseReferences to collect verse reference IDs for cross-references (xrefs).
     */
    for (let i = 0; i < verseReferences.length; i++) {
      let currentVerseReference = verseReferences[i];

      if (currentVerseReference != undefined) {
        verseReferenceIds.push(currentVerseReference.id);
      }
    }

    var bibleBookStats = this.getBibleBookStatsFromVerses(verses1);
    var bibleBooks = await ipcDb.getBibleBooksFromXrefs(xrefs);
    var bookNames = await ipcGeneral.getBookNames(bibleBooks);

    var verseTags = await ipcDb.getVerseTagsByVerseReferenceIds(verseReferenceIds, versification);
    var verseNotes = await ipcDb.getNotesByVerseReferenceIds(verseReferenceIds, versification);

    if (render_type == "html") {

      await this.getVersesAsHtml(current_tab_id,
                                 bibleBooks,
                                 bookNames,
                                 bibleBookStats,
                                 verseTags,
                                 verseNotes,
                                 verses1,
                                 verses2,
                                 null,
                                 null,
                                 versification,
                                 render_function,
                                 true,
                                 false,
                                 renderVerseMetaInfo);

    } else if (render_type == "docx") {
      render_function(verses, bibleBooks);
    }
  }

  async requestNotesForExport(tabIndex, book, chapter, renderFunction, renderType='html') {
    var currentBibleTranslationId = app_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
    var separator = await i18nHelper.getReferenceSeparator(currentBibleTranslationId);
    var reference = (chapter || '1') + separator + '1';
    var startVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(currentBibleTranslationId, book, reference);
    var startVerseNr2 = startVerseNr;
    var verseCount = chapter !== null ? await ipcNsi.getChapterVerseCount(currentBibleTranslationId, book, chapter) : -1;

    await this.requestBookText(tabIndex, undefined, book, renderFunction, startVerseNr, startVerseNr2, verseCount, renderType);
  }

  async getVersesAsHtml(current_tab_id,
                        bibleBooks,
                        bookNames,
                        bibleBookStats,
                        groupedVerseTags,
                        groupedVerseNotes,
                        verses1,
                        verses2,
                        tagNote,
                        tagId,
                        versification,
                        render_function,
                        renderBibleBookHeaders=true,
                        renderTagNotes=false,
                        renderVerseMetaInfo=true) {    

    var tab = app_controller.tab_controller.getTabById(current_tab_id);
    var bibleTranslationId = null;
    if (tab != null) {
      bibleTranslationId = tab.getBibleTranslationId();
    }

    var separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

    var verses_as_html = verseListTemplate({
      versification: versification,
      verseListId: current_tab_id,
      renderBibleBookHeaders: renderBibleBookHeaders,
      renderChapterNavigationLinks: false,
      renderVerseMetaInfo: renderVerseMetaInfo,
      renderTagNotes: renderTagNotes,
      bibleBooks: bibleBooks,
      bookNames: bookNames,
      bibleBookStats: bibleBookStats,
      verses1: verses1,
      verses2: verses2,
      tagNote: tagNote,
      tagId: tagId,
      verseTags: groupedVerseTags,
      verseNotes: groupedVerseNotes,
      marked: marked,
      referenceSeparator: separator,
      helper: {
        getNotesTooltip: notesHelper.getTooltipText,
        renderNotes: notesHelper.renderNotes,
        getLocalizedDate: i18nHelper.getLocalizedDate
      }
    });

    render_function(verses_as_html, verses1.length);
  }

  async renderVerseList(htmlVerseList, 
                        referenceVerseHtml, 
                        listType, 
                        tabIndex=undefined, 
                        renderChart=false, 
                        isCache=false, 
                        target=undefined, 
                        append=false, 
                        hasNotes=false) {
    
    if (!append) {
      await eventController.publishAsync('on-verse-list-init', tabIndex);
    }

    verseListController.hideVerseListLoadingIndicator();
    verseListController.hideSearchProgressBar();
    var initialRendering = true;
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    var isInstantLoadingBook = true;
    if (currentTab.getTextType() == 'book') {
      isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(currentTab.getBibleTranslationId(), currentTab.getSecondBibleTranslationId(), currentTab.getBook());
    }

    if (tabIndex === undefined) {
      tabIndex = app_controller.tab_controller.getSelectedTabIndex();
      initialRendering = false;
    }

    if (!initialRendering) {
      const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;

      if (listType != 'search_results' || listType == 'search_results' && !showSearchResultsInPopup) {
        app_controller.tab_controller.getTab().setTextType(listType);
      }
    }

    if (target === undefined) {
      target = verseListController.getCurrentVerseList(tabIndex);
    }

    if (listType == 'book') {
      app_controller.tag_selection_menu.resetTagMenu();
      app_controller.module_search_controller.resetSearch(tabIndex);

      target.addClass('verse-list-book');

      if (this.platformHelper.isElectron() && hasNotes) {
        app_controller.docxExport.enableExportButton(tabIndex, 'BOOK_NOTES');
      } else {
        app_controller.docxExport.disableExportButton(tabIndex);
      }

    } else if (listType == 'tagged_verses') {
      app_controller.module_search_controller.resetSearch(tabIndex);

      if (this.platformHelper.isElectron()) {
        const tagIdList = currentTab.getTagIdList().split(',');
        
        const firstTagId = parseInt(tagIdList[0]);
        const firstTagObject = await tag_assignment_panel.tag_store.getTag(firstTagId);

        if (tagIdList.length === 1 && firstTagObject != null && firstTagObject.noteFileId != null) {
          app_controller.docxExport.enableExportButton(tabIndex, 'TAGGED_VERSES_WITH_NOTES');
        } else {
          app_controller.docxExport.enableExportButton(tabIndex, 'TAGGED_VERSES');
        }
      }

      let verseListHeader = verseListController.getCurrentVerseListFrame(tabIndex).find('.verse-list-header');
      let selectAllVersesButtonContainer = verseListHeader;

      if (currentTab.hasReferenceVerse()) {
        let verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
        selectAllVersesButtonContainer = verseListFrame.find('.reference-verse');
      } else {
        let tagTitleList = currentTab.getTagTitleList();
        let headerText = `<h2><span i18n="tags.verses-tagged-with">${i18n.t('tags.verses-tagged-with')}</span> <i>${tagTitleList}</i></h2>`;
        verseListHeader.html(headerText);
        verseListHeader.show();
      }

      if (verseListHeader.parent().find('.select-all-verses-button').length == 0) {
        uiHelper.addButton(selectAllVersesButtonContainer, 'select-all-verses-button', 'bible-browser.select-all-verses', () => {
          this.selectAllVerses();
        }, false, true);

        uiHelper.configureButtonStyles('select-all-verses-button');
      }

      target.removeClass('verse-list-book');

    } else if (listType == 'search_results') {
      target.removeClass('verse-list-book');
    }

    if (listType == 'xrefs' || listType == 'tagged_verses') {
      referenceVerseController.showReferenceContainer();
    }

    if (append) {
      htmlVerseList = target[0].innerHTML + htmlVerseList;
    }

    target.html(htmlVerseList);

    if (referenceVerseHtml != null) {
      let verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
      let referenceVerseContainer = verseListFrame.find('.reference-verse');
      referenceVerseContainer.html(referenceVerseHtml);
      let referenceVerseBox = referenceVerseContainer.find('.verse-box');
      referenceVerseController.renderReferenceVerse(referenceVerseBox, tabIndex);
      referenceVerseContainer.show();
    }

    if (listType == 'tagged_verses') {
      var numberOfTaggedVerses = target.find('.verse-box').length;

      var headerElementClass = '.verse-list-header';
      if (currentTab.hasReferenceVerse()) {
        headerElementClass = '.reference-verse-list-header';
      }

      const verseListHeader = verseListController.getCurrentVerseListFrame(tabIndex).find(headerElementClass).find('h2');
      let taggedVerseCount = verseListHeader.find('.tagged-verse-count');

      if (taggedVerseCount.length == 0) {
        const headerWithResultNumber = `${verseListHeader.html()} <span class='tagged-verse-count'>(${numberOfTaggedVerses})</span>`;
        verseListHeader.html(headerWithResultNumber);
      }
    }

    if (listType == 'search_results') {
      const currentTab = app_controller.tab_controller.getTab(tabIndex);
      const currentSearchTerm = currentTab.getSearchTerm();
      app_controller.module_search_controller.highlightSearchResults(currentSearchTerm, tabIndex);
    }

    if (renderChart && (listType == 'search_results' || listType == 'tagged_verses' || listType == 'xrefs')) {
      await app_controller.verse_statistics_chart.repaintChart(tabIndex, listType);

      if (listType == 'tagged_verses') {
        let verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
        let tagDistributionMatrix = verseListFrame.find('tag-distribution-matrix')[0];
        let verseList = verseListController.getCurrentVerseList(tabIndex)[0];
        await tagDistributionMatrix.setInputAndRefresh(verseList, tabIndex);

        let tagDistributionMatrixWrapper = verseListFrame.find('.tag-distribution-matrix-wrapper')[0];
        tagDistributionMatrixWrapper.style.removeProperty('display');
      }

    } else {
      if (listType != 'search_results' && listType != 'tagged_verses' && listType != 'xrefs') {
        await app_controller.verse_statistics_chart.resetChart(tabIndex);
      }

      let verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
      let tagDistributionMatrix = verseListFrame.find('tag-distribution-matrix')[0];
      tagDistributionMatrix.reset();

      let tagDistributionMatrixWrapper = verseListFrame.find('.tag-distribution-matrix-wrapper')[0];
      tagDistributionMatrixWrapper.style.display = 'none';
    }

    if (isCache || listType == 'book' && !append) {
      app_controller.optionsMenu.showOrHideBookIntroductionBasedOnOption(tabIndex);
      app_controller.optionsMenu.showOrHideSectionTitlesBasedOnOption(tabIndex);
    }

    if (isCache ||
      listType != 'book' ||
      listType == 'book' && append ||
      !isInstantLoadingBook) {

      var selectedTabIndex = app_controller.tab_controller.getSelectedTabIndex();
      if (tabIndex === undefined) {
        tabIndex = selectedTabIndex;
      }

      await waitUntilIdle();

      const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;

      if (listType != 'search_results' ||
          listType == 'search_results' && !showSearchResultsInPopup) {

        await eventController.publishAsync('on-bible-text-loaded', tabIndex);
      }

      uiHelper.hideTextLoadingIndicator();
    }
  }

  selectAllVerses() {
    app_controller.verse_selection.selectAllVerses('bible-browser.all-verses');
  }
}

function getReferenceIdsFromNotes(verseNotes, startVerseNr, endVerseNr) {
  const verseReferenceIds = Object.keys(verseNotes);
  return verseReferenceIds.filter(verseReferenceId => {
    const noteVerseNumber = parseInt(verseReferenceId.split('-')[2]);
    return noteVerseNumber >= startVerseNr && (endVerseNr < startVerseNr || noteVerseNumber <= endVerseNr);
  });
}

function getNotesForSection(verseNotes, startVerseNr, endVerseNr) {
  const includedIds = getReferenceIdsFromNotes(verseNotes, startVerseNr, endVerseNr);
  var includedNotes = {};
  includedIds.forEach(referenceId => {
    const referenceIdWithoutVersification = referenceId.slice(4); // strip 3-letter versification + '-'
    includedNotes[referenceIdWithoutVersification] = verseNotes[referenceId];
  });
  return includedNotes;
}

module.exports = TextController;
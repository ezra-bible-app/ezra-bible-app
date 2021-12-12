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

const PlatformHelper = require('../../lib/platform_helper.js');
const notesHelper = require('../helpers/notes_helper.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const VerseReferenceHelper = require('../helpers/verse_reference_helper.js');
const Verse = require('../ui_models/verse.js');
const eventController = require('../controllers/event_controller.js');
const referenceVerseController = require('../controllers/reference_verse_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');

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
    this.marked = require("marked");
    this.platformHelper = new PlatformHelper();
    this.verseReferenceHelper = new VerseReferenceHelper(ipcNsi);
  }

  async loadBook(bookCode, bookTitle, referenceBookTitle, instantLoad = true, chapter = undefined) {
    app_controller.book_selection_menu.hideBookMenu();
    app_controller.book_selection_menu.highlightSelectedBookInMenu(bookCode);

    var currentTab = app_controller.tab_controller.getTab();
    currentTab.setTextType('book');
    app_controller.tab_controller.setCurrentTabBook(bookCode, bookTitle, referenceBookTitle, chapter);

    app_controller.tag_selection_menu.resetTagMenu();
    app_controller.module_search_controller.resetSearch();
    await this.prepareForNewText(true, false);

    setTimeout(async () => {
      // Set selected tags and search term to null, since we just switched to a book
      var currentTab = app_controller.tab_controller.getTab();
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
      tags_controller.updateTagList(currentBook);
    }, 50);
  }

  async prepareForNewText(resetView, isSearch = false, tabIndex = undefined) {
    if (!isSearch) {
      app_controller.module_search_controller.cancelModuleSearch();
    }

    app_controller.module_search_controller.hideModuleSearchHeader(tabIndex);

    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    if (currentTab != null && currentTab.tab_search != null) {
      currentTab.tab_search.resetSearch();
    }

    await app_controller.navigation_pane.initNavigationPaneForCurrentView(tabIndex);

    if (tabIndex === undefined) {
      if (app_controller.verse_selection != null) {
        app_controller.verse_selection.clear_verse_selection();
      }
    }

    var textType = currentTab != null ? currentTab.getTextType() : null;
    if (textType != 'book') {
      app_controller.book_selection_menu.clearSelectedBookInMenu();
    }

    if (textType == 'book' && currentTab != null && currentTab.isBookUnchanged()) {
      // Do not reset verse list view if the book has not changed.
      resetView = false;

      if (platformHelper.isCordova() && (tabIndex == 0 || tabIndex == undefined)) {
        uiHelper.showTextLoadingIndicator();
      }
    }

    if (resetView && (tabIndex == 0 || tabIndex == undefined)) {
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

    var textType = app_controller.tab_controller.getTab(tabIndex).getTextType();
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var buttons = currentVerseListMenu.find('.fg-button');
    buttons.removeClass('focused-button');

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
                                     }, 1, 50
          );

          await waitUntilIdle();

          // 2) Now request the rest of the book
          await this.requestBookText(
            tabIndex, tabId, book,
            async (htmlVerseList, hasNotes) => {
              await this.renderVerseList(htmlVerseList, null, 'book', tabIndex, false, false, undefined, true, firstPartHasNotes || hasNotes);
            }, 51, -1
          );

        } else { // Load only one chapter

          var currentBibleTranslationId = app_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
          var separator = await i18nHelper.getReferenceSeparator(currentBibleTranslationId);
          var reference = chapter + separator + '1';
          var startVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(currentBibleTranslationId, book, reference);
          var verseCount = await ipcNsi.getChapterVerseCount(currentBibleTranslationId, book, chapter);

          await this.requestBookText(tabIndex, tabId, book,
                                     async (htmlVerseList, hasNotes) => {
                                       await this.renderVerseList(htmlVerseList, null, 'book', tabIndex, false, false, undefined, false, hasNotes);
                                     }, startVerseNr, verseCount
          );

          uiHelper.hideTextLoadingIndicator();
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
      currentVerseListMenu.find('.module-search-button').addClass('focused-button');

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
  }

  async requestBookText(tabIndex,
                        currentTabId,
                        bookShortTitle,
                        renderFunction,
                        startVerseNumber=-1,
                        numberOfVerses = -1,
                        renderType='html') {

    var currentBibleTranslationId = app_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
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
    var versification = await swordModuleHelper.getThreeLetterVersification(currentBibleTranslationId);
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

    var verses = await ipcNsi.getBookText(currentBibleTranslationId, bookShortTitle, startVerseNumber, numberOfVerses);
    if (verses == null) {
      console.error("Got null result when requesting book text!");
      return;
    }

    var verseTags = await ipcDb.getBookVerseTags(bibleBook.id, versification);
    var verseNotes = await ipcDb.getVerseNotesByBook(bibleBook.id, versification);
    var bookIntroduction = null;

    if (startVerseNumber == 1) { // Only load book introduction if starting with verse 1
      try {
        if (localSwordModule != null && localSwordModule.hasHeadings) {
          bookIntroduction = await ipcNsi.getBookIntroduction(currentBibleTranslationId, bookShortTitle);

          var sanitizeHtml = require('sanitize-html');
          bookIntroduction = sanitizeHtml(bookIntroduction);
        }
      } catch (e) {
        console.log("Could not retrieve book introduction for module " + currentBibleTranslationId);
      }
    }

    var bookNotes = null;

    if (startVerseNumber == 1) {
      bookNotes = await ipcDb.getBookNotes(bookShortTitle);
    }

    var separator = await i18nHelper.getReferenceSeparator(currentBibleTranslationId);

    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var isInstantLoadingBook = true;
    if (currentTab != null && currentTab.getTextType() == 'book') {
      isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(currentBibleTranslationId, bookShortTitle);
    }

    if (renderType == 'html') {
      var verses_as_html = verseListTemplate({
        versification: versification,
        verseListId: currentTabId,
        renderVerseMetaInfo: true,
        renderBibleBookHeaders: false,
        // only render chapter headers with the full book requested
        renderChapterHeaders: isInstantLoadingBook && !localSwordModule.hasHeadings,
        renderBookNotes: (startVerseNumber == 1),
        bookIntroduction: bookIntroduction,
        bookNotes: bookNotes,
        bibleBooks: [bibleBook],
        verses: verses,
        verseTags: verseTags,
        verseNotes: verseNotes,
        marked: this.marked,
        referenceSeparator: separator,
        chapterText: bookShortTitle === 'Ps' ? "bible-browser.psalm" : "bible-browser.chapter",
        helper: {
          getNotesTooltip: notesHelper.getTooltipText,
          getLocalizedDate: i18nHelper.getLocalizedDate,
        }
      });

      const hasNotes = bookNotes !== null || getReferenceIdsFromNotes(verseNotes, startVerseNumber, startVerseNumber + numberOfVerses - 1).length > 0;

      renderFunction(verses_as_html, hasNotes);
      
    } else if (renderType == 'docx') {
      const notes = {
        [bookShortTitle.toLowerCase()]:  bookNotes,
        ...getNotesForSection(verseNotes, startVerseNumber, startVerseNumber + numberOfVerses - 1)
      };
      renderFunction(verses, notes);
    }
  }

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

  getBibleTranslationId(tab_index) {
    var bibleTranslationId = null;

    if (app_controller.tab_controller.getTab(tab_index).getBibleTranslationId() == null) {
      bibleTranslationId = app_controller.tab_controller.defaultBibleTranslationId;
    } else {
      bibleTranslationId = app_controller.tab_controller.getTab(tab_index).getBibleTranslationId();
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

    var bibleTranslationId = this.getBibleTranslationId(tab_index);

    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    var versification = await swordModuleHelper.getThreeLetterVersification(bibleTranslationId);

    var bibleBooks = await ipcDb.getBibleBooksFromSearchResults(search_results);
    var bookNames = await ipcGeneral.getBookNames(bibleBooks);
    var bibleBookStats = app_controller.module_search_controller.getBibleBookStatsFromSearchResults(search_results);
    var verses = [];

    for (let i = 0; i < search_results.length; i++) {
      const currentVerse = search_results[i];
      const currentBookId = currentVerse.bibleBookShortTitle;

      if (searchResultBookId != -1 && currentBookId != searchResultBookId) {
        // Skip the books that are not requested;
        continue;
      }

      verses.push(currentVerse);
    }

    var verseObjects = [];

    for (let i = 0; i < verses.length; i++) {
      const currentVerse = verses[i];
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
                                 tab_index,
                                 bibleBooks,
                                 bookNames,
                                 bibleBookStats,
                                 verseTags,
                                 verseNotes,
                                 verses,
                                 versification,
                                 render_function,
                                 searchResultBookId <= 0,
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

    var bibleTranslationId = this.getBibleTranslationId(tab_index);
    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    var versification = await swordModuleHelper.getThreeLetterVersification(bibleTranslationId);

    var verseReferences = await ipcDb.getVerseReferencesByTagIds(selected_tags);
    var verseReferenceIds = [];
    var verses = [];

    for (var i = 0; i < verseReferences.length; i++) {
      var currentVerseReference = verseReferences[i];
      verseReferenceIds.push(currentVerseReference.id);

      var currentAbsoluteVerseNumber = versification == 'eng' ? currentVerseReference.absoluteVerseNrEng : currentVerseReference.absoluteVerseNrHeb;

      var resultVerses = await ipcNsi.getBookText(bibleTranslationId,
                                                  currentVerseReference.bibleBookShortTitle,
                                                  currentAbsoluteVerseNumber,
                                                  1);
      var verse = resultVerses[0];

      if (verse !== undefined) {
        verses.push(verse);
      }
    }

    var bibleBookStats = this.getBibleBookStatsFromVerses(verses);
    var bibleBooks = await ipcDb.getBibleBooksFromTagIds(selected_tags);
    var bookNames = await ipcGeneral.getBookNames(bibleBooks);

    var verseTags = await ipcDb.getVerseTagsByVerseReferenceIds(verseReferenceIds, versification);
    var verseNotes = await ipcDb.getNotesByVerseReferenceIds(verseReferenceIds, versification);

    if (render_type == "html") {

      await this.getVersesAsHtml(current_tab_id,
                                 tab_index,
                                 bibleBooks,
                                 bookNames,
                                 bibleBookStats,
                                 verseTags,
                                 verseNotes,
                                 verses,
                                 versification,
                                 render_function,
                                 true,
                                 renderVerseMetaInfo);

    } else if (render_type == "docx") {
      render_function(verses, bibleBooks, verseTags);
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

    var bibleTranslationId = this.getBibleTranslationId(tab_index);
    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    var versification = await swordModuleHelper.getThreeLetterVersification(bibleTranslationId);

    var verseReferences = await ipcDb.getVerseReferencesByXrefs(xrefs);
    var verseReferenceIds = [];
    var verses = await ipcNsi.getVersesFromReferences(bibleTranslationId, xrefs);

    for (var i = 0; i < verseReferences.length; i++) {
      var currentVerseReference = verseReferences[i];

      if (currentVerseReference != undefined) {
        verseReferenceIds.push(currentVerseReference.id);
      }
    }

    var bibleBookStats = this.getBibleBookStatsFromVerses(verses);
    var bibleBooks = await ipcDb.getBibleBooksFromXrefs(xrefs);
    var bookNames = await ipcGeneral.getBookNames(bibleBooks);

    var verseTags = await ipcDb.getVerseTagsByVerseReferenceIds(verseReferenceIds, versification);
    var verseNotes = await ipcDb.getNotesByVerseReferenceIds(verseReferenceIds, versification);

    if (render_type == "html") {

      await this.getVersesAsHtml(current_tab_id,
                                 tab_index,
                                 bibleBooks,
                                 bookNames,
                                 bibleBookStats,
                                 verseTags,
                                 verseNotes,
                                 verses,
                                 versification,
                                 render_function,
                                 true,
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
    var verseCount = chapter !== null ? await ipcNsi.getChapterVerseCount(currentBibleTranslationId, book, chapter) : -1;

    await this.requestBookText(tabIndex, undefined, book, renderFunction, startVerseNr, verseCount, renderType);
  }

  async getVersesAsHtml(current_tab_id,
                        tabIndex, // TODO: Remove this parameter, because it is not used!
                        bibleBooks,
                        bookNames,
                        bibleBookStats,
                        groupedVerseTags,
                        groupedVerseNotes,
                        verses,
                        versification,
                        render_function,
                        renderBibleBookHeaders=true,
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
      renderVerseMetaInfo: renderVerseMetaInfo,
      bibleBooks: bibleBooks,
      bookNames: bookNames,
      bibleBookStats: bibleBookStats,
      verses: verses,
      verseTags: groupedVerseTags,
      verseNotes: groupedVerseNotes,
      marked: this.marked,
      referenceSeparator: separator,
      helper: {
        getNotesTooltip: notesHelper.getTooltipText,
        getLocalizedDate: i18nHelper.getLocalizedDate,
      }
    });

    render_function(verses_as_html, verses.length);
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

    verseListController.hideVerseListLoadingIndicator();
    verseListController.hideSearchProgressBar();
    var initialRendering = true;
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    var isInstantLoadingBook = true;
    if (currentTab.getTextType() == 'book') {
      isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(currentTab.getBibleTranslationId(), currentTab.getBook());
    }

    if (tabIndex === undefined) {
      tabIndex = app_controller.tab_controller.getSelectedTabIndex();
      initialRendering = false;
    }

    if (!initialRendering) {
      app_controller.tab_controller.getTab().setTextType(listType);
    }

    if (target === undefined) {
      //console.log("Undefined target. Getting verse list target based on tabIndex " + tabIndex);
      target = verseListController.getCurrentVerseList(tabIndex);
    }

    if (listType == 'book') {
      app_controller.tag_selection_menu.resetTagMenu();
      app_controller.module_search_controller.resetSearch(tabIndex);

      target.addClass('verse-list-book');

      if (this.platformHelper.isElectron() && hasNotes) {
        app_controller.docxExport.enableExportButton(tabIndex, 'NOTES');
      } else {
        app_controller.docxExport.disableExportButton(tabIndex);
      }

    } else if (listType == 'tagged_verses') {

      app_controller.module_search_controller.resetSearch(tabIndex);

      if (this.platformHelper.isElectron()) {
        app_controller.docxExport.enableExportButton(tabIndex, 'TAGS');
      }

      if (!currentTab.hasReferenceVerse()) {
        var tagTitleList = currentTab.getTagTitleList();
        var headerText = `<h2><span i18n="tags.verses-tagged-with">${i18n.t('tags.verses-tagged-with')}</span> <i>${tagTitleList}</i></h2>`;
        var verseListHeader = verseListController.getCurrentVerseListFrame(tabIndex).find('.verse-list-header');
        verseListHeader.html(headerText);
        verseListHeader.show();
      }

      target.removeClass('verse-list-book');

    } else if (listType == 'search_results') {

      //console.log("Rendering search results verse list on tab " + tabIndex);
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
      var verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
      var referenceVerseContainer = verseListFrame.find('.reference-verse');
      referenceVerseContainer.html(referenceVerseHtml);
      var referenceVerseBox = referenceVerseContainer.find('.verse-box');
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
      const headerWithResultNumber = `${verseListHeader.html()} (${numberOfTaggedVerses})`;
      verseListHeader.html(headerWithResultNumber);
    }

    if (listType == 'search_results') {
      const currentTab = app_controller.tab_controller.getTab(tabIndex);
      const currentSearchTerm = currentTab.getSearchTerm();
      app_controller.module_search_controller.highlightSearchResults(currentSearchTerm, tabIndex);
    }

    if (renderChart && (listType == 'search_results' || listType == 'tagged_verses')) {
      await app_controller.verse_statistics_chart.repaintChart(tabIndex);
    } else {
      await app_controller.verse_statistics_chart.resetChart(tabIndex);
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

      await eventController.publishAsync('on-bible-text-loaded', tabIndex);
      uiHelper.hideTextLoadingIndicator();
    }
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
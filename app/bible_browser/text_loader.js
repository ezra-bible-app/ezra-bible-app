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

class TextLoader {
  constructor() {
  }

  prepareForNewText(resetView, isSearch=false, tabIndex=undefined) {
    bible_browser_controller.module_search.hideModuleSearchHeader(tabIndex);
    bible_browser_controller.navigation_pane.initNavigationPaneForCurrentView(tabIndex);

    if (tabIndex === undefined) {
      if (bible_browser_controller.verse_selection != null) {
        bible_browser_controller.verse_selection.clear_verse_selection();
      }
    }

    var textType = bible_browser_controller.tab_controller.getTab(tabIndex).getTextType();    
    if (textType != 'book') {
      bible_browser_controller.book_selection_menu.clearSelectedBookInMenu();
    }

    if (resetView && (tabIndex == 0 || tabIndex == undefined)) {
      bible_browser_controller.resetVerseListView();
      var loadingMessage = "";

      if (isSearch) {
        var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
        var searchTerm = currentTab.getSearchTerm();
        loadingMessage = i18n.t("bible-browser.searching-for") + " <i>" + searchTerm + "</i>";
      } else {
        loadingMessage = i18n.t("bible-browser.loading-bible-text");
      }

      bible_browser_controller.showVerseListLoadingIndicator(loadingMessage, !isSearch /* Only show loader visualization if we are not searching */ );
    }

    var temporary_help = bible_browser_controller.getCurrentVerseListComposite(tabIndex).find('.temporary-help, .help-text');
    temporary_help.hide();
  }

  async requestTextUpdate(tabId, book, tagIdList, searchResults, tabIndex=undefined, requestedBookId=-1, target=undefined) {
    var textType = bible_browser_controller.tab_controller.getTab(tabIndex).getTextType();
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var buttons = currentVerseListMenu.find('.fg-button');
    buttons.removeClass('focused-button');

    if (textType == 'book') { // Book text mode
      if (tabIndex === undefined) { $('#export-tagged-verses-button').addClass('ui-state-disabled'); }
      bible_browser_controller.translation_controller.initChapterVerseCounts();
      currentVerseListMenu.find('.book-select-button').addClass('focused-button');

      await this.requestBookText(
        tabIndex,
        tabId,
        book,
        (htmlVerseList) => { 
          this.renderVerseList(htmlVerseList, 'book', tabIndex);
        }
      );

    } else if (textType == 'tagged_verses') { // Tagged verse list mode
      if (tabIndex === undefined) { $('.show-book-tag-statistics-button').addClass('ui-state-disabled'); }
      currentVerseListMenu.find('.tag-select-button').addClass('focused-button');

      await this.requestVersesForSelectedTags(
        tabIndex,
        tabId,
        tagIdList,
        (htmlVerseList) => {
          this.renderVerseList(htmlVerseList, 'tagged_verses', tabIndex);
        }
      );

    } else if (textType == 'search_results') { // Search result mode
      if (tabIndex === undefined) { $('.show-book-tag-statistics-button').addClass('ui-state-disabled'); }
      currentVerseListMenu.find('.module-search-button').addClass('focused-button');
      
      await this.requestVersesForSearchResults(
        tabIndex,
        tabId,
        searchResults,
        (htmlVerseList) => {
          this.renderVerseList(htmlVerseList, 'search_results', tabIndex, target);
        },
        requestedBookId
      );
    }
  }

  async requestBookText(tab_index,
                        current_tab_id,
                        book_short_title,
                        render_function,
                        start_verse_number=-1,
                        number_of_verses=-1) {

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab(tab_index).getBibleTranslationId();
    var localSwordModule = null;

    try {
      localSwordModule = nsi.getLocalModule(currentBibleTranslationId);
    } catch (e) {
      console.log("ERROR: Could not get local Sword module for " + currentBibleTranslationId);
    }

    if (currentBibleTranslationId == null || 
        currentBibleTranslationId == "" ||
        localSwordModule == null) {

      $('#verse-list-loading-indicator').hide();
      return;
    }

    var versification = (bible_browser_controller.translation_controller.getVersification(currentBibleTranslationId) == 'ENGLISH' ? 'eng' : 'heb');
    var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: book_short_title }});

    // Only necessary because old saved short titles may not be found directly
    if (bibleBook == null) {
      book_short_title = models.BibleBook.findBookTitle(book_short_title);
      bibleBook = await models.BibleBook.findOne({ where: { shortTitle: book_short_title }});
    }
    
    var verses = nsi.getBookText(currentBibleTranslationId, book_short_title, start_verse_number, number_of_verses);

    var verseTags = await bibleBook.getVerseTags();
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags, versification);
    var verseNotes = await bibleBook.getNotes();
    var groupedVerseNotes = models.Note.groupNotesByVerse(verseNotes, versification);

    var moduleLang = i18n.language;
    if (localSwordModule != null) {
      var moduleLang = localSwordModule.language;
    }

    var chapterText = await i18nHelper.getChapterTranslation(moduleLang);
    if (book_short_title == 'Ps') {
      chapterText = await i18nHelper.getPsalmTranslation(moduleLang);
    }

    var bookIntroduction = null;

    if (start_verse_number == -1) { // Only load book introduction if the whole book is requested
      try {        
        if (localSwordModule != null && localSwordModule.hasHeadings) {
          bookIntroduction = nsi.getBookIntroduction(currentBibleTranslationId, book_short_title);

          var sanitizeHtml = require('sanitize-html');
          bookIntroduction = sanitizeHtml(bookIntroduction);
        }
      } catch (e) {
        console.log("Could not retrieve book introduction for module " + currentBibleTranslationId);
      }
    }

    var marked = null;
    if (verseNotes.length > 0) {
      marked = require("marked");
    }

    var verses_as_html = verseListTemplate({
      versification: versification,
      verseListId: current_tab_id,
      renderVerseMetaInfo: true,
      renderBibleBookHeaders: false,
      // only render chapter headers with the full book requested
      renderChapterHeaders: (start_verse_number == -1),
      bookIntroduction: bookIntroduction,
      bibleBooks: [bibleBook],
      verses: verses,
      verseTags: groupedVerseTags,
      verseNotes: groupedVerseNotes,
      marked: marked,
      reference_separator: reference_separator,
      chapterText: chapterText,
      tagHint: i18n.t("bible-browser.tag-hint")
    });

    render_function(verses_as_html);
  }

  async requestVersesForSearchResults(tab_index,
                                      current_tab_id,
                                      search_results,
                                      render_function,
                                      requestedBookId=-1,
                                      render_type='html',
                                      renderVerseMetaInfo=true) {
    if (search_results.length == 0) {
      return;
    }

    var bibleTranslationId = null;
    if (bible_browser_controller.tab_controller.getTab(tab_index).getBibleTranslationId() == null) {
      bibleTranslationId = 1;
    } else {
      bibleTranslationId = bible_browser_controller.tab_controller.getTab(tab_index).getBibleTranslationId();
    }

    var versification = (bible_browser_controller.translation_controller.getVersification(bibleTranslationId) == 'ENGLISH' ? 'eng' : 'heb');

    var bibleBooks = await models.BibleBook.findBySearchResults(search_results);
    var bibleBookStats = bible_browser_controller.module_search.getBibleBookStatsFromSearchResults(search_results);
    var verses = [];

    for (var i = 0; i < search_results.length; i++) {
      var currentVerse = search_results[i];
      var currentBookId = currentVerse.bibleBookShortTitle;

      if (requestedBookId != -1 && currentBookId != requestedBookId) {
        // Skip the books that are not requested;
        continue;
      }

      verses.push(currentVerse);
    }

    var verseReferenceIds = [];
    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      var currentVerseReference = await models.VerseReference.findByBookAndAbsoluteVerseNumber(currentVerse.bibleBookShortTitle,
                                                                                               currentVerse.absoluteVerseNr,
                                                                                               versification);
      if (currentVerseReference.length > 0) {
        verseReferenceIds.push(currentVerseReference[0].id);
      }
    }

    var verseTags = await models.VerseTag.findByVerseReferenceIds(verseReferenceIds.join(','));
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags, versification);

    var verseNotes = await models.Note.findByVerseReferenceIds(verseReferenceIds.join(','));
    var groupedVerseNotes = models.Note.groupNotesByVerse(verseNotes, versification);
    
    if (render_type == "html") {
      
      this.getVersesAsHtml(current_tab_id,
                           bibleBooks,
                           bibleBookStats,
                           groupedVerseTags,
                           groupedVerseNotes,
                           verses,
                           versification,
                           render_function,
                           requestedBookId <= 0,
                           renderVerseMetaInfo);
      
    } else if (render_type == "docx") {
      render_function(bibleBooks, groupedVerseTags, verses);
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

    var bibleTranslationId = null;
        
    if (bible_browser_controller.tab_controller.getTab(tab_index).getBibleTranslationId() == null) {
      bibleTranslationId = bible_browser_controller.tab_controller.defaultBibleTranslationId;
    } else {
      bibleTranslationId = bible_browser_controller.tab_controller.getTab(tab_index).getBibleTranslationId();
    }

    var versification = (bible_browser_controller.translation_controller.getVersification(bibleTranslationId) == 'ENGLISH' ? 'eng' : 'heb');

    var verseReferences = await models.VerseReference.findByTagIds(selected_tags);
    var verseReferenceIds = [];
    var verses = [];

    for (var i = 0; i < verseReferences.length; i++) {
      var currentVerseReference = verseReferences[i];
      verseReferenceIds.push(currentVerseReference.id);

      var currentAbsoluteVerseNumber = versification == 'eng' ? currentVerseReference.absoluteVerseNrEng : currentVerseReference.absoluteVerseNrHeb;
      
      var verse = nsi.getBookText(bibleTranslationId,
                                  currentVerseReference.bibleBookShortTitle,
                                  currentAbsoluteVerseNumber,
                                  1)[0];

      if (verse !== undefined) {
        verses.push(verse);
      }
    }

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

    var bibleBooks = await models.BibleBook.findByTagIds(selected_tags);
    var verseTags = await models.VerseTag.findByVerseReferenceIds(verseReferenceIds.join(','));
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags, versification);

    var verseNotes = await models.Note.findByVerseReferenceIds(verseReferenceIds.join(','));
    var groupedVerseNotes = models.Note.groupNotesByVerse(verseNotes, versification);

    if (render_type == "html") {
      
      this.getVersesAsHtml(current_tab_id,
                           bibleBooks,
                           bibleBookStats,
                           groupedVerseTags,
                           groupedVerseNotes,
                           verses,
                           versification,
                           render_function,
                           true,
                           renderVerseMetaInfo);
    
    } else if (render_type == "docx") {
      render_function(bibleBooks, groupedVerseTags, verses);
    }
  }

  getVersesAsHtml(current_tab_id, bibleBooks, bibleBookStats, groupedVerseTags, groupedVerseNotes, verses, versification, render_function, renderBibleBookHeaders=true, renderVerseMetaInfo=true) {
    var verses_as_html = verseListTemplate({
      versification: versification,
      verseListId: current_tab_id,
      renderBibleBookHeaders: renderBibleBookHeaders,
      renderVerseMetaInfo: renderVerseMetaInfo,
      bibleBooks: bibleBooks,
      bibleBookStats: bibleBookStats,
      verses: verses,
      verseTags: groupedVerseTags,
      verseNotes: groupedVerseNotes,
      marked: marked,
      reference_separator: reference_separator,
      tagHint: i18n.t("bible-browser.tag-hint"),
      loadSearchResultsText: i18n.t("bible-browser.show-search-results")
    });

    render_function(verses_as_html, verses.length);
  }

  renderVerseList(htmlVerseList, listType, tabIndex=undefined, target=undefined) {
    bible_browser_controller.translation_controller.hideBibleTranslationLoadingIndicator();
    bible_browser_controller.hideVerseListLoadingIndicator();
    bible_browser_controller.hideSearchProgressBar();
    var initialRendering = true;

    if (tabIndex === undefined) {
      var tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
      initialRendering = false;
    }

    if (!initialRendering) {
      bible_browser_controller.tab_controller.getTab().setTextType(listType);
    }

    if (target === undefined) {
      //console.log("Undefined target. Getting verse list target based on tabIndex " + tabIndex);
      target = bible_browser_controller.getCurrentVerseList(tabIndex);
    }

    if (listType == 'book') {
      bible_browser_controller.tag_selection_menu.resetTagMenu();
      bible_browser_controller.module_search.resetSearch(tabIndex);

      target.addClass('verse-list-book');

    } else if (listType == 'tagged_verses') {

      bible_browser_controller.module_search.resetSearch(tabIndex);
      bible_browser_controller.taggedVerseExport.enableTaggedVersesExportButton(tabIndex);

      target.removeClass('verse-list-book');

    } else if (listType == 'search_results') {

      //console.log("Rendering search results verse list on tab " + tabIndex);
      bible_browser_controller.taggedVerseExport.enableTaggedVersesExportButton(tabIndex);

      target.removeClass('verse-list-book');
    }

    if (!initialRendering) {
      bible_browser_controller.tab_controller.saveTabConfiguration();
    }

    target.html(htmlVerseList);

    bible_browser_controller.initApplicationForVerseList(tabIndex);
  }
}

module.exports = TextLoader;


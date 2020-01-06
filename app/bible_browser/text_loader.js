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
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

class TextLoader {
  constructor() {
  }

  prepareForNewText(resetView, isSearch=false, tabIndex=undefined) {
    bible_browser_controller.module_search.hideModuleSearchHeader();
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

      bible_browser_controller.showVerseListLoadingIndicator(loadingMessage);
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
      if (tabIndex === undefined) { $('#show-book-tag-statistics-button').addClass('ui-state-disabled'); }
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
      if (tabIndex === undefined) { $('#show-book-tag-statistics-button').addClass('ui-state-disabled'); }
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
                        number_of_verses=0) {

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab(tab_index).getBibleTranslationId();

    if (currentBibleTranslationId == null || 
        currentBibleTranslationId == "") {

      $('#verse-list-loading-indicator').hide();
      return;
    }

    var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: book_short_title }});
    var verses = await bibleBook.getVerses(currentBibleTranslationId,
                                           start_verse_number,
                                           number_of_verses);

    var verseTags = await bibleBook.getVerseTags();
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);

    var chapterText = i18n.t("bible-browser.chapter");
    if (book_short_title == 'Psa') {
      chapterText = i18n.t("bible-browser.psalm");
    }

    var bookIntroduction = null;

    if (start_verse_number == -1) { // Only load book introduction if the whole book is requested
      try {
        var localSwordModule = nsi.getLocalModule(currentBibleTranslationId);
        
        if (localSwordModule != null && localSwordModule.hasHeadings) {
          bookIntroduction = nsi.getBookIntroduction(currentBibleTranslationId, book_short_title);
        }
      } catch (e) {
        console.log("Could not retrieve book introduction for module " + currentBibleTranslationId);
      }
    }

    var verses_as_html = verseListTemplate({
      verseListId: current_tab_id,
      renderVerseMetaInfo: true,
      renderBibleBookHeaders: false,
      // only render chapter headers with the full book requested
      renderChapterHeaders: (start_verse_number == -1),
      bookIntroduction: bookIntroduction,
      bibleBooks: [bibleBook],
      verses: verses,
      verseTags: groupedVerseTags,
      reference_separator: reference_separator,
      chapterText: chapterText,
      tagHint: i18n.t("bible-browser.tag-hint")
    });

    render_function(verses_as_html);
  }

  getBibleBookStatsFromSearchResults(search_results) {
    var bibleBookStats = {};

    for (var i = 0; i < search_results.length; i++) {
      var bibleBookId = models.BibleTranslation.swordBooktoEzraBook(search_results[i].bibleBookShortTitle);
      
      if (bibleBookStats[bibleBookId] === undefined) {
        bibleBookStats[bibleBookId] = 1;
      } else {
        bibleBookStats[bibleBookId] += 1;
      }
    }

    return bibleBookStats;
  }

  async getDbVersesFromSearchResults(bibleTranslationId, requestedBookId, search_results) {
    var verses = [];

    for (var i = 0; i < search_results.length; i++) {
      var currentResult = search_results[i];
      var currentBookId = models.BibleTranslation.swordBooktoEzraBook(search_results[i].bibleBookShortTitle);

      if (requestedBookId != -1 && currentBookId != requestedBookId) {
        // Skip the books that are not requested;
        continue;
      }

      var currentVerse = await models.Verse.findBySearchResult(bibleTranslationId, currentResult);
      if (currentVerse != null) {
        verses.push(currentVerse);
      } else {
        console.log("Could not find verse for the following search result: ")
        console.log(currentResult);
      }
    }

    return verses;
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

    var bibleBooks = await models.BibleBook.findBySearchResults(search_results);
    var bibleBookStats = this.getBibleBookStatsFromSearchResults(search_results);
    var verses = await this.getDbVersesFromSearchResults(bibleTranslationId, requestedBookId, search_results);

    var verseIds = [];
    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      verseIds.push(currentVerse.id);
    }

    var verseTags = await models.VerseTag.findByVerseIds(bibleTranslationId, verseIds.join(','));
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);
    
    if (render_type == "html") {
      
      this.getVersesAsHtml(current_tab_id,
                           bibleBooks,
                           bibleBookStats,
                           groupedVerseTags,
                           verses,
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
      bibleTranslationId = 1;
    } else {
      bibleTranslationId = bible_browser_controller.tab_controller.getTab(tab_index).getBibleTranslationId();
    }

    var verses = await models.Verse.findByTagIds(bibleTranslationId, selected_tags);
    var verseIds = [];
    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      verseIds.push(currentVerse.id);
    }

    var bibleBookStats = {};
    for (var i = 0; i < verses.length; i++) {
      var bibleBookId = verses[i].bibleBookId;
      
      if (bibleBookStats[bibleBookId] === undefined) {
        bibleBookStats[bibleBookId] = 1;
      } else {
        bibleBookStats[bibleBookId] += 1;
      }
    }

    var bibleBooks = await models.BibleBook.findByTagIds(selected_tags);
    var verseTags = await models.VerseTag.findByVerseIds(bibleTranslationId, verseIds.join(','));
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);

    if (render_type == "html") {
      
      this.getVersesAsHtml(current_tab_id,
                           bibleBooks,
                           bibleBookStats,
                           groupedVerseTags,
                           verses,
                           render_function,
                           true,
                           renderVerseMetaInfo);
    
    } else if (render_type == "docx") {
      render_function(bibleBooks, groupedVerseTags, verses);
    }
  }

  getVersesAsHtml(current_tab_id, bibleBooks, bibleBookStats, groupedVerseTags, verses, render_function, renderBibleBookHeaders=true, renderVerseMetaInfo=true) {
    var verses_as_html = verseListTemplate({
      verseListId: current_tab_id,
      renderBibleBookHeaders: renderBibleBookHeaders,
      renderVerseMetaInfo: renderVerseMetaInfo,
      bibleBooks: bibleBooks,
      bibleBookStats: bibleBookStats,
      verses: verses,
      verseTags: groupedVerseTags,
      reference_separator: reference_separator,
      tagHint: i18n.t("bible-browser.tag-hint"),
      loadSearchResultsText: i18n.t("bible-browser.show-search-results")
    });

    render_function(verses_as_html, verses.length);
  }

  renderVerseList(htmlVerseList, listType, tabIndex=undefined, target=undefined) {
    bible_browser_controller.translation_controller.hideBibleTranslationLoadingIndicator();
    bible_browser_controller.hideVerseListLoadingIndicator();
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
      bible_browser_controller.enableToolbox();
      bible_browser_controller.tag_selection_menu.resetTagMenu();
      bible_browser_controller.module_search.resetSearch();

      target.addClass('verse-list-book');

    } else if (listType == 'tagged_verses') {

      bible_browser_controller.module_search.resetSearch();
      bible_browser_controller.enableTaggingToolboxOnly();
      bible_browser_controller.taggedVerseExport.enableTaggedVersesExportButton(tabIndex);

      target.removeClass('verse-list-book');

    } else if (listType == 'search_results') {

      //console.log("Rendering search results verse list on tab " + tabIndex);
      bible_browser_controller.enableTaggingToolboxOnly();
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


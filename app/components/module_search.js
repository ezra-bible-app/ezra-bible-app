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

const VerseSearch = require('../tab_search/verse_search.js');
const VerseStatisticsChart = require('./verse_statistics_chart.js');

class ModuleSearch {
  constructor() {
    this.currentSearchTerm = null;
    this.search_menu_opened = false;
    this.verseSearch = new VerseSearch();
    this.verseStatisticsChart = new VerseStatisticsChart();
  }

  initModuleSearchMenu(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.module-search-button').bind('click', (event) => { this.handleSearchMenuClick(event); });
    
    // Handle the click on the search button
    $('#start-module-search-button:not(.bound)').addClass('bound').bind('click', (event) => { this.startSearch(event); });

    // Handle the enter key in the search field and start the search when it is pressed
    $('#module-search-input:not(.bound)').addClass('bound').on("keypress", (event) => {
      if (event.which == 13) {
        this.startSearch(event);
      }
    }).on("keyup", () => {
      this.validateSearchTerm();
    });

    var selectField = document.getElementById('module-search-menu').querySelector('#search-type');
    $(selectField).on("change", () => {
      this.validateSearchTerm();
    });
  }

  validateSearchTerm() {
    if (this.getSearchType() == "strongsNumber") {
      this.validateStrongsKey();
    } else {
      this.setModuleSearchValid();
    }
  }

  hideSearchMenu() {
    if (this.search_menu_opened) {
      $('#app-container').find('#module-search-menu').hide();
      this.search_menu_opened = false;

      var module_search_button = $('#app-container').find('.module-search-button');
      module_search_button.removeClass('ui-state-active');
    }
  }

  resetSearch(tabIndex=undefined) {
    $('#module-search-input').val('');
    $('#search-type')[0].value = "phrase";
    $('#search-is-case-sensitive').prop("checked", false);
    $('#search-extended-verse-boundaries').prop("checked", false);
    this.hideModuleSearchHeader(tabIndex);
    this.verseStatisticsChart.resetChart(tabIndex);
  }

  hideModuleSearchHeader(tabIndex=undefined) {
    this.getModuleSearchHeader(tabIndex).hide();
  }

  populateSearchMenu(tabIndex) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var searchType = currentTab.getSearchOptions()['searchType'];
      var isCaseSensitive = currentTab.getSearchOptions()['caseSensitive'];
      var useExtendedVerseBoundaries = currentTab.getSearchOptions()['extendedVerseBoundaries'];
      var searchTerm = currentTab.getSearchTerm();

      $('#search-type').val(searchType);
      $('#search-is-case-sensitive').prop("checked", isCaseSensitive);
      $('#search-extended-verse-boundaries').prop("checked", useExtendedVerseBoundaries);
      $('#module-search-input').val(searchTerm);
    }
  }

  handleSearchMenuClick(event) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var moduleSearchButton = currentVerseListMenu.find('.module-search-button');

    if (moduleSearchButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.search_menu_opened) {
      bible_browser_controller.handleBodyClick();
    } else {
      bible_browser_controller.book_selection_menu.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hideTagMenu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();
      bible_browser_controller.tag_assignment_menu.hideTagAssignmentMenu();
      moduleSearchButton.addClass('ui-state-active');

      var module_search_button_offset = moduleSearchButton.offset();
      var menu = $('#app-container').find('#module-search-menu');
      var top_offset = module_search_button_offset.top + moduleSearchButton.height() + 12;
      var left_offset = module_search_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#module-search-menu').show();
      $('#module-search-input').focus(function() { $(this).select(); } );
      $('#module-search-input').focus();

      this.search_menu_opened = true;
      event.stopPropagation();
    }
  }

  getSearchTerm() {
    return $('#module-search-input').val();
  }

  getSearchType() {
    var selectField = document.getElementById('module-search-menu').querySelector('#search-type');
    var selectedValue = selectField.options[selectField.selectedIndex].value;
    return selectedValue;
  }

  isCaseSensitive() {
    return $('#search-is-case-sensitive').prop("checked");
  }

  useExtendedVerseBoundaries() {
    return $('#search-extended-verse-boundaries').prop("checked");
  }

  getModuleSearchHeader(tabIndex=undefined) {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    return currentVerseListFrame.find('.module-search-result-header');
  }

  searchResultsExceedPerformanceLimit(index=undefined) {
    if (index === undefined) {
      index = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }

    var currentSearchResults = bible_browser_controller.tab_controller.getTab(index)?.getSearchResults();
    return currentSearchResults?.length > 500;
  }

  validateStrongsKey() {
    if (!bible_browser_controller.dictionary_controller.isValidStrongsKey(this.getSearchTerm())) {
      $('#module-search-validation-message').css('visibility', 'visible');
      $('#module-search-validation-message').prop('title', i18n.t('bible-browser.strongs-number-not-valid'));
      $('#start-module-search-button').addClass('ui-state-disabled');
    } else {
      this.setModuleSearchValid();
    }
  }

  setModuleSearchValid() {
    $('#module-search-validation-message').css('visibility', 'hidden');
    $('#module-search-validation-message').prop('title', '');
    $('#start-module-search-button').removeClass('ui-state-disabled');
  }

  async startSearch(event, tabIndex=undefined, searchTerm=undefined) {
    if (event != null) {
      event.stopPropagation();
    }
    
    if (searchTerm !== undefined) {
      this.currentSearchTerm = searchTerm;
    } else {
      this.currentSearchTerm = this.getSearchTerm();
    }

    if (this.currentSearchTerm.length == 0) {
      return;
    }

    this.verseStatisticsChart.resetChart(tabIndex);

    if (tabIndex === undefined) {
      var tab = bible_browser_controller.tab_controller.getTab();
      tab.setSearchOptions(this.getSearchType(), this.isCaseSensitive(), this.useExtendedVerseBoundaries());
      tab.setTextType('search_results');
    }

    //console.log("Starting search for " + this.currentSearchTerm + " on tab " + tabIndex);
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var currentBibleTranslationId = currentTab.getBibleTranslationId();
      var searchType = currentTab.getSearchOptions()['searchType'];
      var isCaseSensitive = currentTab.getSearchOptions()['caseSensitive'];
      var useExtendedVerseBoundaries = currentTab.getSearchOptions()['extendedVerseBoundaries'];

      if (searchType == "strongsNumber" && event != null) {
        if (!bible_browser_controller.dictionary_controller.isValidStrongsKey(this.currentSearchTerm)) {
          return;
        }

        bible_browser_controller.dictionary_controller.showStrongsInfo(this.currentSearchTerm, false /* do not show strongs box */);
      }

      bible_browser_controller.tab_controller.setTabSearch(this.currentSearchTerm, tabIndex);
      // Set book, tagIdList and xrefs to null, since we just switched to search content
      currentTab.setBook(null, null);
      currentTab.setTagIdList("");
      currentTab.setXrefs(null);
      bible_browser_controller.tag_selection_menu.resetTagMenu();

      this.hideSearchMenu();

      if (tabIndex == 0 || tabIndex == undefined) {
        var searchProgressBar = bible_browser_controller.getCurrentSearchProgressBar();
        uiHelper.initProgressBar(searchProgressBar);
        searchProgressBar.show();
      }

      // Only reset view if we got an event (in other words: not initially)
      bible_browser_controller.text_loader.prepareForNewText(event != null, true, tabIndex);

      try {
        var searchResults = await nsi.getModuleSearchResults(currentBibleTranslationId,
                                                             this.currentSearchTerm,
                                                             (progress) => {
                                                              var progressPercent = progress.totalPercent;
                                                              searchProgressBar.progressbar("value", progressPercent);
                                                             },
                                                             searchType,
                                                             isCaseSensitive,
                                                             useExtendedVerseBoundaries);

        //console.log("Got " + searchResults.length + " from Sword");
        currentTab.setSearchResults(searchResults);

        var requestedBookId = -1; // all books requested
        if (this.searchResultsExceedPerformanceLimit(tabIndex)) {
          requestedBookId = 0; // no books requested - only list headers at first
        }
  
        await this.renderCurrentSearchResults(requestedBookId, tabIndex);
      } catch (error) {
        console.log(error);
        bible_browser_controller.hideVerseListLoadingIndicator();
      }
    }
  }

  highlightSearchResults(searchTerm, tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    var verses = currentVerseList[0].querySelectorAll('.verse-text');

    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      var searchType = this.getSearchType();
      var isCaseSensitive = this.isCaseSensitive();
      var useExtendedVerseBoundaries = this.useExtendedVerseBoundaries();
      this.verseSearch.doVerseSearch(currentVerse, searchTerm, searchType, isCaseSensitive, useExtendedVerseBoundaries);
    }
  }

  async renderCurrentSearchResults(requestedBookId=-1, tabIndex=undefined, target=undefined, cachedText=null) {
    //console.log("Rendering search results on tab " + tabIndex);
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId(tabIndex);
    var currentSearchTerm = currentTab?.getSearchTerm();
    var currentSearchResults = currentTab?.getSearchResults();

    if (currentSearchResults?.length > 0) {
      await bible_browser_controller.text_loader.requestTextUpdate(currentTabId,
                                                                   null,
                                                                   null,
                                                                   cachedText,
                                                                   null,
                                                                   currentSearchResults,
                                                                   null,
                                                                   tabIndex,
                                                                   requestedBookId,
                                                                   target);
      
    } else {
      bible_browser_controller.hideVerseListLoadingIndicator();
      bible_browser_controller.translation_controller.hideBibleTranslationLoadingIndicator();
      bible_browser_controller.hideSearchProgressBar();
    }

    this.hideSearchMenu();
    var moduleSearchHeaderText;

    if (currentSearchResults?.length > 0) {
      moduleSearchHeaderText = i18n.t("bible-browser.search-result-header") + ' <i>' + currentSearchTerm + '</i> (' + currentSearchResults.length + ')';
    } else {
      moduleSearchHeaderText = i18n.t("bible-browser.no-search-results") + ' <i>' + currentSearchTerm + '</i>';
    }

    var header = "<h2>" + moduleSearchHeaderText + "</h2>";

    if (this.searchResultsExceedPerformanceLimit(tabIndex)) {
      var performanceHintText = i18n.t("bible-browser.search-performance-hint");
      header += "<div style='margin-left: 0.6em; margin-top: 1em;'>" + performanceHintText + "</div>";
    }

    this.getModuleSearchHeader(tabIndex).html(header);
    this.getModuleSearchHeader(tabIndex).show();

    if (currentSearchResults?.length > 0 && requestedBookId <= 0) {
      var bibleBookStats = this.getBibleBookStatsFromSearchResults(currentSearchResults);
      this.verseStatisticsChart.updateChart(tabIndex, bibleBookStats);
    }
  }

  repaintChart(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentSearchResults = currentTab?.getSearchResults();

    if (currentSearchResults != null) {
      var bibleBookStats = this.getBibleBookStatsFromSearchResults(currentSearchResults);
      this.verseStatisticsChart.resetChart(tabIndex);
      this.verseStatisticsChart.updateChart(tabIndex, bibleBookStats);
    }
  }

  repaintAllCharts() {
    var tabCount = bible_browser_controller.tab_controller.getTabCount();

    for (var i = 0; i < tabCount; i++) {
      var currentTab = bible_browser_controller.tab_controller.getTab(i);
      if (currentTab.getTextType() == 'search_results') {
        this.repaintChart(i);
      }
    }
  }

  getBibleBookStatsFromSearchResults(search_results) {
    var bibleBookStats = {};

    for (var i = 0; i < search_results.length; i++) {
      var bibleBookId = search_results[i].bibleBookShortTitle;

      if (bibleBookStats[bibleBookId] === undefined) {
        bibleBookStats[bibleBookId] = 1;
      } else {
        bibleBookStats[bibleBookId] += 1;
      }
    }

    return bibleBookStats;
  }

  loadBookResults(bookId) {
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    
    var bookSection = $('#' + currentTabId).find('#' + currentTabId + '-book-section-' + bookId);
    this.renderCurrentSearchResults(bookId, undefined, bookSection);
  }
}

module.exports = ModuleSearch;

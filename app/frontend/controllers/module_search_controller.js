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

const VerseSearch = require('../components/tab_search/verse_search.js');

const CANCEL_SEARCH_PERCENT_LIMIT = 90;

/**
 * The ModuleSearch controller implements the module search functionality.
 * It uses the VerseSearch component for highlighting search results.
 * 
 * @category Controller
 */
class ModuleSearchController {
  constructor() {
    this.currentSearchTerm = null;
    this.search_menu_opened = false;
    this.verseSearch = new VerseSearch();
    this.searchResultPerformanceLimit = platformHelper.getSearchResultPerformanceLimit();
  }

  initModuleSearch(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
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

    var cancelSearchButtonContainer = app_controller.getCurrentSearchCancelButtonContainer(tabIndex);
    var cancelSearchButton = cancelSearchButtonContainer.find('button');

    cancelSearchButton[0].addEventListener('mousedown', async () => {
      this.cancelModuleSearch();
    });
  }

  async cancelModuleSearch() {
    this.disableCancelButton();

    var tab = app_controller.tab_controller.getTab(this.currentSearchTabIndex);
    if (tab != null) {
      tab.setSearchCancelled(true);
    }

    this.enableOtherFunctionsAfterSearch();

    var currentProgressValue = this.getCurrentProgressValue();

    if (currentProgressValue != null && !isNaN(currentProgressValue)) {
      if (currentProgressValue <= CANCEL_SEARCH_PERCENT_LIMIT) {
        await ipcNsi.terminateModuleSearch();
      }
    }
  }

  getCurrentProgressValue() {
    var searchProgressBar = app_controller.getCurrentSearchProgressBar(this.currentSearchTabIndex);
    var currentProgressValue = null;

    try {
      currentProgressValue = parseInt(searchProgressBar[0].getAttribute("aria-valuenow"));
    } catch (e) {}

    return currentProgressValue;
  }

  disableCancelButton() {
    var cancelSearchButtonContainer = app_controller.getCurrentSearchCancelButtonContainer(this.currentSearchTabIndex);
    var cancelSearchButton = cancelSearchButtonContainer.find('button');

    cancelSearchButton.removeClass('ui-state-active');
    cancelSearchButton.addClass('ui-state-disabled');
  }

  getAllMenuButtonSelectors() {
    return [
      '.book-select-button',
      '.tag-select-button',
      '.assign-tag-menu-button',
      '.new-standard-tag-button',
      '.display-options-button',
      '.text-size-settings-button'
    ];
  }

  toggleMenuButtons(enable=true) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var allMenuButtonSelectors = this.getAllMenuButtonSelectors();

    allMenuButtonSelectors.forEach((selector) => {
      var button = currentVerseListMenu.find(selector);

      if (enable) {
        button.removeClass('ui-state-disabled');
      } else {
        button.addClass('ui-state-disabled');
      }
    });
  }

  disableOtherFunctionsDuringSearch() {
    this.toggleMenuButtons(false);

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    bibleSelect.selectmenu("disable");
  }

  enableOtherFunctionsAfterSearch() {
    this.toggleMenuButtons(true);

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(this.currentSearchTabIndex);
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    bibleSelect.selectmenu("enable");
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
    app_controller.verse_statistics_chart.resetChart(tabIndex);
  }

  hideModuleSearchHeader(tabIndex=undefined) {
    this.getModuleSearchHeader(tabIndex).hide();
  }

  populateSearchMenu(tabIndex) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

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
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var moduleSearchButton = currentVerseListMenu.find('.module-search-button');

    if (moduleSearchButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.search_menu_opened) {
      app_controller.handleBodyClick();
    } else {
      app_controller.hideAllMenus();

      moduleSearchButton.addClass('ui-state-active');

      var module_search_button_offset = moduleSearchButton.offset();
      var menu = $('#app-container').find('#module-search-menu');
      var top_offset = module_search_button_offset.top + moduleSearchButton.height() + 1;
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
    return document.getElementById('module-search-input').value;
  }

  getSearchType() {
    var selectField = document.getElementById('module-search-menu').querySelector('#search-type');
    var selectedValue = selectField.options[selectField.selectedIndex].value;
    return selectedValue;
  }

  isCaseSensitive() {
    return document.getElementById('search-is-case-sensitive').checked;
  }

  useExtendedVerseBoundaries() {
    return document.getElementById('search-extended-verse-boundaries').checked;
  }

  getModuleSearchHeader(tabIndex=undefined) {
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    return currentVerseListFrame.find('.verse-list-header');
  }

  searchResultsExceedPerformanceLimit(index=undefined) {
    if (index === undefined) {
      index = app_controller.tab_controller.getSelectedTabIndex();
    }

    var currentSearchResults = app_controller.tab_controller.getTab(index).getSearchResults();
    return currentSearchResults.length > this.searchResultPerformanceLimit;
  }

  validateStrongsKey() {
    if (!app_controller.dictionary_controller.isValidStrongsKey(this.getSearchTerm())) {
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

    this.currentSearchTabIndex = app_controller.tab_controller.getSelectedTabIndex();

    // Do not allow another concurrent search, disable the search menu button
    $('.module-search-button').addClass('ui-state-disabled');

    this.disableOtherFunctionsDuringSearch();

    app_controller.verse_statistics_chart.resetChart(tabIndex);

    if (tabIndex === undefined) {
      var tab = app_controller.tab_controller.getTab();
      tab.setSearchOptions(this.getSearchType(), this.isCaseSensitive(), this.useExtendedVerseBoundaries());
      tab.setTextType('search_results');
      tab.setSearchCancelled(false);
    }

    //console.log("Starting search for " + this.currentSearchTerm + " on tab " + tabIndex);
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var currentBibleTranslationId = currentTab.getBibleTranslationId();
      var searchType = currentTab.getSearchOptions()['searchType'];
      var isCaseSensitive = currentTab.getSearchOptions()['caseSensitive'];
      var useExtendedVerseBoundaries = currentTab.getSearchOptions()['extendedVerseBoundaries'];

      if (searchType == "strongsNumber" && event != null) {
        if (!app_controller.dictionary_controller.isValidStrongsKey(this.currentSearchTerm)) {
          return;
        }

        app_controller.dictionary_controller.showStrongsInfo(this.currentSearchTerm, false /* do not show strongs box */);
      }

      app_controller.tab_controller.setTabSearch(this.currentSearchTerm, tabIndex);
      // Set book, tagIdList and xrefs to null, since we just switched to search content
      currentTab.setBook(null, null);
      currentTab.setTagIdList("");
      currentTab.setXrefs(null);
      currentTab.setVerseReferenceId(null);
      app_controller.tag_selection_menu.resetTagMenu();

      this.hideSearchMenu();

      if (tabIndex == undefined || tabIndex == app_controller.tab_controller.getSelectedTabIndex()) {
        var searchProgressBar = app_controller.getCurrentSearchProgressBar();
        var cancelSearchButtonContainer = app_controller.getCurrentSearchCancelButtonContainer(tabIndex);
        var cancelSearchButton = cancelSearchButtonContainer.find('button');
        cancelSearchButton.removeClass('ui-state-disabled');

        uiHelper.initProgressBar(searchProgressBar);
        searchProgressBar.show();
        cancelSearchButtonContainer.show();
      }

      // Only reset view if we got an event (in other words: not initially)
      await app_controller.text_controller.prepareForNewText(event != null, true, tabIndex);

      try {
        Sentry.addBreadcrumb({category: "app",
                              message: `Performing module search in ${currentBibleTranslationId}`,
                              level: Sentry.Severity.Info});

        var searchResults = await ipcNsi.getModuleSearchResults((progress) => {
                                                                  var progressPercent = progress.totalPercent;
                                                                  searchProgressBar.progressbar("value", progressPercent);
                                                                  if (progressPercent >= CANCEL_SEARCH_PERCENT_LIMIT) {
                                                                    this.disableCancelButton();
                                                                  }
                                                                },
                                                                currentBibleTranslationId,
                                                                this.currentSearchTerm,
                                                                searchType,
                                                                isCaseSensitive,
                                                                useExtendedVerseBoundaries);

        //console.log("Got " + searchResults.length + " from Sword");
        currentTab.setSearchResults(searchResults);

        var requestedBookId = -1; // all books requested
        if (this.searchResultsExceedPerformanceLimit(this.currentSearchTabIndex)) {
          requestedBookId = 0; // no books requested - only list headers at first
        }
  
        await this.renderCurrentSearchResults(requestedBookId, this.currentSearchTabIndex);
      } catch (error) {
        console.log(error);
        app_controller.hideVerseListLoadingIndicator();
        this.enableOtherFunctionsAfterSearch();
      }
    }

    // We're done with the search and so we're re-enabling the search menu button
    $('.module-search-button').removeClass('ui-state-disabled');
  }

  highlightSearchResults(searchTerm, tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var verses = currentVerseList[0].querySelectorAll('.verse-text');

    var searchType = this.getSearchType();
    var isCaseSensitive = this.isCaseSensitive();
    var useExtendedVerseBoundaries = this.useExtendedVerseBoundaries();

    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      this.verseSearch.doVerseSearch(currentVerse, searchTerm, searchType, isCaseSensitive, useExtendedVerseBoundaries);
    }
  }

  async renderCurrentSearchResults(requestedBookId=-1, tabIndex=undefined, target=undefined, cachedText=null) {
    //console.log("Rendering search results on tab " + tabIndex);
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentTabId = app_controller.tab_controller.getSelectedTabId(tabIndex);
    var currentSearchTerm = currentTab.getSearchTerm();
    var currentSearchResults = currentTab.getSearchResults();

    if (currentSearchResults.length > 0) {
      await app_controller.text_controller.requestTextUpdate(currentTabId,
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
      app_controller.hideVerseListLoadingIndicator(this.currentSearchTabIndex);
      uiHelper.hideTextLoadingIndicator(this.currentSearchTabIndex);
      app_controller.hideSearchProgressBar(this.currentSearchTabIndex);
    }

    this.hideSearchMenu();
    var moduleSearchHeaderText;

    if (currentSearchResults.length > 0) {
      moduleSearchHeaderText = i18n.t("bible-browser.search-result-header") + ' <i>' + currentSearchTerm + '</i> (' + currentSearchResults.length + ')';
    } else {
      var tab = app_controller.tab_controller.getTab(tabIndex);
      var searchCancelled = tab != null ? tab.isSearchCancelled() : false;

      if (searchCancelled) {
        moduleSearchHeaderText = i18n.t("bible-browser.module-search-cancelled") + ' <i>' + currentSearchTerm + '</i>';
      } else {
        moduleSearchHeaderText = i18n.t("bible-browser.no-search-results") + ' <i>' + currentSearchTerm + '</i>';
      }
    }

    var header = "<h2>" + moduleSearchHeaderText + "</h2>";

    if (this.searchResultsExceedPerformanceLimit(tabIndex)) {
      var performanceHintText = i18n.t("bible-browser.search-performance-hint");
      header += "<div style='margin-left: 0.6em; margin-top: 1em;'>" + performanceHintText + "</div>";
    }

    var moduleSearchHeader = this.getModuleSearchHeader(tabIndex);

    moduleSearchHeader.html(header);

    if (currentSearchResults.length > 0) {
      var selectAllSearchResultsButton = document.createElement('button');
      selectAllSearchResultsButton.setAttribute('style', 'margin: 0.5em;');
      selectAllSearchResultsButton.classList.add('select-all-search-results-button');
      selectAllSearchResultsButton.classList.add('fg-button');
      selectAllSearchResultsButton.classList.add('ui-corner-all');
      selectAllSearchResultsButton.classList.add('ui-state-default');
      if (this.searchResultsExceedPerformanceLimit(tabIndex)) {
        selectAllSearchResultsButton.classList.add('ui-state-disabled');
      }

      selectAllSearchResultsButton.innerText = i18n.t('bible-browser.select-all-search-results');
      moduleSearchHeader.append(selectAllSearchResultsButton);

      selectAllSearchResultsButton.onclick = this.selectAllSearchResults;
      uiHelper.configureButtonStyles('.verse-list-header');
    }

    moduleSearchHeader.show();

    /*if (currentSearchResults.length > 0 && requestedBookId <= 0) {
      var bibleBookStats = this.getBibleBookStatsFromSearchResults(currentSearchResults);
      await app_controller.verse_statistics_chart.updateChart(tabIndex, bibleBookStats);
    }*/

    this.enableOtherFunctionsAfterSearch();
  }

  selectAllSearchResults() {
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame();
    var allVerseTextElements = currentVerseListFrame.find('.verse-text');
    allVerseTextElements.addClass('ui-selected');
    app_controller.verse_selection.updateSelected();
    app_controller.verse_selection.updateViewsAfterVerseSelection(i18n.t('bible-browser.all-search-results'));
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
    var currentTabId = app_controller.tab_controller.getSelectedTabId();
    
    var bookSection = $('#' + currentTabId).find('#' + currentTabId + '-book-section-' + bookId);
    this.renderCurrentSearchResults(bookId, undefined, bookSection);
  }
}

module.exports = ModuleSearchController;

/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const eventController = require('./event_controller.js');
const {waitUntilIdle} = require('../helpers/ezra_helper.js');
const VerseSearch = require('../components/tab_search/verse_search.js');
const verseListController = require('../controllers/verse_list_controller.js');

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

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      await waitUntilIdle();

      // Cancel any potentially ongoing module search
      await this.cancelAnyModuleSearch();

      // Populate search menu based on last search (if any)
      this.populateSearchMenu(tabIndex);
    });

    eventController.subscribe('on-tab-added', async (tabIndex) => {
      // Cancel any potentially ongoing module search
      await this.cancelAnyModuleSearch();

      this.initModuleSearch(tabIndex);
    });
  }

  initModuleSearch(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.module-search-button').unbind('click').bind('click', (event) => { this.handleSearchMenuClick(event); });
    
    // Handle the click on the search button
    $('#start-module-search-button:not(.bound)').addClass('bound').bind('click', (event) => { this.startSearch(event); });

    let moduleSearchInput = document.getElementById('module-search-input');

    if (!moduleSearchInput.classList.contains('bound')) {
      moduleSearchInput.classList.add('bound');

      if (platformHelper.isCordova()) {
        // Handle the enter key in the search field and start the search when it is pressed
        moduleSearchInput.addEventListener('beforeinput', (event) => {
          const lastCharacter = event.data[event.data.length - 1];

          if (lastCharacter == '\n') {
            this.startSearch(event);
          }
        });
      } else {
        // Handle the enter key in the search field and start the search when it is pressed
        moduleSearchInput.addEventListener('keydown', (event) => {
          if (event.keyCode == 13) {
            this.startSearch(event);
          }
        });
      }

      moduleSearchInput.addEventListener('keyup', () => {
        this.validateSearchTerm();
      });
    }


    var searchTypeField = document.getElementById('module-search-menu').querySelector('#search-type');
    $(searchTypeField).on("change", () => {
      this.validateSearchTerm();
    });

    var searchScopeField = document.getElementById('module-search-menu').querySelector('#search-scope');
    $(searchScopeField).on("change", () => {
      this.validateSearchTerm();
    });

    var cancelSearchButtonContainer = verseListController.getCurrentSearchCancelButtonContainer(tabIndex);
    var cancelSearchButton = cancelSearchButtonContainer.find('button');

    cancelSearchButton[0].addEventListener('mousedown', async () => {
      this.cancelModuleSearch();
    });
  }

  async cancelAnyModuleSearch() {
    for (let i = 0; i < app_controller.tab_controller.getTabCount(); i++) {
      let tab = app_controller.tab_controller.getTab(i);
      if (tab.getTextType() == 'search_results') {
        this.cancelModuleSearch(i);
      }
    }
  }

  async cancelModuleSearch(tabIndex=undefined) {
    this.disableCancelButton();

    if (tabIndex === undefined) {
      tabIndex = this.currentSearchTabIndex;
    }

    var tab = app_controller.tab_controller.getTab(tabIndex);
    if (tab != null) {
      tab.setSearchCancelled(true);
    }

    this.enableOtherFunctionsAfterSearch();

    var currentProgressValue = this.getCurrentProgressValue(tabIndex);

    if (currentProgressValue != null && !isNaN(currentProgressValue)) {
      if (currentProgressValue <= CANCEL_SEARCH_PERCENT_LIMIT) {
        await ipcNsi.terminateModuleSearch();
      }
    }
  }

  getCurrentProgressValue(tabIndex=undefined) {
    if (tabIndex === undefined) {
      tabIndex = this.currentSearchTabIndex;
    }

    var searchProgressBar = verseListController.getCurrentSearchProgressBar(tabIndex);
    var currentProgressValue = null;

    try {
      currentProgressValue = parseInt(searchProgressBar[0].getAttribute("aria-valuenow"));
    } catch (e) {
      console.log('Got error from progress bar', e);
    }

    return currentProgressValue;
  }

  disableCancelButton() {
    var cancelSearchButtonContainer = verseListController.getCurrentSearchCancelButtonContainer(this.currentSearchTabIndex);
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

    if (currentVerseListMenu != null) {
      var bibleSelect = currentVerseListMenu.find('select.bible-select');
      bibleSelect.selectmenu("enable");
    }
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
    $('#search-scope')[0].value = "BIBLE";
    $('#search-is-case-sensitive').prop("checked", false);
    $('#search-extended-verse-boundaries').prop("checked", false);
    this.clearModuleSearchHeader(tabIndex);
    this.hideModuleSearchHeader(tabIndex);
    app_controller.verse_statistics_chart.resetChart(tabIndex);
  }

  clearModuleSearchHeader(tabIndex=undefined) {
    this.getModuleSearchHeader(tabIndex).html('');
  }

  hideModuleSearchHeader(tabIndex=undefined) {
    this.getModuleSearchHeader(tabIndex).hide();
  }

  populateSearchMenu(tabIndex) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var searchType = currentTab.getSearchOptions()['searchType'];
      var searchScope = currentTab.getSearchOptions()['searchScope'];
      var isCaseSensitive = currentTab.getSearchOptions()['caseSensitive'];
      var useExtendedVerseBoundaries = currentTab.getSearchOptions()['extendedVerseBoundaries'];
      var searchTerm = currentTab.getSearchTerm();

      $('#search-type').val(searchType);
      $('#search-scope').val(searchScope);
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

  getSearchScope() {
    var selectField = document.getElementById('module-search-menu').querySelector('#search-scope');
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
    const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;
    let verseListHeader = null;

    if (showSearchResultsInPopup) {
      const $dialogBox = $('#search-results-box');
      verseListHeader = $dialogBox.find('.verse-list-header');
    } else {
      const currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
      verseListHeader = currentVerseListFrame.find('.verse-list-header');
    }

    return verseListHeader;
  }

  searchResultsExceedPerformanceLimit(index=undefined) {
    if (index === undefined) {
      index = app_controller.tab_controller.getSelectedTabIndex();
    }

    var currentSearchResults = app_controller.tab_controller.getTab(index).getSearchResults();

    if (currentSearchResults != null) {
      return currentSearchResults.length > this.searchResultPerformanceLimit;
    } else {
      return false;
    }
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

    if (this.currentSearchTerm == null || this.currentSearchTerm.length == 0) {
      return;
    }

    this.currentSearchTabIndex = app_controller.tab_controller.getSelectedTabIndex();

    // Do not allow another concurrent search, disable the search menu button
    $('.module-search-button').addClass('ui-state-disabled');

    this.disableOtherFunctionsDuringSearch();

    const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;

    if (tabIndex === undefined) {
      var tab = app_controller.tab_controller.getTab();

      tab.setSearchOptions(this.getSearchType(),
                           this.getSearchScope(),
                           this.isCaseSensitive(),
                           this.useExtendedVerseBoundaries());
      
      if (!showSearchResultsInPopup) {
        tab.setTextType('search_results');
        tab.setSearchCancelled(false);
      }
    }

    await eventController.publishAsync('on-module-search-started', tabIndex);

    //console.log("Starting search for " + this.currentSearchTerm + " on tab " + tabIndex);
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var currentBibleTranslationId = currentTab.getBibleTranslationId();
      var searchType = currentTab.getSearchOptions()['searchType'];

      var searchScope = currentTab.getSearchOptions()['searchScope'];
      if (searchScope == null) {
        searchScope = "BIBLE";
      }

      const isCaseSensitive = currentTab.getSearchOptions()['caseSensitive'];
      const useExtendedVerseBoundaries = currentTab.getSearchOptions()['extendedVerseBoundaries'];

      if (searchType == "strongsNumber" && event != null) {
        if (!app_controller.dictionary_controller.isValidStrongsKey(this.currentSearchTerm)) {
          return;
        }

        app_controller.dictionary_controller.showStrongsInfo(this.currentSearchTerm, false /* do not show strongs box */);
      }

      app_controller.tab_controller.setTabSearch(this.currentSearchTerm, tabIndex);

      if (!showSearchResultsInPopup) {
        // Set book, tagIdList and xrefs to null, since we just switched to search content
        currentTab.setBook(null, null, null);
        currentTab.setTagIdList("");
        currentTab.setXrefs(null);
        currentTab.setReferenceVerseElementId(null);
        app_controller.tag_selection_menu.resetTagMenu();
      }

      this.hideSearchMenu();

      var searchProgressBar = verseListController.getCurrentSearchProgressBar();

      if (showSearchResultsInPopup) {
        await waitUntilIdle();

        this.clearModuleSearchHeader(tabIndex);

        const dialogWidth = uiHelper.getMaxDialogWidth();
        const dialogHeight = 550;
        const draggable = true;
        const position = [55, 120];
    
        let dialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
        dialogOptions.title = `${i18n.t("bible-browser.search-result-header")} <i>${this.currentSearchTerm}</i>`;
        dialogOptions.dialogClass = 'ezra-dialog search-results-box';
        
        const $dialogBox = $('#search-results-box');
        $dialogBox.dialog(dialogOptions);
        uiHelper.fixDialogCloseIconOnAndroid('search-results-box');
      }

      if (tabIndex == undefined || tabIndex == app_controller.tab_controller.getSelectedTabIndex()) {
        var cancelSearchButtonContainer = verseListController.getCurrentSearchCancelButtonContainer(tabIndex);
        var cancelSearchButton = cancelSearchButtonContainer.find('button');
        cancelSearchButton.removeClass('ui-state-disabled');

        uiHelper.initProgressBar(searchProgressBar);
        searchProgressBar.show();
        cancelSearchButtonContainer.show();
      }

      if (showSearchResultsInPopup) {
        $('#search-results-box-content')[0].innerHTML = '';
      } else {
        // Only reset view if we got an event (in other words: not initially)
        await app_controller.text_controller.prepareForNewText(event != null, true, tabIndex);
      }

      try {
        Sentry.addBreadcrumb({category: "app",
                              message: `Performing module search in ${currentBibleTranslationId}`,
                              level: "info"});

        var searchResults = await ipcNsi.getModuleSearchResults(
          (progress) => {
            var progressPercent = progress.totalPercent;
            searchProgressBar.progressbar("value", progressPercent);
            if (progressPercent >= CANCEL_SEARCH_PERCENT_LIMIT) {
              this.disableCancelButton();
            }
          },
          currentBibleTranslationId,
          this.currentSearchTerm,
          searchType,
          searchScope,
          isCaseSensitive,
          useExtendedVerseBoundaries
        );

        //console.log("Got " + searchResults.length + " from Sword");
        currentTab.setSearchResults(searchResults);

        var searchResultBookId = -1; // all books requested
        if (this.searchResultsExceedPerformanceLimit(this.currentSearchTabIndex)) {
          searchResultBookId = 0; // no books requested - only list headers at first
        }

        let target=undefined;
        if (showSearchResultsInPopup) {
          target = $('#search-results-box-content');
        }
  
        await this.renderCurrentSearchResults(searchResultBookId, this.currentSearchTabIndex, target);
      } catch (error) {
        console.log(error);
        verseListController.hideVerseListLoadingIndicator();
        this.enableOtherFunctionsAfterSearch();
      }
    }

    // We're done with the search and so we're re-enabling the search menu button
    $('.module-search-button').removeClass('ui-state-disabled');
  }

  highlightSearchResults(searchTerm, tabIndex=undefined) {
    const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;
    var currentVerseList = null;

    if (showSearchResultsInPopup) {
      const $dialogBox = $('#search-results-box');
      currentVerseList = $dialogBox.find('#search-results-box-content');
    } else {
      currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    }

    var verses = currentVerseList[0].querySelectorAll('.verse-text');

    var searchType = this.getSearchType();
    var isCaseSensitive = this.isCaseSensitive();
    var useExtendedVerseBoundaries = this.useExtendedVerseBoundaries();

    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      this.verseSearch.doVerseSearch(currentVerse, searchTerm, searchType, isCaseSensitive, useExtendedVerseBoundaries);
    }
  }

  async renderCurrentSearchResults(searchResultBookId=-1, tabIndex=undefined, target=undefined, cachedText=null) {
    //console.log("Rendering search results on tab " + tabIndex);

    const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;

    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    const currentTabId = app_controller.tab_controller.getSelectedTabId(tabIndex);
    const currentSearchTerm = currentTab.getSearchTerm();
    const currentSearchResults = currentTab.getSearchResults();

    if (currentSearchResults != null && currentSearchResults.length > 0) {
      await app_controller.text_controller.requestTextUpdate(currentTabId,
                                                             null,
                                                             null,
                                                             cachedText,
                                                             null,
                                                             currentSearchResults,
                                                             null,
                                                             null,
                                                             true,
                                                             tabIndex,
                                                             searchResultBookId,
                                                             target);
      
    } else {
      verseListController.hideVerseListLoadingIndicator(this.currentSearchTabIndex);
      uiHelper.hideTextLoadingIndicator(this.currentSearchTabIndex);
      verseListController.hideSearchProgressBar(this.currentSearchTabIndex);
    }

    this.hideSearchMenu();
    var moduleSearchHeaderText;

    if (currentSearchResults != null && currentSearchResults.length > 0) {
      moduleSearchHeaderText = `<span i18n="bible-browser.search-result-header">${i18n.t("bible-browser.search-result-header")}</span> <i>${currentSearchTerm}</i> (${currentSearchResults.length})`;
    } else {
      var tab = app_controller.tab_controller.getTab(tabIndex);
      var searchCancelled = tab != null ? tab.isSearchCancelled() : false;

      if (searchCancelled) {
        moduleSearchHeaderText = `<span i18n="bible-browser.module-search-cancelled">${i18n.t("bible-browser.module-search-cancelled")} <i>${currentSearchTerm}</i>`;
      } else {
        moduleSearchHeaderText = `<span i18n="bible-browser.no-search-results">${i18n.t("bible-browser.no-search-results")} <i>${currentSearchTerm}</i>`;
      }
    }

    var header = "";

    header += "<h2>" + moduleSearchHeaderText + "</h2>";

    if (this.searchResultsExceedPerformanceLimit(tabIndex)) {
      header += `<div style="margin-left: 0.6em; margin-top: 1em;" i18n="bible-browser.search-performance-hint">${i18n.t("bible-browser.search-performance-hint")}</div>`;
    }

    var moduleSearchHeader = this.getModuleSearchHeader(tabIndex);
    moduleSearchHeader.html(header);

    if (!showSearchResultsInPopup && currentSearchResults != null && currentSearchResults.length > 0) {
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
      selectAllSearchResultsButton.setAttribute('i18n', 'bible-browser.select-all-search-results');
      moduleSearchHeader.append(selectAllSearchResultsButton);

      selectAllSearchResultsButton.onclick = this.selectAllSearchResults;
      uiHelper.configureButtonStyles('.verse-list-header');
    }

    moduleSearchHeader.show();

    this.enableOtherFunctionsAfterSearch();
  }

  selectAllSearchResults() {
    var currentVerseListFrame = verseListController.getCurrentVerseListFrame();

    var allVerseTextElements = currentVerseListFrame[0].querySelectorAll('.verse-text');
    allVerseTextElements.forEach((verseTextElement) => {
      verseTextElement.classList.add('ui-selected');
    });

    app_controller.verse_selection.updateSelected();
    app_controller.verse_selection.updateViewsAfterVerseSelection(i18n.t('bible-browser.all-search-results'));
  }

  getBibleBookStatsFromSearchResults(search_results) {
    var bibleBookStats = {};

    if (search_results != null) {
      for (var i = 0; i < search_results.length; i++) {
        var bibleBookId = search_results[i].bibleBookShortTitle;

        if (bibleBookStats[bibleBookId] === undefined) {
          bibleBookStats[bibleBookId] = 1;
        } else {
          bibleBookStats[bibleBookId] += 1;
        }
      }
    }

    return bibleBookStats;
  }

  loadBookResults(bookId) {
    const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;
    const currentTabId = app_controller.tab_controller.getSelectedTabId();
    let parentElement = null;

    if (showSearchResultsInPopup) {
      parentElement = $('#search-results-box');
    } else {
      parentElement = $('#' + currentTabId);
    }

    const bookSection = parentElement.find('#' + currentTabId + '-book-section-' + bookId);

    this.renderCurrentSearchResults(bookId, undefined, bookSection);
  }
}

module.exports = ModuleSearchController;

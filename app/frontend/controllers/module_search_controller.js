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
    this.currentSearchCancelled = false;
    this.searchDebounceTimer = null;
    this.isSearchInProgress = false;
    this.skipNextSearchCancellation = false;

    eventController.subscribe('on-fullscreen-changed', (isFullScreen) => {
      const button = $('#open-search-results-in-new-tab-button');
      if (isFullScreen) {
        button.addClass('ui-state-disabled');
      } else {
        button.removeClass('ui-state-disabled');
      }
    });

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      await waitUntilIdle();

      // Cancel any potentially ongoing module search
      if (!this.skipNextSearchCancellation) {
        await this.cancelAnyModuleSearch();
      } else {
        this.skipNextSearchCancellation = false;
      }

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
    const openSearchResultsInNewTabButton = $('#open-search-results-in-new-tab-button');
    openSearchResultsInNewTabButton.unbind('mousedown').bind('mousedown', (event) => {
      if (event.target.classList.contains('ui-state-disabled')) {
        return;
      }

      this.openSearchResultsInNewTab();
    });

    openSearchResultsInNewTabButton.removeClass('ui-state-active');
    uiHelper.configureButtonStyles('#open-search-results-in-new-tab-button');

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
          if (event.data != null) {
            const lastCharacter = event.data[event.data.length - 1];

            if (lastCharacter == '\n') {
              this.startSearch(event);
            }
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

      // Add additional event handlers for mobile platforms to ensure Enter key works
      moduleSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' || event.keyCode === 13) {
          this.startSearch(event);
        }
      });

      // Handle form submission which can be triggered by Enter key on mobile keyboards
      moduleSearchInput.addEventListener('submit', (event) => {
        event.preventDefault();
        this.startSearch(event);
      });

      // For input elements, we can also listen for the input event with Enter key
      moduleSearchInput.addEventListener('input', (event) => {
        if (event.inputType === 'insertLineBreak') {
          this.startSearch(event);
        }
      });

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
      this.updateCurrentBookSearchScopeDisplay();
      this.validateSearchTerm();
    });

    var searchResultsDisplayModeField = document.getElementById('module-search-menu').querySelector('#search-results-display-mode');
    $(searchResultsDisplayModeField).on('change', () => {
      this.validateSearchTerm();
    });

    const verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
    const searchResultsBox = $('#search-results-box');
    const cancelSearchButtonContainer1 = verseListFrame.find('.cancel-module-search-button-container');
    const cancelSearchButtonContainer2 = searchResultsBox.find('.cancel-module-search-button-container');

    const cancelSearchButton1 = cancelSearchButtonContainer1.find('button');
    const cancelSearchButton2 = cancelSearchButtonContainer2.find('button');

    cancelSearchButton1[0].addEventListener('mousedown', async () => {
      this.cancelModuleSearch();
    });

    cancelSearchButton2[0].addEventListener('mousedown', async () => {
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
    this.currentSearchCancelled = true;
    this.disableCancelButton();

    if (tabIndex === undefined) {
      tabIndex = this.currentSearchTabIndex;
    }

    const tab = app_controller.tab_controller.getTab(tabIndex);
    const showSearchResultsInPopup = tab != null && tab.getSearchResultsDisplayMode() == 'popup';

    if (tab != null && !showSearchResultsInPopup) {
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
      '.text-size-settings-button',
      '.parallel-bible-button'
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

    app_controller.tab_controller.disableTabOperations();
  }

  enableOtherFunctionsAfterSearch() {
    this.toggleMenuButtons(true);

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(this.currentSearchTabIndex);

    if (currentVerseListMenu != null) {
      var bibleSelect = currentVerseListMenu.find('select.bible-select');
      bibleSelect.selectmenu("enable");
    }

    app_controller.tab_controller.enableTabOperations();
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
    $('#search-word-boundaries').prop("checked", false);
    $('#search-extended-verse-boundaries').prop("checked", false);
    this.clearModuleSearchHeader(tabIndex);
    this.hideModuleSearchHeader(tabIndex);
    app_controller.verse_statistics_chart.resetChart(tabIndex);
    this.currentSearchCancelled = false;

    var tab = app_controller.tab_controller.getTab(tabIndex);
    if (tab != null) {
      tab.setSearchCancelled(false);
    }
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
      var useWordBoundaries = currentTab.getSearchOptions()['wordBoundaries'];
      var useExtendedVerseBoundaries = currentTab.getSearchOptions()['extendedVerseBoundaries'];
      var searchTerm = currentTab.getSearchTerm();
      var searchResultsDisplayMode = currentTab.getSearchResultsDisplayMode();

      if (searchScope == 'CURRENT_BOOK' &&
          currentTab.getTextType() != 'book' &&
          currentTab.getSearchScopeBookCode() == null) {
        searchScope = 'BIBLE';
      }

      this.updateCurrentBookSearchScope(tabIndex);
      $('#search-type').val(searchType);
      $('#search-scope').val(searchScope);
      $('#search-is-case-sensitive').prop("checked", isCaseSensitive);
      $('#search-word-boundaries').prop("checked", useWordBoundaries);
      $('#search-extended-verse-boundaries').prop("checked", useExtendedVerseBoundaries);
      $('#search-results-display-mode').val(searchResultsDisplayMode);
      $('#module-search-input').val(searchTerm);
      this.updateCurrentBookSearchScopeDisplay(tabIndex);
    }
  }

  updateCurrentBookSearchScope(tabIndex=undefined) {
    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    const searchScopeField = document.getElementById('module-search-menu').querySelector('#search-scope');
    const currentBookOption = searchScopeField.querySelector('option[value="CURRENT_BOOK"]');
    const isBookTab = currentTab != null && currentTab.getTextType() == 'book';
    const isCurrentBookSearch = currentTab != null &&
      currentTab.getTextType() == 'search_results' &&
      currentTab.getSearchOptions()['searchScope'] == 'CURRENT_BOOK' &&
      currentTab.getSearchScopeBookCode() != null;
    const isCurrentBookAvailable = isBookTab || isCurrentBookSearch;

    currentBookOption.hidden = !isCurrentBookAvailable;
    currentBookOption.disabled = !isCurrentBookAvailable;

    if (!isCurrentBookAvailable && searchScopeField.value == 'CURRENT_BOOK') {
      searchScopeField.value = 'BIBLE';
    }
  }

  updateCurrentBookSearchScopeDisplay(tabIndex=undefined) {
    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    const searchScope = this.getSearchScope();
    const currentBookScopeContainer = document.getElementById('current-book-search-scope-container');
    const currentBookScopeField = document.getElementById('current-book-search-scope');

    if (searchScope != 'CURRENT_BOOK' || currentTab == null) {
      currentBookScopeContainer.style.display = 'none';
      currentBookScopeField.textContent = '';
      return;
    }

    if (currentTab.getTextType() == 'book') {
      currentTab.setSearchScopeBook(currentTab.getBook(), currentTab.getBookTitle());
    }

    currentBookScopeField.textContent = currentTab.getSearchScopeBookTitle() || '';
    currentBookScopeContainer.style.display = 'block';
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
      this.updateCurrentBookSearchScope();
      this.updateCurrentBookSearchScopeDisplay();

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

  useWordBoundaries() {
    return document.getElementById('search-word-boundaries').checked;
  }

  getModuleSearchHeader(tabIndex=undefined, renderInTab=false) {
    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    const showSearchResultsInPopup = currentTab != null &&
      currentTab.getSearchResultsDisplayMode() == 'popup' &&
      !renderInTab &&
      !currentTab.getSearchResultsInTab();
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
    if (!app_controller.word_study_controller.isValidStrongsKey(this.getSearchTerm())) {
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
    
    // Prevent duplicate search execution on single key press
    if (this.isSearchInProgress) {
      return;
    }
    
    // Debounce search execution
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    this.searchDebounceTimer = setTimeout(async () => {
      this.isSearchInProgress = true;
      
      if (searchTerm !== undefined) {
        this.currentSearchTerm = searchTerm;
      } else {
        this.currentSearchTerm = this.getSearchTerm();
      }

      if (this.currentSearchTerm == null || this.currentSearchTerm.length == 0) {
        this.isSearchInProgress = false;
        return;
      }

      this.currentSearchCancelled = false;
      let sourceTab = app_controller.tab_controller.getTab();
      let searchDisplayMode = tabIndex === undefined ?
        ($('#search-results-display-mode').val() || 'current-tab') :
        sourceTab.getSearchResultsDisplayMode();
      const searchOptions = {
        searchType: this.getSearchType(),
        searchScope: this.getSearchScope(),
        caseSensitive: this.isCaseSensitive(),
        wordBoundaries: this.useWordBoundaries(),
        extendedVerseBoundaries: this.useExtendedVerseBoundaries()
      };

      if (searchOptions.searchScope == 'CURRENT_BOOK' && sourceTab.getTextType() != 'book' &&
          sourceTab.getSearchScopeBookCode() == null) {
        searchOptions.searchScope = 'BIBLE';
      }

      this.currentSearchTabIndex = app_controller.tab_controller.getSelectedTabIndex();

      if (tabIndex === undefined && searchDisplayMode == 'new-tab') {
        if (searchOptions.searchScope == 'CURRENT_BOOK' && sourceTab.getTextType() == 'book') {
          sourceTab.setSearchScopeBook(sourceTab.getBook(), sourceTab.getBookTitle());
        }

        const newTab = await app_controller.tab_controller.addTab(undefined, false, sourceTab.getBibleTranslationId());
        if (newTab == null) {
          this.isSearchInProgress = false;
          return;
        }

        tabIndex = app_controller.tab_controller.getSelectedTabIndex();
        await app_controller.translation_controller.initTranslationsMenu(-1, tabIndex);
        newTab.setTextType('search_results');
        newTab.setSearchResultsDisplayMode('current-tab');
        newTab.setSearchOptions(searchOptions.searchType,
                                searchOptions.searchScope,
                                searchOptions.caseSensitive,
                                searchOptions.wordBoundaries,
                                searchOptions.extendedVerseBoundaries);
        newTab.setSearchScopeBook(sourceTab.getSearchScopeBookCode(), sourceTab.getSearchScopeBookTitle());
        newTab.setSearchCancelled(false);
        app_controller.tab_controller.setTabTitle(
          app_controller.tab_controller.getSearchTabTitle(this.currentSearchTerm),
          sourceTab.getBibleTranslationId(),
          tabIndex
        );
      }

      // Do not allow another concurrent search, disable the search menu button
      $('.module-search-button').addClass('ui-state-disabled');

      this.disableOtherFunctionsDuringSearch();

      this.currentSearchTabIndex = tabIndex === undefined ?
        app_controller.tab_controller.getSelectedTabIndex() : tabIndex;
      const showSearchResultsInPopup = searchDisplayMode == 'popup';
      $('#open-search-results-in-new-tab-button').hide();

      if (tabIndex === undefined) {
        var tab = app_controller.tab_controller.getTab();
        let searchScope = searchOptions.searchScope;

        if (tab.getTextType() != 'book' && searchScope == 'CURRENT_BOOK') {
          searchScope = 'BIBLE';
        }

        if (tab.getTextType() == 'book' && searchScope == 'CURRENT_BOOK') {
          tab.setSearchScopeBook(tab.getBook(), tab.getBookTitle());
        }

        tab.setSearchOptions(searchOptions.searchType,
                             searchScope,
                             searchOptions.caseSensitive,
                             searchOptions.wordBoundaries,
                             searchOptions.extendedVerseBoundaries);
        tab.setSearchResultsDisplayMode(searchDisplayMode);
      }

      await eventController.publishAsync('on-module-search-started', tabIndex);

      //console.log("Starting search for " + this.currentSearchTerm + " on tab " + tabIndex);
      var currentTab = app_controller.tab_controller.getTab(tabIndex);

      if (currentTab != null) {
        if (tabIndex !== undefined &&
            currentTab.getTextType() == 'book' &&
            currentTab.getSearchOptions()['searchScope'] == 'CURRENT_BOOK') {
          currentTab.setSearchScopeBook(currentTab.getBook(), currentTab.getBookTitle());
        }

        var currentBibleTranslationId = currentTab.getBibleTranslationId();
        var searchType = currentTab.getSearchOptions()['searchType'];

        var searchScope = currentTab.getSearchOptions()['searchScope'];
        if (searchScope == null) {
          searchScope = "BIBLE";
        }
        const isCurrentBookScope = searchScope == 'CURRENT_BOOK';
        if (isCurrentBookScope) {
          searchScope = currentTab.getSearchScopeBookCode();
        }

        const isCaseSensitive = currentTab.getSearchOptions()['caseSensitive'];
        const useWordBoundaries = currentTab.getSearchOptions()['wordBoundaries'];
        const useExtendedVerseBoundaries = currentTab.getSearchOptions()['extendedVerseBoundaries'];

        if (searchType == "strongsNumber" && event != null) {
          if (!app_controller.word_study_controller.isValidStrongsKey(this.currentSearchTerm)) {
            this.isSearchInProgress = false;
            return;
          }

          app_controller.word_study_controller.showWordInfo(this.currentSearchTerm, false /* do not show strongs box */);
        }

        app_controller.tab_controller.setTabSearch(this.currentSearchTerm, tabIndex);

        if (!showSearchResultsInPopup) {
          // Set book, tagIdList and xrefs to null, since we just switched to search content
          currentTab.setBook(null, null, null);
          currentTab.setTagIdList('');
          currentTab.setXrefs(null);
          currentTab.setReferenceVerseElementId(null);
          app_controller.tag_selection_menu.resetTagMenu();
        }

        if (!showSearchResultsInPopup) {
          if (currentTab.getTextType() != 'search_results') {
            currentTab.setTextType('search_results');
          }
          currentTab.setSearchCancelled(false);
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
          uiHelper.fixDialogCloseIconOnCordova('search-results-box');
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
          if (isCurrentBookScope && searchScope == null) {
            throw new Error('Current Book search scope is missing its book code');
          }

          if (window.Sentry != null) {
            Sentry.addBreadcrumb({category: "app",
                                  message: `Performing module search in ${currentBibleTranslationId}`,
                                  level: "info"});
          }

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
            useWordBoundaries,
            useExtendedVerseBoundaries
          );

          //console.log("Got " + searchResults.length + " from Sword");
          currentTab.setSearchResults(searchResults);

          this.currentSearchResultBookId = -1; // all books requested
          if (this.searchResultsExceedPerformanceLimit(this.currentSearchTabIndex)) {
            this.currentSearchResultBookId = 0; // no books requested - only list headers at first
          }

          let target=undefined;
          if (showSearchResultsInPopup) {
            target = $('#search-results-box-content');
          }
    
          await this.renderCurrentSearchResults(this.currentSearchResultBookId, this.currentSearchTabIndex, target);
        } catch (error) {
          console.log(error);
          verseListController.hideVerseListLoadingIndicator();
          this.enableOtherFunctionsAfterSearch();
        }
      }

      // We're done with the search and so we're re-enabling the search menu button
      $('.module-search-button').removeClass('ui-state-disabled');
      this.isSearchInProgress = false;
    }, 50); // Short delay to debounce multiple events
  }

  highlightSearchResults(searchTerm, tabIndex=undefined, renderInTab=false) {
    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    const showSearchResultsInPopup = currentTab != null &&
      currentTab.getSearchResultsDisplayMode() == 'popup' &&
      !renderInTab &&
      !currentTab.getSearchResultsInTab();
    var currentVerseList = null;

    if (showSearchResultsInPopup) {
      const $dialogBox = $('#search-results-box');
      currentVerseList = $dialogBox.find('#search-results-box-content');
    } else {
      currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    }

    var verses = currentVerseList[0].querySelectorAll('.verse-text');

    const searchOptions = renderInTab ? app_controller.tab_controller.getTab(tabIndex).getSearchOptions() : null;
    var searchType = searchOptions != null ? searchOptions.searchType : this.getSearchType();
    var isCaseSensitive = searchOptions != null ? searchOptions.caseSensitive : this.isCaseSensitive();
    var useExtendedVerseBoundaries = searchOptions != null ? searchOptions.extendedVerseBoundaries : this.useExtendedVerseBoundaries();
    var useWordBoundaries = searchOptions != null ? searchOptions.wordBoundaries : this.useWordBoundaries();

    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      this.verseSearch.doVerseSearch(currentVerse, searchTerm, searchType, isCaseSensitive, useExtendedVerseBoundaries, useWordBoundaries);
    }
  }

  async reRenderCurrentSearchResults() {
    uiHelper.showTextLoadingIndicator();
    await this.renderCurrentSearchResults(this.currentSearchResultBookId, this.currentSearchTabIndex);
    uiHelper.hideTextLoadingIndicator();
  }

  async renderCurrentSearchResults(searchResultBookId=-1, tabIndex=undefined, target=undefined, cachedText=null, renderInTab=false) {
    //console.log("Rendering search results on tab " + tabIndex);

    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    renderInTab = renderInTab || currentTab.getSearchResultsInTab();
    const showSearchResultsInPopup = currentTab.getSearchResultsDisplayMode() == 'popup' && !renderInTab;

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
                                                             target,
                                                             renderInTab);
      
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
      var searchCancelled = false;

      if (showSearchResultsInPopup) {
        searchCancelled = this.currentSearchCancelled;
      } else {
        const tab = app_controller.tab_controller.getTab(tabIndex);
        searchCancelled = tab != null ? tab.isSearchCancelled() : false;
      }

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

    var moduleSearchHeader = this.getModuleSearchHeader(tabIndex, renderInTab);
    moduleSearchHeader.html(header);

    if (!showSearchResultsInPopup && currentSearchResults != null && currentSearchResults.length > 0) {
      const existingButton = moduleSearchHeader.parent().find('.select-all-verses-button');

      if (existingButton.length == 0) {
        uiHelper.addButton(moduleSearchHeader,
                          'select-all-verses-button',
                          'bible-browser.select-all-search-results',
                          this.selectAllSearchResults,
                          this.searchResultsExceedPerformanceLimit(tabIndex),
                          true); // insert button after module search header
      }

      uiHelper.configureButtonStyles(moduleSearchHeader[0]);
    }

    moduleSearchHeader.show();

    if (showSearchResultsInPopup &&
        currentSearchResults != null && currentSearchResults.length > 0) {
      $('#open-search-results-in-new-tab-button').show();
    }

    this.enableOtherFunctionsAfterSearch();
  }

  async openSearchResultsInNewTab() {
    if (this.isSearchInProgress || $('#open-search-results-in-new-tab-button').hasClass('ui-state-disabled')) {
      return;
    }

    const sourceTab = app_controller.tab_controller.getTab(this.currentSearchTabIndex);
    if (sourceTab == null || sourceTab.getSearchResults() == null || sourceTab.getSearchResults().length == 0) {
      return;
    }

    const searchTerm = sourceTab.getSearchTerm();
    const searchOptions = sourceTab.getSearchOptions();
    const searchResults = sourceTab.getSearchResults();
    const translationId = sourceTab.getBibleTranslationId();

    $('#search-results-box').dialog('close');
    app_controller.commentaryPanel.setRefreshBlocked(true);
    app_controller.tab_controller.saveTabScrollPosition();

    try {
      const newTab = await app_controller.tab_controller.addTab(undefined, false, translationId);
      if (newTab == null) {
        return;
      }

      const tabIndex = app_controller.tab_controller.getSelectedTabIndex();
      await app_controller.translation_controller.initTranslationsMenu(-1, tabIndex);
      newTab.setTextType('search_results');
      newTab.setSearchTerm(searchTerm);
      newTab.setSearchResults(searchResults);
      newTab.setSearchResultsInTab(true);
      newTab.setSearchOptions(
        searchOptions.searchType,
        searchOptions.searchScope,
        searchOptions.caseSensitive,
        searchOptions.wordBoundaries,
        searchOptions.extendedVerseBoundaries
      );
      newTab.setSearchScopeBook(sourceTab.getSearchScopeBookCode(), sourceTab.getSearchScopeBookTitle());
      newTab.setSearchCancelled(false);

      app_controller.tab_controller.setTabTitle(
        app_controller.tab_controller.getSearchTabTitle(searchTerm),
        translationId,
        tabIndex
      );

      this.currentSearchTabIndex = tabIndex;
      this.currentSearchResultBookId = this.searchResultsExceedPerformanceLimit(tabIndex) ? 0 : -1;
      await this.renderCurrentSearchResults(
        this.currentSearchResultBookId,
        tabIndex,
        verseListController.getCurrentVerseList(tabIndex),
        null,
        true
      );
      await eventController.publishAsync('on-tab-selected', tabIndex);
    } finally {
      app_controller.commentaryPanel.setRefreshBlocked(false);
    }
  }

  selectAllSearchResults() {
    app_controller.verse_selection.selectAllVerses('bible-browser.all-search-results');
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
    const currentTab = app_controller.tab_controller.getTab();
    const showSearchResultsInPopup = currentTab.getSearchResultsDisplayMode() == 'popup' &&
      !currentTab.getSearchResultsInTab();
    const currentTabId = app_controller.tab_controller.getSelectedTabId();
    let parentElement = null;

    if (showSearchResultsInPopup) {
      parentElement = $('#search-results-box');
    } else {
      parentElement = $('#' + currentTabId);
    }

    const bookSection = parentElement.find('#' + currentTabId + '-book-section-' + bookId);

    this.renderCurrentSearchResults(bookId, undefined, bookSection, null, currentTab.getSearchResultsInTab());
  }
}

module.exports = ModuleSearchController;

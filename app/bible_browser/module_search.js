/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

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

const NodeSwordInterface = require('node-sword-interface');

class ModuleSearch {
  constructor() {
    this.currentSearchTerm = null;
    this.search_menu_opened = false;
    this._nodeSwordInterface = null;
  }

  init_module_search_menu(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.module-search-button').bind('click', (event) => { this.handle_search_menu_click(event); });
    
    $('#start-module-search-button:not(.bound)').addClass('bound').bind('click', (event) => { this.start_search(event); });
  }

  hide_search_menu() {
    if (this.search_menu_opened) {
      $('#app-container').find('#module-search-menu').hide();
      this.search_menu_opened = false;

      var module_search_button = $('#app-container').find('.module-search-button');
      module_search_button.removeClass('ui-state-active');
    }
  }

  reset_search() {
    $('#module-search-input').val('');
    this.hide_module_search_header();
  }

  hide_module_search_header(tabIndex=undefined) {
    this.getModuleSearchHeader(tabIndex).hide();
  }

  handle_search_menu_click(event) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var moduleSearchButton = currentVerseListMenu.find('.module-search-button');

    if (moduleSearchButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.search_menu_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();
      moduleSearchButton.addClass('ui-state-active');

      var module_search_button_offset = moduleSearchButton.offset();
      var menu = $('#app-container').find('#module-search-menu');
      var top_offset = module_search_button_offset.top + moduleSearchButton.height() + 12;
      var left_offset = module_search_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#module-search-menu').slideDown();
      this.search_menu_opened = true;
      event.stopPropagation();
    }
  }

  getSearchTerm() {
    return $('#module-search-input').val();
  }

  isCaseSensitive() {
    return $('#search-is-case-sensitive').prop("checked");
  }

  isPhrase() {
    return $('#search-is-phrase').prop("checked");
  }

  getModuleSearchHeader(tabIndex=undefined) {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    return currentVerseListFrame.find('.module-search-result-header');
  }

  searchResultsExceedPerformanceLimit(index=undefined) {
    if (index === undefined) {
      index = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }

    var currentSearchResults = bible_browser_controller.tab_controller.getTab(index).getSearchResults();
    return currentSearchResults.length > 500;
  }

  async start_search(event, tabIndex=undefined, searchTerm=undefined) {
    if (event != null) {
      event.stopPropagation();
    }

    if (this._nodeSwordInterface == null) {
      this._nodeSwordInterface = new NodeSwordInterface();
    }

    if (searchTerm !== undefined) {
      this.currentSearchTerm = searchTerm;
    } else {
      this.currentSearchTerm = this.getSearchTerm();
    }

    if (this.currentSearchTerm.length == 0) {
      console.log("Got empty search term ... aborting search!");
      return;
    }

    if (tabIndex === undefined) {
      bible_browser_controller.tab_controller.setTabSearch(this.currentSearchTerm);
      bible_browser_controller.tab_controller.setCurrentTextType('search_results');
    }

    // Only reset view if we got an event (in other words: not initially)
    bible_browser_controller.text_loader.prepareForNewText(event != null, tabIndex);

    //console.log("Starting search for " + this.currentSearchTerm + " on tab " + tabIndex);

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tabIndex);

    await this._nodeSwordInterface.getModuleSearchResults(currentBibleTranslationId,
                                                          this.currentSearchTerm,
                                                          this.isPhrase(),
                                                          this.isCaseSensitive()).then(async (searchResults) => {
                                                            
      //console.log("Got " + searchResults.length + " from Sword");
      bible_browser_controller.tab_controller.getTab(tabIndex).setSearchResults(searchResults);
    });

    var requestedBookId = -1; // all books requested
    if (this.searchResultsExceedPerformanceLimit(tabIndex)) {
      requestedBookId = 0; // no books requested - only list headers at first
    }

    await this.renderCurrentSearchResults(requestedBookId, tabIndex);
  }

  async renderCurrentSearchResults(requestedBookId=-1, tabIndex=undefined, target=undefined) {
    //console.log("Rendering search results on tab " + tabIndex);
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId(tabIndex);
    var currentSearchTerm = currentTab.getSearchTerm();
    var currentSearchResults = currentTab.getSearchResults();

    if (currentSearchResults.length > 0) {
      await bible_browser_controller.text_loader.requestTextUpdate(currentTabId,
                                                                  null,
                                                                  null,
                                                                  currentSearchResults,
                                                                  false,
                                                                  tabIndex,
                                                                  requestedBookId,
                                                                  target);
    } else {
      bible_browser_controller.hideVerseListLoadingIndicator();
    }

    this.hide_search_menu();
    var moduleSearchHeaderText;

    if (currentSearchResults.length > 0) {
      moduleSearchHeaderText = i18n.t("bible-browser.search-result-header") + ' <i>' + currentSearchTerm + '</i> (' + currentSearchResults.length + ')';
    } else {
      moduleSearchHeaderText = i18n.t("bible-browser.no-search-results") + ' <i>' + currentSearchTerm + '</i>';
    }

    var header = "<div style='font-size: 130%; font-weight: bold;'>" + moduleSearchHeaderText + "</div>";

    if (this.searchResultsExceedPerformanceLimit(tabIndex)) {
      var performanceHintText = i18n.t("bible-browser.search-performance-hint");
      header += "<div style='margin-top: 1em;'>" + performanceHintText + "</div>";
    }

    this.getModuleSearchHeader(tabIndex).html(header);
    this.getModuleSearchHeader(tabIndex).show();
  }

  load_book_results(bookId) {
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    
    var bookSection = $('#' + currentTabId).find('#' + currentTabId + '-book-section-' + bookId);
    this.renderCurrentSearchResults(bookId, undefined, bookSection);
  }
}

module.exports = ModuleSearch;

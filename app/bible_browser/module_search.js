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
    this.search_menu_opened = false;
    this._nodeSwordInterface = new NodeSwordInterface();
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

  hide_module_search_header() {
    this.getModuleSearchHeader().hide();
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

  getModuleSearchHeader() {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame();
    return currentVerseListFrame.find('.module-search-result-header');
  }

  async start_search(event) {
    event.stopPropagation();
    var searchTerm = this.getSearchTerm();
    
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();

    bible_browser_controller.tab_controller.setCurrentTabSearch(searchTerm);
    bible_browser_controller.tab_controller.setCurrentTextType('search_results');
    bible_browser_controller.text_loader.prepareForNewText(true);

    this._nodeSwordInterface.getModuleSearchResults(currentBibleTranslationId, searchTerm).then(async (searchResults) => {  
      var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
      var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList();
      var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();

      if (searchResults.length > 0) {
        await bible_browser_controller.text_loader.requestTextUpdate(currentTabId,
                                                                    null,
                                                                    null,
                                                                    searchResults,
                                                                    false);
      } else {
        bible_browser_controller.hideVerseListLoadingIndicator();
      }

      this.hide_search_menu();
      var moduleSearchHeaderText;

      if (searchResults.length > 0) {
        moduleSearchHeaderText = i18n.t("bible-browser.search-result-header") + ' ' + '"' + searchTerm + '"';
      } else {
        moduleSearchHeaderText = i18n.t("bible-browser.no-search-results") + ' ' + '"' + searchTerm + '"';
      }

      this.getModuleSearchHeader().html(moduleSearchHeaderText);
      this.getModuleSearchHeader().show();
    });
  }
}

module.exports = ModuleSearch;

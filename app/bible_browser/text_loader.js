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

class TextLoader {
  constructor() {
  }

  prepareForNewText(resetView, tabIndex=undefined) {
    bible_browser_controller.module_search.hide_module_search_header();
    bible_browser_controller.navigation_pane.initNavigationPaneForCurrentView(tabIndex);
    tags_controller.clear_verse_selection();

    var textType = bible_browser_controller.tab_controller.getTab(tabIndex).getTextType();    
    if (textType != 'book') {
      bible_browser_controller.book_selection_menu.clearSelectedBookInMenu();
    }

    if (resetView) {
      bible_browser_controller.resetVerseListView();
      bible_browser_controller.showVerseListLoadingIndicator();
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
      $('#export-tagged-verses-button').addClass('ui-state-disabled');
      bible_browser_controller.translation_controller.initChapterVerseCounts();
      currentVerseListMenu.find('.book-select-button').addClass('focused-button');

      await bible_browser_controller.communication_controller.request_book_text(
        tabIndex,
        tabId,
        book,
        (htmlVerseList) => { 
          this.renderVerseList(htmlVerseList, 'book', tabIndex);
        }
      );

    } else if (textType == 'tagged_verses') { // Tagged verse list mode
      $('#show-book-tag-statistics-button').addClass('ui-state-disabled');
      currentVerseListMenu.find('.tag-select-button').addClass('focused-button');

      await bible_browser_controller.communication_controller.request_verses_for_selected_tags(
        tabIndex,
        tabId,
        tagIdList,
        (htmlVerseList) => {
          this.renderVerseList(htmlVerseList, 'tagged_verses', tabIndex);
        }
      );

    } else if (textType == 'search_results') {
      $('#show-book-tag-statistics-button').addClass('ui-state-disabled');
      currentVerseListMenu.find('.module-search-button').addClass('focused-button');
      
      await bible_browser_controller.communication_controller.request_verses_for_search_results(
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

  renderVerseList(htmlVerseList, listType, tabIndex=undefined, target=undefined) {
    bible_browser_controller.translation_controller.hideBibleTranslationLoadingIndicator();
    bible_browser_controller.hideVerseListLoadingIndicator();
    var initialRendering = true;

    if (tabIndex === undefined) {
      var tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
      initialRendering = false;
    }

    if (target === undefined) {
      //console.log("Undefined target. Getting verse list target based on tabIndex " + tabIndex);
      target = bible_browser_controller.getCurrentVerseList(tabIndex);
    }

    target.html(htmlVerseList);

    if (!initialRendering) {
      bible_browser_controller.tab_controller.getTab().setTextType(listType);
    }

    if (listType == 'book') {
      bible_browser_controller.enable_toolbox();
      bible_browser_controller.tag_selection_menu.resetTagMenu();
      bible_browser_controller.module_search.reset_search();

    } else if (listType == 'tagged_verses') {

      bible_browser_controller.module_search.reset_search();
      bible_browser_controller.enable_tagging_toolbox_only();
      bible_browser_controller.enableTaggedVersesExportButton(tabIndex);

    } else if (listType == 'search_results') {

      //console.log("Rendering search results verse list on tab " + tabIndex);
      bible_browser_controller.enable_tagging_toolbox_only();
      bible_browser_controller.enableTaggedVersesExportButton(tabIndex);
    }

    if (!initialRendering) {
      bible_browser_controller.tab_controller.saveTabConfiguration();
    }

    bible_browser_controller.initApplicationForVerseList(tabIndex);
  }
}

module.exports = TextLoader;


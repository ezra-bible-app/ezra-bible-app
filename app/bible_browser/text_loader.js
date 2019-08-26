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

  async requestTextUpdate(tabId, book, tagIdList, searchResults, resetView, tabIndex=undefined) {
    bible_browser_controller.navigation_pane.initNavigationPaneForCurrentView(tabIndex);
    tags_controller.clear_verse_selection();

    if (resetView) {
      bible_browser_controller.resetVerseListView();
      bible_browser_controller.showVerseListLoadingIndicator();
    }

    var temporary_help = bible_browser_controller.getCurrentVerseListComposite(tabIndex).find('.temporary-help, .help-text');
    temporary_help.hide();

    if (book != null) { // Book text mode
      $('#export-tagged-verses-button').addClass('ui-state-disabled');
      bible_browser_controller.translation_controller.initChapterVerseCounts();

      await bible_browser_controller.communication_controller.request_book_text(
        tabIndex,
        tabId,
        book,
        (htmlVerseList) => { 
          this.renderVerseList(htmlVerseList, 'book', tabIndex);
        }
      );

    } else if (tagIdList != null) { // Tagged verse list mode
      $('#show-book-tag-statistics-button').addClass('ui-state-disabled');

      await bible_browser_controller.communication_controller.request_verses_for_selected_tags(
        tabIndex,
        tabId,
        tagIdList,
        (htmlVerseList) => {
          this.renderVerseList(htmlVerseList, 'tagged_verses', tabIndex);
        }
      );
    } else if (searchResults != null) {
      await bible_browser_controller.communication_controller.request_verses_for_search_results(
        tabIndex,
        tabId,
        searchResults,
        (htmlVerseList) => {
          this.renderVerseList(htmlVerseList, 'search_results', tabIndex);
        }
      );
    }
  }

  renderVerseList(htmlVerseList, listType, tabIndex=undefined) {
    bible_browser_controller.translation_controller.hideBibleTranslationLoadingIndicator();
    bible_browser_controller.hideVerseListLoadingIndicator();
    var initialRendering = true;

    if (tabIndex === undefined) {
      var tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
      initialRendering = false;
    }

    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    currentVerseList.html(htmlVerseList);

    if (listType == 'book') {

      if (!initialRendering) {
        bible_browser_controller.tab_controller.setCurrentTextIsBook(true);
      }

      bible_browser_controller.enable_toolbox();
      bible_browser_controller.tag_selection_menu.reset_tag_menu();

    } else if (listType == 'tagged_verses') {

      if (!initialRendering) {
        bible_browser_controller.tab_controller.setCurrentTextIsBook(false);
      }

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


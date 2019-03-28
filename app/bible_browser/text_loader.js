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

  requestTextUpdate(tabId, book, tagIdList, resetView) {
    bible_browser_controller.navigation_pane.initNavigationPaneForCurrentView();
    tags_controller.clear_verse_selection();

    if (resetView) {
      bible_browser_controller.resetVerseListView();
      bible_browser_controller.showVerseListLoadingIndicator();
      var temporary_help = bible_browser_controller.getCurrentVerseListComposite().find('.temporary-help');
      temporary_help.hide();
    }

    if (book != null) { // Book text mode
      $('#download-tagged-verses-button').addClass('ui-state-disabled');
      bible_browser_controller.translation_controller.initChapterVerseCounts();

      bible_browser_controller.communication_controller.request_book_text(
        tabId,
        book,
        (htmlVerseList) => { 
          this.renderVerseList(htmlVerseList, 'book');
        }
      );

    } else if (tagIdList != null) { // Tagged verse list mode
      $('#show-book-tag-statistics-button').addClass('ui-state-disabled');

      bible_browser_controller.communication_controller.request_verses_for_selected_tags(
        tabId,
        tagIdList,
        (htmlVerseList) => {
          this.renderVerseList(htmlVerseList, 'tagged_verses');
        }
      );
    }
  }

  renderVerseList(htmlVerseList, listType) {
    bible_browser_controller.translation_controller.hideBibleTranslationLoadingIndicator();
    bible_browser_controller.hideVerseListLoadingIndicator();
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    currentVerseList.html(htmlVerseList);

    if (listType == 'book') {

      bible_browser_controller.tab_controller.setCurrentTextIsBook(true);
      bible_browser_controller.enable_toolbox();
      bible_browser_controller.reset_tag_menu();

    } else if (listType == 'tagged_verses') {

      bible_browser_controller.tab_controller.setCurrentTextIsBook(false);
      bible_browser_controller.enable_tagging_toolbox_only();
      this.enableTaggedVersesExportButton();
    }

    bible_browser_controller.init_application_for_current_verse_list();
  }

  enableTaggedVersesExportButton() {
    /*$('#download-tagged-verses-button').removeClass('ui-state-disabled');

    var dl_button = $('#download-tagged-verses-button');
    dl_button.bind('click', function() {
      var selected_tags = bible_browser_controller.selected_tags();
      var url = '/tags/' + selected_tags + '/tagged_verses.odt';
      location.href = url;
    });
    dl_button.show();
    dl_button.removeClass('events-configured');
    configure_button_styles('.verse-list-menu');*/
  }
}

module.exports = TextLoader;


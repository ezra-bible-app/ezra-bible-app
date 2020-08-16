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

class VerseContextLoader {

  constructor() {
    this.context_verse = null;
    this.current_mouseover_verse_reference = null;
  }

  init_verse_expand_box(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    currentVerseList.find('.verse-reference-content').filter(":not('.tag-events-configured')").bind('mouseover',
      this.mouse_over_verse_reference_content
    );

    $("#expand-button").prop("title", i18n.t("bible-browser.load-verse-context"));

    $('#expand-button').filter(":not('.tag-events-configured')").bind('mouseover', function() {
      $(this).addClass('state-highlighted');
    });

    $('#expand-button').filter(":not('.tag-events-configured')").bind('mouseout', function() {
      $(this).removeClass('state-highlighted');
    });

    $('#expand-button').filter(":not('.tag-events-configured')").bind('click', async function() {
      var currentTabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
      var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
      var current_reference = $(bible_browser_controller.verse_context_loader.current_mouseover_verse_reference);
      var start_verse_box = current_reference.closest('.verse-box');
      var current_book_title = new VerseBox(start_verse_box[0]).getBibleBookShortTitle();
      var start_verse_nr = bible_browser_controller.verse_selection.reference_to_verse_nr(current_book_title,
                                                                                          start_verse_box.find('.verse-reference-content').html(),
                                                                                          false);
      start_verse_nr -= 3;
      if (start_verse_nr < 1) {
        start_verse_nr = 1;
      }

      var number_of_verses = 5;

      bible_browser_controller.verse_context_loader.context_verse = start_verse_box;

      bible_browser_controller.text_loader.requestBookText(
        currentTabIndex,
        currentTabId,
        current_book_title,
        (htmlVerseList) => { 
          bible_browser_controller.verse_context_loader.load_verse_context(htmlVerseList);
        },
        start_verse_nr,
        number_of_verses
      );

      $('#verse-expand-box').hide();
    }).addClass('tag-events-configured');

    // The following classes are representing the elements that will cause the the verse expand box to disappear when hovering over them
    var mouseOverHideClasses = '.verse-content, .tag-info, .navigation-pane, .tag-browser-verselist-book-header, .verse-list-menu';

    currentVerseList.find(mouseOverHideClasses).bind('mouseover', function() {
      bible_browser_controller.verse_context_loader.hide_verse_expand_box();
    }).addClass('tag-events-configured');
  }

  load_verse_context(verse_list) {
    // First remove existing verse boxes to avoid duplication
    var context_verse_id = $(bible_browser_controller.verse_context_loader.context_verse).find('.verse-reference-id').text();

    for (var i = 0; i < $(verse_list).length; i++) {
      var current_id = $($(verse_list)[i]).find('.verse-reference-id').text();

      if (current_id != "" && current_id != context_verse_id) {
        var existing_verse_box = $('.verse-reference-id-' + current_id);
        existing_verse_box.remove();
      }
    }

    // Replace the verse with its full context
    $(bible_browser_controller.verse_context_loader.context_verse).replaceWith(verse_list);

    // Clear the potentially existing verse selection
    bible_browser_controller.verse_selection.clear_verse_selection();

    // Select/highlight the tagged verse
    var selected_verse_box = $('.verse-reference-id-' + context_verse_id);
    bible_browser_controller.verse_selection.selected_verse_boxes.push(selected_verse_box);
    selected_verse_box.find('.verse-text').addClass('ui-selected');

    // Update the tags view after the selection
    tags_controller.update_tags_view_after_verse_selection(true);

    bible_browser_controller.bindEventsAfterBibleTextLoaded(undefined, true);
  }

  hide_verse_expand_box() {
    $('#verse-expand-box').hide();
    bible_browser_controller.verse_context_loader.current_mouseover_verse_reference = null;
  }

  mouse_over_verse_reference_content() {
    if ($(this)[0] != bible_browser_controller.verse_context_loader.current_mouseover_verse_reference) {
      bible_browser_controller.verse_context_loader.current_mouseover_verse_reference = $(this)[0];
      var verse_reference_position = $(this).offset();

      $('#verse-expand-box').css('top', verse_reference_position.top - 7);
      $('#verse-expand-box').css('left', verse_reference_position.left + 30);

      var currentBook = bible_browser_controller.tab_controller.getTab().getBook();

      if (currentBook == null) {
        $('#verse-expand-box').show();
      }
    }
  }
}

module.exports = VerseContextLoader;
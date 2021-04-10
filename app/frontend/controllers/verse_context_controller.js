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

const VerseBox = require('../ui_models/verse_box.js');

class VerseContextController {

  constructor() {
    this.context_verse = null;
    this.current_mouseover_verse_reference = null;
  }

  initButtonEvents() {
    this.getButton().bind('click', async () => {
      if (this.isButtonEnabled()) {
        await this.handleButtonClick();
      }
    });
  }

  async handleButtonClick(viaMouseOver=false) {
    var currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
    var currentTabId = app_controller.tab_controller.getSelectedTabId();
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

    var current_reference = null;

    if (viaMouseOver) {

      current_reference = $(app_controller.verse_context_controller.current_mouseover_verse_reference);

    } else if (app_controller.verse_selection.selected_verse_box_elements.length == 1) {

      current_reference = $(app_controller.verse_selection.selected_verse_box_elements[0]).find('.verse-reference');

    } else {

      return;
    }

    uiHelper.showTextLoadingIndicator();

    var start_verse_box = current_reference.closest('.verse-box');
    var current_book_title = new VerseBox(start_verse_box[0]).getBibleBookShortTitle();
    var verse_reference_helper = app_controller.verse_selection.verseReferenceHelper;
    var start_verse_nr = await verse_reference_helper.referenceStringToAbsoluteVerseNr(currentBibleTranslationId,
                                                                                       current_book_title,
                                                                                       start_verse_box.find('.verse-reference-content').html(),
                                                                                       false);
    start_verse_nr -= 3;
    if (start_verse_nr < 1) {
      start_verse_nr = 1;
    }

    var number_of_verses = 5;

    app_controller.verse_context_controller.context_verse = start_verse_box[0];

    app_controller.text_controller.requestBookText(
      currentTabIndex,
      currentTabId,
      current_book_title,
      (htmlVerseList) => { 
        app_controller.verse_context_controller.load_verse_context(htmlVerseList);
        uiHelper.hideTextLoadingIndicator();
      },
      start_verse_nr,
      number_of_verses
    );

    $('#verse-expand-box').hide();
  }

  init_verse_expand_box(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

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

    $('#expand-button').filter(":not('.tag-events-configured')").bind('click', () => {
      this.handleButtonClick(true);
    }).addClass('tag-events-configured');

    // The following classes are representing the elements that will cause the the verse expand box to disappear when hovering over them
    var mouseOverHideClasses = '.verse-content, .tag-info, .navigation-pane, .tag-browser-verselist-book-header, .verse-list-menu';

    currentVerseList.find(mouseOverHideClasses).bind('mouseover', function() {
      app_controller.verse_context_controller.hide_verse_expand_box();
    }).addClass('tag-events-configured');
  }

  load_verse_context(verse_list) {
    // First remove existing verse boxes to avoid duplication
    var context_verse_id = new VerseBox(this.context_verse).getVerseReferenceId();

    verse_list = $("<div>" + verse_list + "</div>").find('.verse-box');

    for (var i = 0; i < verse_list.length; i++) {
      var currentVerseBox = verse_list[i];
      var current_id = new VerseBox($(currentVerseBox)[0]).getVerseReferenceId();

      if (current_id != "" && current_id != context_verse_id) {
        var existing_verse_box = $('.verse-reference-id-' + current_id);
        existing_verse_box.remove();
      }
    }

    // Replace the verse with its full context
    $(app_controller.verse_context_controller.context_verse).replaceWith(verse_list);

    // Clear the potentially existing verse selection
    app_controller.verse_selection.clear_verse_selection();

    // Select/highlight the tagged verse
    var selected_verse_box = $('.verse-reference-id-' + context_verse_id);
    app_controller.verse_selection.selected_verse_box_elements.push(selected_verse_box);
    selected_verse_box.find('.verse-text').addClass('ui-selected');

    // Update the tags view after the selection
    tags_controller.updateTagsViewAfterVerseSelection(true);

    app_controller.bindEventsAfterBibleTextLoaded(undefined, true);
  }

  hide_verse_expand_box() {
    $('#verse-expand-box').hide();
    app_controller.verse_context_controller.current_mouseover_verse_reference = null;
  }

  mouse_over_verse_reference_content() {
    if ($(this)[0] != app_controller.verse_context_controller.current_mouseover_verse_reference) {
      app_controller.verse_context_controller.current_mouseover_verse_reference = $(this)[0];
      var verse_reference_position = $(this).offset();

      $('#verse-expand-box').css('top', verse_reference_position.top - 7);
      $('#verse-expand-box').css('left', verse_reference_position.left + 30);

      var currentBook = app_controller.tab_controller.getTab().getBook();

      if (currentBook == null) {
        $('#verse-expand-box').show();
      }
    }
  }

  getButton() {
    return $('.show-context-button');
  }

  isButtonEnabled() {
    return !(this.getButton().hasClass('ui-state-disabled'));
  }

  enableContextButton() {
    this.getButton().removeClass('ui-state-disabled');
  }

  disableContextButton() {
    this.getButton().addClass('ui-state-disabled');
  }
}

module.exports = VerseContextController;
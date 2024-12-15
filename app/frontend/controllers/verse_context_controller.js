/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const verseListController = require('../controllers/verse_list_controller.js');
const VerseReferenceHelper = require('../helpers/verse_reference_helper.js');

class VerseContextController {

  constructor() {
    this.context_verse = null;
    this.verseReferenceHelper = new VerseReferenceHelper(ipcNsi);
  }

  initButtonEvents() {
    var button = this.getButton();

    button.unbind('click');
    button.bind('click', async (event) => {
      event.stopPropagation();

      if (this.isButtonEnabled()) {
        document.getElementById('verse-context-menu').hidden = true;
        await this.handleButtonClick();
      }
    });
  }

  async handleButtonClick(viaMouseOver=false) {
    var currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
    var currentTabId = app_controller.tab_controller.getSelectedTabId();
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

    var current_reference = null;
    let selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();

    if (viaMouseOver) {

      current_reference = $(app_controller.verse_context_controller.current_mouseover_verse_reference);

    } else if (selectedVerseBoxes.length == 1) {

      current_reference = $(selectedVerseBoxes[0]).find('.verse-reference');

    } else {

      return;
    }

    uiHelper.showTextLoadingIndicator();

    var start_verse_box = current_reference.closest('.verse-box');
    var current_book_title = new VerseBox(start_verse_box[0]).getBibleBookShortTitle();
    var start_verse_nr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(currentBibleTranslationId,
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

    // Select/highlight the tagged verse
    let selected_verse_box = $('.verse-reference-id-' + context_verse_id);
    let currentVerseText = selected_verse_box.find('.verse-text-container')[0];
    app_controller.verse_selection.setVerseAsSelection(currentVerseText);

    verseListController.bindEventsAfterBibleTextLoaded(undefined, true);
    app_controller.word_study_controller.bindAfterBibleTextLoaded();
  }

  getButton() {
    return $('.show-context-button');
  }

  getAllButtons() {
    return document.getElementsByClassName('show-context-button');
  }

  isButtonEnabled() {
    return !(this.getButton().hasClass('ui-state-disabled'));
  }

  enableContextButton() {
    var allButtons = this.getAllButtons();
    for (let button of allButtons) {
      button.classList.remove('ui-state-disabled');
    }
  }

  disableContextButton() {
    var allButtons = this.getAllButtons();
    for (let button of allButtons) {
      button.classList.add('ui-state-disabled');
    }
  }
}

module.exports = VerseContextController;
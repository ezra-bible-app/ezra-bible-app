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

const VerseBox = require('../ui_models/verse_box.js');
const verseListController = require('./verse_list_controller.js');
const VerseReferenceHelper = require('../helpers/verse_reference_helper.js');

class VerseContextController {

  constructor() {
    this.contextVerse = null;
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

    var currentReference = null;
    let selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();

    if (viaMouseOver) {

      currentReference = $(app_controller.verse_context_controller.current_mouseover_verse_reference);

    } else if (selectedVerseBoxes.length == 1) {

      currentReference = $(selectedVerseBoxes[0]).find('.verse-reference');

    } else {

      return;
    }

    uiHelper.showTextLoadingIndicator();

    var startVerseBox = currentReference.closest('.verse-box');
    var currentBookTitle = new VerseBox(startVerseBox[0]).getBibleBookShortTitle();
    var startVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(currentBibleTranslationId,
                                                                                          currentBookTitle,
                                                                                          startVerseBox.find('.verse-reference-content').html(),
                                                                                          false);
    startVerseNr -= 3;
    if (startVerseNr < 1) {
      startVerseNr = 1;
    }

    var numberOfVerses = 5;

    app_controller.verse_context_controller.contextVerse = startVerseBox[0];

    app_controller.text_controller.requestBookText(
      currentTabIndex,
      currentTabId,
      currentBookTitle,
      (htmlVerseList) => { 
        app_controller.verse_context_controller.loadVerseContext(htmlVerseList);
        uiHelper.hideTextLoadingIndicator();
      },
      startVerseNr,
      startVerseNr, // Fix verse number for second Bible translation
      numberOfVerses
    );
  }

  loadVerseContext(verseList) {
    // First remove existing verse boxes to avoid duplication
    var contextVerseId = new VerseBox(this.contextVerse).getVerseReferenceId();
    var currentVerseList = verseListController.getCurrentVerseList();

    verseList = $("<div>" + verseList + "</div>").find('.verse-box');

    // Remove matching existing verse boxes to avoid duplication
    for (var i = 0; i < verseList.length; i++) {
      var currentVerseBox = verseList[i];
      var currentId = new VerseBox($(currentVerseBox)[0]).getVerseReferenceId();

      if (currentId != "" && currentId != contextVerseId) {
        var existingVerseBox = currentVerseList.find('.verse-reference-id-' + currentId);
        existingVerseBox.remove();
      }
    }

    // Replace the verse with its full context
    $(app_controller.verse_context_controller.contextVerse).replaceWith(verseList);

    // Select/highlight the tagged verse
    let selectedVerseBox = currentVerseList.find('.verse-reference-id-' + contextVerseId);
    let currentVerseText = selectedVerseBox.find('.verse-text-container')[0];
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
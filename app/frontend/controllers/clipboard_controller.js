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
const { getPlatform } = require('../helpers/ezra_helper.js');

/**
 * This controller handles clipboard copy actions.
 * @module clipboardController
 * @category Controller
 */

module.exports.init = function() {
    eventController.subscribe('on-tab-selected', (tabIndex) => {
      this.disableButton(tabIndex);
    });

    eventController.subscribe('on-verses-selected', (selectionDetails) => {
      this.toggleButton(selectionDetails);

      const versesSelected = selectionDetails.selectedElements.length > 0;
      if (!versesSelected) {
        this.clearTextSelection();
      }
    });
};

module.exports.handleCopyButtonClick = function(event) {
  event.stopPropagation();

  if (!event.target.classList.contains('ui-state-disabled')) {
    this.copyTextToClipboard();
  }
};

module.exports.copyTextToClipboard = function() {
  if (this.isTextSelected()) {
    this.copySelectedTextToClipboard();
  } else {
    app_controller.verse_selection.copySelectedVerseTextToClipboard();
  }
};

module.exports.copySelectedTextToClipboard = function() {
  const selection = window.getSelection();

  if (this.isTextSelected()) {
    const selectedText = selection.toString();

    getPlatform().copyToClipboard(selectedText, selectedText);

    window.uiHelper.showSuccessMessage(i18n.t('bible-browser.copy-selected-text-to-clipboard-success'));
  }
};

module.exports.isTextSelected = function() {
  const selection = window.getSelection();
  return selection && selection.rangeCount > 0 && !selection.isCollapsed;
}

module.exports.clearTextSelection = function() {
  const selection = window.getSelection();
  selection.empty();
};

module.exports.toggleButton = function(verseSelectionDetails) {
  const versesSelected = verseSelectionDetails.selectedElements.length > 0;

  if (versesSelected) {
    this.enableButton();
  } else {
    this.disableButton();
  }
}

module.exports.enableButton = function(tabIndex) {
  const currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
  const copyButton = currentVerseListMenu[0].querySelector('.copy-button');
  copyButton.classList.remove('ui-state-disabled');
}

module.exports.disableButton = function(tabIndex) {
  const currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
  const copyButton = currentVerseListMenu[0].querySelector('.copy-button');
  copyButton.classList.add('ui-state-disabled');
};

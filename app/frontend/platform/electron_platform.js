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

const i18nHelper = require('../helpers/i18n_helper.js');

/**
 * This class controls Electron platform specific functionality:
 * - Full screen toggling and status checking as well as writing to the clipboard
 */
class ElectronPlatform {
  constructor() {}

  getWindow() {
    const { remote } = require('electron');
    var window = remote.getCurrentWindow();
    return window;
  }

  toggleFullScreen() {
    const { remote } = require('electron');
    var window = remote.getCurrentWindow();

    if (window.isFullScreen()) {
      window.setFullScreen(false);
    } else {
      window.setFullScreen(true);
    }
  }

  isFullScreen() {
    var window = this.getWindow();
    return window.isFullScreen();
  }
  
  getLineBreak() {
    if (process.platform === 'win32') {
      return "\r\n";
    } else {
      return "\n";
    }
  }

  async copySelectedVersesToClipboard() {
    const { clipboard } = require('electron');
    const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    const separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
    
    var selectedVerseBoxes = app_controller.verse_selection.selected_verse_box_elements;
    
    var selectedText = "";
    const selectionHasMultipleVerses = selectedVerseBoxes.length > 1;

    for (let i = 0; i < selectedVerseBoxes.length; i++) {
      let currentVerseBox = $(selectedVerseBoxes[i]);
      let verseReferenceContent = currentVerseBox.find('.verse-reference-content').text();
      let currentVerseNr = verseReferenceContent.split(separator)[1];
      
      let currentText = currentVerseBox.find('.verse-text').clone();
      currentText.find('.sword-markup').remove();

      if (selectionHasMultipleVerses) {
        selectedText += currentVerseNr + " ";
      }

      selectedText += currentText.text().trim() + " ";
    }

    selectedText = selectedText.trim();
    selectedText += " " + this.getLineBreak() + app_controller.verse_selection.getSelectedVersesLabel().text();

    clipboard.writeText(selectedText);
  }
}

module.exports = ElectronPlatform;
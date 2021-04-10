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

const Mousetrap = require('mousetrap');
const DictionaryInfoBox = require('../components/dictionary_info_box.js');
let jsStrongs = null;

/**
 * The DictionaryController handles functionality for the lookup of dictionary information based on Strong's keys.
 * It handles the mouse move events when the user is hovering individual words in the text while holding SHIFT.
 * It also handles the state of the dictionary info box.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.dictionary_controller`.
 * 
 * @category Controller
 */
class DictionaryController {
  constructor() {
    this.currentStrongsIds = null;
    this.currentStrongsElement = null;
    this.currentVerseText = null;
    this.strongsBox = $('#strongs-box');
    this.shiftKeyPressed = false;
    this.strongsAvailable = false;
    this.dictionaryInfoBox = new DictionaryInfoBox(this);

    this.strongsBox.bind('mouseout', () => {
      this.hideStrongsBox();
    });

    Mousetrap.bind('shift', () => {
      this.shiftKeyPressed = true;
    });

    $(document).on('keyup', (e) => {
      if (e.key == 'Shift') {
        this.shiftKeyPressed = false;
      }
    });

    this.runAvailabilityCheck();
  }

  getJsStrongs() {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    return jsStrongs;
  }

  async runAvailabilityCheck() {
    this.strongsAvailable = await ipcNsi.strongsAvailable();
  }

  hideStrongsBox(removeHl=false) {
    if (this.currentStrongsElement != null && removeHl) {
      this.currentStrongsElement.removeClass('strongs-hl');
    }

    this.strongsBox.hide();
  }

  showInfoBox() {
    return this.dictionaryInfoBox.showDictInfoBox();
  }

  hideInfoBox() {
    return this.dictionaryInfoBox.hideDictInfoBox();
  }

  clearInfoBox() {
    this.dictionaryInfoBox.clearDictInfoBox();
  }

  async bindAfterBibleTextLoaded(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    if (currentTab == null) {
      return;
    }
    
    var currentBibleTranslationId = currentTab.getBibleTranslationId();
    var translationHasStrongs = await app_controller.translation_controller.hasBibleTranslationStrongs(currentBibleTranslationId);

    if (translationHasStrongs) {
      var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
      var currentWElements = currentVerseList.find('w');
      var currentVerseTextElements = currentVerseList.find('.verse-text');

      currentVerseTextElements.bind('mousemove', (e) => {
        app_controller.tab_search.blurInputField();
        this.handleVerseMouseMove(e);
      });

      currentWElements.bind('mousemove', async (e) => {
        app_controller.tab_search.blurInputField();
        await this.handleStrongsMouseMove(e);
      });
    }
  }

  async getStrongsEntryWithRawKey(rawKey, normalizedKey=undefined) {
    if (normalizedKey == undefined) {
      var normalizedKey = this.getNormalizedStrongsId(rawKey);
    }

    var strongsEntry = null;

    try {
      strongsEntry = await ipcNsi.getStrongsEntry(normalizedKey);
      strongsEntry['rawKey'] = rawKey;
    } catch (e) {
      console.log("DictionaryController.getStrongsEntryWithRawKey: Got exception when getting strongs entry for key " + normalizedKey);
    }

    return strongsEntry;
  }

  getStrongsIdsFromStrongsElement(strongsElement) {
    var strongsIds = [];

    try {
      var rawStrongsIdList = strongsElement.attr('class').split(' ');

      for (var i = 0; i < rawStrongsIdList.length; i++) {
        if (rawStrongsIdList[i].indexOf('strong') != -1) {
          try {
            var strongsId = rawStrongsIdList[i].split(':')[1];

            if (strongsId != undefined) {
              strongsIds.push(strongsId);
            }
          } catch (e) {}
        }
      }
    } catch (e) { }

    return strongsIds;
  }

  getNormalizedStrongsId(strongsId) {
    if (strongsId == undefined) {
      return undefined;
    }

    var strongsNumber = parseInt(strongsId.substring(1));
    strongsId = strongsId[0] + strongsNumber;
    return strongsId;
  }

  isValidStrongsKey(strongsKey) {
    return strongsKey in this.getJsStrongs();
  }

  async showStrongsInfo(strongsIds, showStrongsBox=true) {
    var normalizedStrongsIds = [];

    for (var i = 0; i < strongsIds.length; i++) {
      var normalizedStrongsId = this.getNormalizedStrongsId(strongsIds[i]);
      normalizedStrongsIds.push(normalizedStrongsId);

      if (!this.isValidStrongsKey(normalizedStrongsId)) {
        console.log(normalizedStrongsId + " is not a valid Strong's key! Issue with rawKey " + strongsIds[i] + "?");
        return;
      }
    }

    var lemma = this.getJsStrongs()[normalizedStrongsIds[0]].lemma;
    var strongsShortInfo = lemma;

    try {
      var shortInfos = [];
      var firstStrongsEntry = null;
      var additionalStrongsEntries = [];

      for (var i = 0; i < normalizedStrongsIds.length; i++) {
        var strongsEntry = await this.getStrongsEntryWithRawKey(strongsIds[i], normalizedStrongsIds[i]);

        if (i == 0) {
          firstStrongsEntry = strongsEntry;
        } else {
          additionalStrongsEntries.push(strongsEntry);
        }

        var currentShortInfo = strongsEntry.rawKey + ": " + strongsEntry.transcription + " &mdash; " + strongsShortInfo;
        shortInfos.push(currentShortInfo);
      }

      if (shortInfos.length > 1) {
        strongsShortInfo = "<table>";

        for (var i = 0; i < shortInfos.length; i++) {
          strongsShortInfo += "<tr>";
          strongsShortInfo += "<td>" + shortInfos[i].split(":")[0] + ":</td>";
          strongsShortInfo += "<td style='text-align: left;'>" + shortInfos[i].split(":")[1] + "</td>";
          strongsShortInfo += "</tr>";
        }

        strongsShortInfo += "</table>";

      } else {
        strongsShortInfo = shortInfos[0];
      }

      this.strongsBox.html(strongsShortInfo);
      this.dictionaryInfoBox.updateDictInfoBox(firstStrongsEntry, additionalStrongsEntries, true);
    } catch (e) {
      console.log(e);
    }

    if (this.currentStrongsElement != null) {
      this.currentStrongsElement.bind('mouseout', () => {
        if (!this.shiftKeyPressed) {
          this.hideStrongsBox();
        }
      });

      if (showStrongsBox) {
        this.strongsBox.show().position({
          my: "bottom",
          at: "center top",
          of: this.currentStrongsElement
        });
      }
    }
  }

  async handleStrongsMouseMove(event) {
    if (!app_controller.optionsMenu._dictionaryOption.isChecked()) {
      return;
    }

    if (!this.shiftKeyPressed) {
      return;
    }

    if (this.strongsAvailable) {
      var strongsIds = this.getStrongsIdsFromStrongsElement($(event.target).closest('w'));
      
      if (this.currentStrongsElement != null && 
          this.currentStrongsElement[0] == event.target) {
        return;
      }

      this.currentStrongsIds = strongsIds;

      if (this.currentStrongsElement != null) {
        this.currentStrongsElement.removeClass('strongs-hl');
      }
        
      this.currentStrongsElement = $(event.target);

      if (strongsIds.length > 0) {
        this.currentStrongsElement.addClass('strongs-hl');    
        this.strongsBox.css({
          'fontSize': this.currentStrongsElement.css('fontSize')
        });

        await this.showStrongsInfo(strongsIds);
      }
    }
  }

  handleVerseMouseMove(event) {
    if (!app_controller.optionsMenu._dictionaryOption.isChecked()) {
      return;
    }

    if (!this.shiftKeyPressed) {
      return;
    }

    if (this.currentVerseText != null) {
      this.currentVerseText.removeClass('strongs-current-verse');
    }

    this.currentVerseText = $(event.target).closest('.verse-text');
    this.currentVerseText.addClass('strongs-current-verse');
  }

  logDoubleStrongs() {
    var currentVerseList = app_controller.getCurrentVerseList();
    var currentWElements = currentVerseList.find('w');

    for (var i = 0; i < currentWElements.length; i++) {
      var el = currentWElements[i];
      var strongWord = $(el).text();
      var currentVerseBox = $(el).closest('.verse-box');
      var reference = currentVerseBox.find('.verse-reference-content').text();
      var classData = $(el).prop('class');

      var classes = classData.split(' ');
      if (classes.length > 1) {
        console.log(reference + ' | ' + strongWord + ' | ' + classData);
      }
    }
  }
}

module.exports = DictionaryController;
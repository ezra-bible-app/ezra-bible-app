/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const Mousetrap = require('mousetrap');
const jsStrongs = require('strongs');

const DictionaryInfoBox = require('../components/dictionary_info_box.js');

class DictionaryController {
  constructor() {
    this.currentStrongsIds = null;
    this.currentStrongsElement = null;
    this.currentVerseText = null;
    this.strongsBox = $('#strongs-box');
    this.shiftKeyPressed = false;
    this.strongsAvailable = false;
    this.dictionaryInfoBox = new DictionaryInfoBox(this);

    $('#dictionary-info-box').accordion();

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

  runAvailabilityCheck() {
    this.strongsAvailable = nsi.strongsAvailable();
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

  bindAfterBibleTextLoaded(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    if (currentTab == null) {
      return;
    }
    
    var currentBibleTranslationId = currentTab.getBibleTranslationId();

    if (app_controller.translation_controller.hasBibleTranslationStrongs(currentBibleTranslationId)) {
      var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
      var currentWElements = currentVerseList.find('w');
      var currentVerseTextElements = currentVerseList.find('.verse-text');

      currentVerseTextElements.bind('mousemove', (e) => {
        app_controller.tab_search.blurInputField();
        this.handleVerseMouseMove(e);
      });

      currentWElements.bind('mousemove', (e) => {
        app_controller.tab_search.blurInputField();
        this.handleStrongsMouseMove(e);
      });
    }
  }

  getStrongsEntryWithRawKey(rawKey, normalizedKey=undefined) {
    if (normalizedKey == undefined) {
      var normalizedKey = this.getNormalizedStrongsId(rawKey);
    }

    var strongsEntry = nsi.getStrongsEntry(normalizedKey);
    strongsEntry['rawKey'] = rawKey;
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
    return strongsKey in jsStrongs;
  }

  showStrongsInfo(strongsIds, showStrongsBox=true) {
    var normalizedStrongsIds = [];

    for (var i = 0; i < strongsIds.length; i++) {
      var normalizedStrongsId = this.getNormalizedStrongsId(strongsIds[i]);
      normalizedStrongsIds.push(normalizedStrongsId);

      if (!this.isValidStrongsKey(normalizedStrongsId)) {
        console.log(normalizedStrongsId + " is not a valid Strong's key! Issue with rawKey " + strongsIds[i] + "?");
        return;
      }
    }

    var lemma = jsStrongs[normalizedStrongsIds[0]].lemma;
    var strongsShortInfo = lemma;

    try {
      var shortInfos = [];
      var firstStrongsEntry = null;
      var additionalStrongsEntries = [];

      for (var i = 0; i < normalizedStrongsIds.length; i++) {
        var strongsEntry = this.getStrongsEntryWithRawKey(strongsIds[i], normalizedStrongsIds[i]);

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

  handleStrongsMouseMove(event) {
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

        this.showStrongsInfo(strongsIds);
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
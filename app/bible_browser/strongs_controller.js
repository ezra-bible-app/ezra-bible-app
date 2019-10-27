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

const jsStrongs = require('strongs');
const NodeSwordInterface = require('node-sword-interface');
const Mousetrap = require('mousetrap');

class StrongsController {
  constructor() {
    this.nodeSwordInterface = new NodeSwordInterface();
    this.currentStrongsElement = null;
    this.strongsBox = $('#strongs-box');
    this.dictionaryInfoBoxHeader = $('#dictionary-info-box-header');
    this.dictionaryInfoBoxLock = $('#dictionary-info-box-lock');
    this.dictionaryInfoBox = $('#dictionary-info-box-content');
    this.dictionaryInfoBoxBreadcrumbs = $('#dictionary-info-box-breadcrumbs');
    this.dictionaryInfoBoxStack = [];
    this.currentStrongsEntry = null;
    this.currentLemma = null;
    this.shiftKeyPressed = false;
    this.strongsAvailable = false;

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
    this.strongsAvailable = this.nodeSwordInterface.strongsAvailable();
  }

  hideStrongsBox(removeHl=false) {
    if (this.currentStrongsElement != null && removeHl) {
      this.currentStrongsElement.removeClass('strongs-hl');
    }

    this.strongsBox.hide();
  }

  clearDictInfoBox() {
    $('#dictionary-info-box').find('div').empty();
    this.dictionaryInfoBoxHeader.text(i18n.t("dictionary-info-box.help-instruction"));
  }

  bindAfterBibleTextLoaded(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentBibleTranslationId = currentTab.getBibleTranslationId();

    if (bible_browser_controller.translation_controller.hasBibleTranslationStrongs(currentBibleTranslationId)) {
      var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
      currentVerseList.find('w').bind('mouseover', (e) => {
        this.handleStrongsMouseOver(e);
      });
    }
  }

  getStrongsIdFromStrongsElement(strongsElement) {
    var rawStrongsId = strongsElement.attr('class');
    var strongsId = rawStrongsId.split(' ')[0].split(':')[1];
    var strongsNumber = parseInt(strongsId.substring(1));
    strongsId = strongsId[0] + strongsNumber;
    return strongsId;
  }

  showStrongsInfo(strongsId) {
    var lemma = jsStrongs[strongsId].lemma;
    var strongsShortInfo = lemma;

    try {
      var strongsEntry = this.nodeSwordInterface.getStrongsEntry(strongsId);
      strongsShortInfo = strongsEntry.key + ": " + strongsEntry.transcription + " &mdash; " + strongsShortInfo;
      this.strongsBox.html(strongsShortInfo);
      this.dictionaryInfoBoxStack = [ strongsId ];
      this.updateDictInfoBox(strongsEntry, lemma);
    } catch (e) {
      console.log(e);
    }

    this.currentStrongsElement.bind('mouseout', () => {
      if (!this.shiftKeyPressed) {
        this.hideStrongsBox();
      }
    });

    this.strongsBox.show().position({
      my: "bottom",
      at: "center top",
      of: this.currentStrongsElement
    });
  }

  handleStrongsMouseOver(event) {
    if (!bible_browser_controller.optionsMenu.strongsSwitchChecked()) {
      return;
    }

    if (this.shiftKeyPressed) {
      return;
    }

    if (this.currentStrongsElement != null) {
      this.currentStrongsElement.removeClass('strongs-hl');
    }

    this.currentStrongsElement = $(event.target);
    this.currentStrongsElement.addClass('strongs-hl');    
    this.strongsBox.css({
      'fontSize': this.currentStrongsElement.css('fontSize')
    });

    if (this.strongsAvailable) {
      var strongsId = this.getStrongsIdFromStrongsElement(this.currentStrongsElement);
      this.showStrongsInfo(strongsId);
    }
  }

  getCurrentDictInfoBreadcrumbs() {
    var crumbArray = [];

    for (var i = 0; i < this.dictionaryInfoBoxStack.length; i++) {
      if (i < this.dictionaryInfoBoxStack.length - 1) {
        var currentRewindNumber = this.dictionaryInfoBoxStack.length - i - 1;
        var currentCrumb = "<a href='javascript:bible_browser_controller.strongs_controller.rewindDictInfo(" + currentRewindNumber + ")'>";
        currentCrumb += this.dictionaryInfoBoxStack[i];
        currentCrumb += "</a>";
      } else {
        currentCrumb = "<b>" + this.dictionaryInfoBoxStack[i] + "</b>";
      }

      crumbArray.push(currentCrumb);
    }

    return crumbArray.join(' &rarr; ');
  }

  rewindDictInfo(rewindNumber) {
    for (var i = 0; i < rewindNumber; i++) {
      this.dictionaryInfoBoxStack.pop();
      var key = this.dictionaryInfoBoxStack[this.dictionaryInfoBoxStack.length - 1];
      this.currentStrongsEntry = this.nodeSwordInterface.getStrongsEntry(key);
      this.currentLemma = jsStrongs[key].lemma;
    }

    this.updateDictInfoBox(this.currentStrongsEntry, this.currentLemma);
  }

  updateDictInfoBox(strongsEntry, lemma) {
    this.currentStrongsEntry = strongsEntry;
    this.currentLemma = lemma;

    var dictInfoHeader = this.getDictInfoHeader(strongsEntry);
    this.dictionaryInfoBoxHeader.html(dictInfoHeader);
    this.dictionaryInfoBoxBreadcrumbs.html(this.getCurrentDictInfoBreadcrumbs());
    this.dictionaryInfoBoxLock.show();

    var extendedStrongsInfo = this.getExtendedStrongsInfo(strongsEntry, lemma);
    this.dictionaryInfoBox.html(extendedStrongsInfo);
  }

  getDictInfoHeader(strongsEntry) {
    var infoHeader = "";
    var language;

    if (strongsEntry.key[0] == 'G') {
      language = i18n.t('dictionary-info-box.greek');
    } else {
      language = i18n.t('dictionary-info-box.hebrew');
    }

    infoHeader += "<b>Strong's " + language + "</b>";
    return infoHeader;
  }

  getShortInfo(strongsEntry, lemma) {
    var strongsShortInfo = strongsEntry.transcription + " &mdash; " + 
                           strongsEntry.phoneticTranscription + " &mdash; " + 
                           lemma;
    return strongsShortInfo;
  }

  getExtendedStrongsInfo(strongsEntry, lemma) {
    var extendedStrongsInfo = "";

    var strongsShortInfo = this.getShortInfo(strongsEntry, lemma);

    extendedStrongsInfo += strongsShortInfo;
    extendedStrongsInfo += "<br/><br/>";
    extendedStrongsInfo += strongsEntry.definition;

    if (strongsEntry.references.length > 0) {
      extendedStrongsInfo += "<br/><br/>";
      extendedStrongsInfo += "Related Strong's:<br/>";

      extendedStrongsInfo += "<table class='strongs-refs'>";

      for (var i = 0;  i < strongsEntry.references.length; i++) {
        var referenceKey = strongsEntry.references[i].key;
        var referenceStrongsEntry = this.nodeSwordInterface.getStrongsEntry(referenceKey);
        var referenceStrongsLemma = jsStrongs[referenceKey].lemma;

        var referenceLink = "<a href=\"javascript:bible_browser_controller.strongs_controller.openStrongsReference('";
        referenceLink += referenceKey;
        referenceLink += "')\">" + referenceKey + "</a>";

        var trClass = '';
        if (i != strongsEntry.references.length - 1) {
          trClass = "class='td-underline'";
        }

        extendedStrongsInfo += "<tr + " + trClass + ">" +
                               "<td>" + referenceLink + "</td>" + 
                               "<td>" + referenceStrongsEntry.transcription + "</td>" +
                               "<td>" + referenceStrongsEntry.phoneticTranscription + "</td>" + 
                               "<td>" + referenceStrongsLemma + "</td>" +
                               "</tr>";
      }

      extendedStrongsInfo += "</table>";
    }    
    return extendedStrongsInfo;
  }

  openStrongsReference(key) {
    try {
      var strongsEntry = this.nodeSwordInterface.getStrongsEntry(key);
      var lemma = jsStrongs[key].lemma;

      // If the last element of the stack is the one that we want to navigate to ... just pop the stack
      if (this.dictionaryInfoBoxStack.length >= 2 && this.dictionaryInfoBoxStack[this.dictionaryInfoBoxStack.length - 2] == key) {
        this.rewindDictInfo(1);
      } else {
        // Otherwise push on the stack
        this.dictionaryInfoBoxStack.push(key);
        this.updateDictInfoBox(strongsEntry, lemma);
      }
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = StrongsController;
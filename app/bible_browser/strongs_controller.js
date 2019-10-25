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

const strongs = require('strongs');
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
    this.shiftKeyPressed = false;

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
  }

  hideStrongsBox() {
    if (this.currentStrongsElement != null) {
      this.currentStrongsElement.removeClass('strongs-hl');
    }

    this.strongsBox.hide();
  }

  bindAfterBibleTextLoaded(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentBibleTranslationId = currentTab.getBibleTranslationId();

    if (bible_browser_controller.translation_controller.hasBibleTranslationStrongs(currentBibleTranslationId)) {
      var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
      currentVerseList.find('w').bind('mouseover', (e) => {
        this.handleMouseOver(e);
      });
    }
  }

  handleMouseOver(event) {
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
    var rawStrongsId = this.currentStrongsElement.attr('class');
    var strongsId = rawStrongsId.split(' ')[0].split(':')[1];
    var strongsNumber = parseInt(strongsId.substring(1));
    strongsId = strongsId[0] + strongsNumber;
    
    this.strongsBox.css({
      'fontSize': this.currentStrongsElement.css('fontSize')
    });

    if (this.nodeSwordInterface.strongsAvailable()) {
      var lemma = strongs[strongsId].lemma;
      var strongsShortInfo = lemma;

      try {
        var strongsEntry = this.nodeSwordInterface.getStrongsEntry(strongsId);
        strongsShortInfo = strongsEntry.key + ": " + strongsEntry.transcription + " &mdash; " + strongsShortInfo;
        this.strongsBox.html(strongsShortInfo);

        var dictInfoHeader = this.getDictInfoHeader(strongsEntry);
        this.dictionaryInfoBoxHeader.html(dictInfoHeader);
        this.dictionaryInfoBoxLock.show();

        var extendedStrongsInfo = this.getExtendedStrongsInfo(strongsEntry, lemma);
        this.dictionaryInfoBox.html(extendedStrongsInfo);
      } catch (e) {
        console.log(e);
      }

      this.currentStrongsElement.bind('mouseout', () => {
        this.hideStrongsBox();
      });
  
      this.strongsBox.show().position({
        my: "bottom",
        at: "center top",
        of: this.currentStrongsElement
      });
    }
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

  getExtendedStrongsInfo(strongsEntry, lemma) {
    var extendedStrongsInfo = "";
    var language;

    if (strongsEntry.key[0] == 'G') {
      language = "Greek";
    } else {
      language = "Hebrew";
    }

    var strongsShortInfo = strongsEntry.key + ": " + 
                           strongsEntry.transcription + " &mdash; " + 
                           strongsEntry.phoneticTranscription + " &mdash; " + 
                           lemma;

    extendedStrongsInfo += strongsShortInfo;
    extendedStrongsInfo += "<br/><br/>";
    extendedStrongsInfo += strongsEntry.definition;
    extendedStrongsInfo += "<br/><br/>";

    for (var i = 0;  i < strongsEntry.references.length; i++) {
      extendedStrongsInfo += strongsEntry.references[i] + "<br/>";
    }
    
    return extendedStrongsInfo;
  }
}

module.exports = StrongsController;
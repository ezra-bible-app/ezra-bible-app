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

const Mousetrap = require('mousetrap');
let jsStrongs = null;

class StrongsController {
  constructor() {
    this.currentStrongsElement = null;
    this.currentVerseText = null;
    this.strongsBox = $('#strongs-box');
    this.dictionaryInfoBox = $('#dictionary-info-box');
    this.dictionaryInfoBoxPanel = $('#dictionary-info-box-panel');
    this.dictionaryInfoBoxHeader = $('#dictionary-info-box-header');
    this.dictionaryInfoBoxHelp = $('#dictionary-info-box-help');
    this.dictionaryInfoBoxContent = $('#dictionary-info-box-content');
    this.dictionaryInfoBoxBreadcrumbs = $('#dictionary-info-box-breadcrumbs');
    this.dictionaryInfoBoxStack = [];
    this.currentStrongsEntry = null;
    this.currentLemma = null;
    this.shiftKeyPressed = false;
    this.strongsAvailable = false;

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

  clearDictInfoBox() {
    this.dictionaryInfoBoxPanel.find('div').empty();
    this.dictionaryInfoBoxHeader.html(i18n.t("dictionary-info-box.default-header", { interpolation: {escapeValue: false} }));
    this.dictionaryInfoBoxHelp.html(i18n.t("dictionary-info-box.help-instruction", { interpolation: {escapeValue: false} }));
    this.dictionaryInfoBoxHelp.show();
  }

  async bindAfterBibleTextLoaded(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentBibleTranslationId = currentTab.getBibleTranslationId();

    if (await bible_browser_controller.translation_controller.hasBibleTranslationStrongs(currentBibleTranslationId)) {
      if (jsStrongs == null) {
        jsStrongs = require('strongs');
      }

      var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
      currentVerseList.find('w').bind('mousemove', (e) => {
        this.handleStrongsMouseMove(e);
      });
      currentVerseList.find('.verse-text').bind('mousemove', (e) => {
        this.handleVerseMouseMove(e);
      });
    }
  }

  getStrongsIdFromStrongsElement(strongsElement) {
    try {
      var rawStrongsId = strongsElement.attr('class');
      var strongsId = rawStrongsId.split(' ')[0].split(':')[1];
      var strongsNumber = parseInt(strongsId.substring(1));
      strongsId = strongsId[0] + strongsNumber;
      return strongsId;
    } catch (e) {
      return "";
    }
  }

  showStrongsInfo(strongsId) {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    var lemma = jsStrongs[strongsId].lemma;
    var strongsShortInfo = lemma;

    try {
      var strongsEntry = nsi.getStrongsEntry(strongsId);
      strongsShortInfo = strongsEntry.key + ": " + strongsEntry.transcription + " &mdash; " + strongsShortInfo;
      this.strongsBox.html(strongsShortInfo);
      this.dictionaryInfoBoxStack = [ strongsId ];
      this.updateDictInfoBox(strongsEntry, lemma);
    } catch (e) {
      console.log(e);
    }

    if (this.currentStrongsElement != null) {
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
  }

  handleStrongsMouseMove(event) {
    if (!bible_browser_controller.optionsMenu.strongsSwitchChecked()) {
      return;
    }

    if (!this.shiftKeyPressed) {
      return;
    }

    if (this.currentStrongsElement != null) {
      this.currentStrongsElement.removeClass('strongs-hl');
    }

    this.currentStrongsElement = $(event.target);

    if (this.strongsAvailable) {  
      var strongsId = this.getStrongsIdFromStrongsElement(this.currentStrongsElement);

      if (strongsId != "") {
        this.currentStrongsElement.addClass('strongs-hl');    
        this.strongsBox.css({
          'fontSize': this.currentStrongsElement.css('fontSize')
        });

        this.showStrongsInfo(strongsId);
      }
    }
  }

  handleVerseMouseMove(event) {
    if (!bible_browser_controller.optionsMenu.strongsSwitchChecked()) {
      return;
    }

    if (!this.shiftKeyPressed) {
      return;
    }

    if (this.currentVerseText != null) {
      this.currentVerseText.find('w').css('color', 'black');
    }

    this.currentVerseText = $(event.target).closest('.verse-text');
    this.currentVerseText.find('w').css('color', 'blue');
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
      this.currentStrongsEntry = nsi.getStrongsEntry(key);
      this.currentLemma = jsStrongs[key].lemma;
    }

    this.updateDictInfoBox(this.currentStrongsEntry, this.currentLemma);
  }

  updateDictInfoBox(strongsEntry, lemma) {
    this.currentStrongsEntry = strongsEntry;
    this.currentLemma = lemma;

    var dictInfoHeader = this.getDictInfoHeader(strongsEntry);
    this.dictionaryInfoBoxHeader.html(dictInfoHeader);
    this.dictionaryInfoBoxHelp.hide();
    this.dictionaryInfoBoxBreadcrumbs.html(this.getCurrentDictInfoBreadcrumbs());

    var extendedStrongsInfo = this.getExtendedStrongsInfo(strongsEntry, lemma);
    this.dictionaryInfoBoxContent.html(extendedStrongsInfo);
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

  getFindAllLink(strongsEntry) {
    var functionCall = "javascript:bible_browser_controller.strongs_controller.findAllOccurrences('" + strongsEntry.key + "')";
    var link = "<p><a href=\"" + functionCall + "\">" + 
               i18n.t("dictionary-info-box.find-all-occurrances") + 
               "</a></p>";
    return link;
  }

  getStrongsReferenceTableRow(strongsReference, isLastRow=false) {
    var referenceTableRow = "";
    var referenceKey = strongsReference.key;
    var referenceStrongsEntry = nsi.getStrongsEntry(referenceKey);
    var referenceStrongsLemma = jsStrongs[referenceKey].lemma;

    var referenceLink = "<a href=\"javascript:bible_browser_controller.strongs_controller.openStrongsReference('";
    referenceLink += referenceKey;
    referenceLink += "')\">" + referenceKey + "</a>";
    var trClass = (isLastRow ? "" : "class='td-underline'");

    referenceTableRow += "<tr + " + trClass + ">" +
                         "<td>" + referenceLink + "</td>" + 
                         "<td>" + referenceStrongsEntry.transcription + "</td>" +
                         "<td>" + referenceStrongsEntry.phoneticTranscription + "</td>" + 
                         "<td>" + referenceStrongsLemma + "</td>" +
                         "</tr>";

    return referenceTableRow;
  }

  getExtendedStrongsInfo(strongsEntry, lemma) {
    var extendedStrongsInfo = "";
    var strongsShortInfo = this.getShortInfo(strongsEntry, lemma);
    var findAllLink = this.getFindAllLink(strongsEntry);

    extendedStrongsInfo += "<b>" + strongsShortInfo + "</b>";
    extendedStrongsInfo += findAllLink;
    extendedStrongsInfo += "<pre class='strongs-definition'>";
    extendedStrongsInfo += strongsEntry.definition;
    extendedStrongsInfo += "</pre>";

    if (strongsEntry.references.length > 0) {
      extendedStrongsInfo += "Related Strong's:<br/>";
      extendedStrongsInfo += "<table class='strongs-refs'>";

      for (var i = 0;  i < strongsEntry.references.length; i++) {
        var isLastRow = (i == (strongsEntry.references.length - 1));
        var referenceTableRow = this.getStrongsReferenceTableRow(strongsEntry.references[i], isLastRow);
        extendedStrongsInfo += referenceTableRow;
      }

      extendedStrongsInfo += "</table>";
    }    
    return extendedStrongsInfo;
  }

  openStrongsReference(key) {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    if (key == "" || key == null) {
      return;
    } else {
      try {
        // If the last element of the stack is the one that we want to navigate to ... just pop the stack
        if (this.dictionaryInfoBoxStack.length >= 2 && this.dictionaryInfoBoxStack[this.dictionaryInfoBoxStack.length - 2] == key) {
          this.rewindDictInfo(1);
        } else {
          var strongsEntry = nsi.getStrongsEntry(key);
          var lemma = jsStrongs[key].lemma;

          // Otherwise push on the stack
          this.dictionaryInfoBoxStack.push(key);
          this.updateDictInfoBox(strongsEntry, lemma);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  findAllOccurrences(key) {
    bible_browser_controller.tab_controller.addTab();
    var currentTab = bible_browser_controller.tab_controller.getTab();
    currentTab.setSearchOptions('strongsNumber', false);

    bible_browser_controller.tab_controller.setTabSearch(key);
    bible_browser_controller.module_search.populateSearchMenu();

    bible_browser_controller.text_loader.prepareForNewText(true, true);
    bible_browser_controller.module_search.startSearch(null, undefined, key);
  }
}

module.exports = StrongsController;
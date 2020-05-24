/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const Mousetrap = require('mousetrap');
let jsStrongs = null;

class Strongs {
  constructor() {
    this.currentStrongsId = null;
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

  bindAfterBibleTextLoaded(tabIndex=undefined, useCache=false) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    if (currentTab == null) {
      return;
    }
    
    var currentBibleTranslationId = currentTab.getBibleTranslationId();

    if (bible_browser_controller.translation_controller.hasBibleTranslationStrongs(currentBibleTranslationId)) {
      if (jsStrongs == null) {
        jsStrongs = require('strongs');
      }

      var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
      this.currentWElements = currentVerseList.find('w');
      
      if (!useCache) {
        this.currentVerseTextElements = currentVerseList.find('.verse-text');
      }

      this.currentVerseTextElements.bind('mousemove', (e) => {
        bible_browser_controller.tab_search.blurInputField();
        this.handleVerseMouseMove(e);
      });

      this.currentWElements.bind('mousemove', (e) => {
        bible_browser_controller.tab_search.blurInputField();
        this.handleStrongsMouseMove(e);
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

  isValidStrongsKey(strongsKey) {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }
    
    return strongsKey in jsStrongs;
  }

  showStrongsInfo(strongsId, showStrongsBox=true) {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    if (!this.isValidStrongsKey(strongsId)) {
      console.log(strongsId + " is not a valid Strong's key!");
      return;
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
    if (!bible_browser_controller.optionsMenu.strongsSwitchChecked()) {
      return;
    }

    if (!this.shiftKeyPressed) {
      return;
    }

    if (this.strongsAvailable) {
      var strongsId = this.getStrongsIdFromStrongsElement($(event.target));
      if (strongsId == this.currentStrongsId) {
        return;
      }

      this.currentStrongsId = strongsId;

      if (this.currentStrongsElement != null) {
        this.currentStrongsElement.removeClass('strongs-hl');
      }
        
      this.currentStrongsElement = $(event.target);

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
      this.currentVerseText.removeClass('strongs-current-verse');
    }

    this.currentVerseText = $(event.target).closest('.verse-text');
    this.currentVerseText.addClass('strongs-current-verse');
  }

  getCurrentDictInfoBreadcrumbs() {
    var crumbArray = [];

    for (var i = 0; i < this.dictionaryInfoBoxStack.length; i++) {
      if (i < this.dictionaryInfoBoxStack.length - 1) {
        var currentRewindNumber = this.dictionaryInfoBoxStack.length - i - 1;
        var currentCrumb = "<a href='javascript:bible_browser_controller.strongs.rewindDictInfo(" + currentRewindNumber + ")'>";
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
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
    var functionCall = "javascript:bible_browser_controller.strongs.findAllOccurrences('" + strongsEntry.key + "','" + currentBibleTranslationId + "')";
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

    var referenceLink = "<a href=\"javascript:bible_browser_controller.strongs.openStrongsReference('";
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

  async findAllOccurrences(strongsKey, bibleTranslationId) {
    // First set the default bible translation to the given one to ensure that the translation in the
    // newly opened tab matches the one in the current tab
    bible_browser_controller.tab_controller.defaultBibleTranslationId = bibleTranslationId;

    // Add a new tab and set the search option
    bible_browser_controller.tab_controller.addTab(undefined, false);
    var currentTab = bible_browser_controller.tab_controller.getTab();
    currentTab.setSearchOptions('strongsNumber', false);

    // Set the search key and populate the search menu
    bible_browser_controller.tab_controller.setTabSearch(strongsKey);
    bible_browser_controller.module_search.populateSearchMenu();

    // Prepare for the next text to be loaded
    bible_browser_controller.text_loader.prepareForNewText(true, true);

    // Perform the Strong's search
    await bible_browser_controller.module_search.startSearch(/* event */      null,
                                                             /* tabIndex */   undefined,
                                                             /* searchTerm */ strongsKey);

    // Run the onTabSelected actions at the end, because we added a tab
    var ui = { 'index' : bible_browser_controller.tab_controller.getSelectedTabIndex()};
    await bible_browser_controller.onTabSelected(undefined, ui);
  }
}

module.exports = Strongs;
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

let jsStrongs = null;

/**
 * The DictionaryInfoBox component handles all event handling and updates of the
 * dictionary info box component.
 * 
 * @category Component
 */
class DictionaryInfoBox {
  constructor(dictionaryController) {
    this.dictionaryController = dictionaryController;
    this.infoBox = $('#dictionary-info-box');
    this.dictionaryInfoBoxPanel = $('#dictionary-info-box-panel');
    this.dictionaryInfoBoxHeader = $('#dictionary-info-box-header');
    this.dictionaryInfoBoxHelp = $('#dictionary-info-box-help');
    this.dictionaryInfoBoxContent = $('#dictionary-info-box-content');
    this.dictionaryInfoBoxBreadcrumbs = $('#dictionary-info-box-breadcrumbs');
    this.dictionaryInfoBoxStack = [];
    this.currentStrongsEntry = null;
    this.currentFirstStrongsEntry = null;
    this.currentAdditionalStrongsEntries = [];
    this.currentLemma = null;
    this.strongsAvailable = false;

    $('#dictionary-info-box').accordion();
  }

  getJsStrongs() {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    return jsStrongs;
  }

  clearDictInfoBox() {
    this.dictionaryInfoBoxPanel.find('div').empty();
    this.dictionaryInfoBoxHeader.html(i18n.t("dictionary-info-box.default-header", { interpolation: {escapeValue: false} }));
    this.dictionaryInfoBoxHelp.html(i18n.t("dictionary-info-box.help-instruction", { interpolation: {escapeValue: false} }));
    this.dictionaryInfoBoxHelp.show();
  }

  hideDictInfoBox() {
    if (this.infoBox.is(":visible")) {
      this.infoBox.hide();
      return true;
    }

    return false;
  }

  showDictInfoBox() {
    this.getJsStrongs();

    if (this.infoBox.is(":hidden")) {
      this.infoBox.show();
      return true;
    }

    return false;
  }

  updateDictInfoBox(strongsEntry, additionalStrongsEntries=[], firstUpdate=false) {
    if (firstUpdate) {
      this.dictionaryInfoBoxStack = [ strongsEntry.rawKey ];
    }

    this.currentStrongsEntry = strongsEntry;
    this.currentAdditionalStrongsEntries = additionalStrongsEntries;
    this.currentLemma = this.getJsStrongs[strongsEntry.key].lemma;

    var dictInfoHeader = this.getDictInfoHeader(strongsEntry);
    this.dictionaryInfoBoxHeader.html(dictInfoHeader);
    this.dictionaryInfoBoxHelp.hide();
    this.dictionaryInfoBoxBreadcrumbs.html(this.getCurrentDictInfoBreadcrumbs(additionalStrongsEntries));

    var extendedStrongsInfo = this.getExtendedStrongsInfo(strongsEntry, this.currentLemma);

    this.dictionaryInfoBoxContent.html(extendedStrongsInfo);

    // Replace sword:// links with plain text
    this.dictionaryInfoBoxContent.find('a').each((index, aElement) => {
      var currentA = $(aElement);
      if (currentA.prop('href').indexOf('sword') != -1) {
        currentA.replaceWith(currentA.text());
      }
    });
  }

  getAlternativeStrongsLink(strongsKey) {
    var functionCall = `app_controller.dictionary_controller.dictionaryInfoBox.updateDictInfoBoxWithKey("${strongsKey}")`;
    var currentLink = `<a href='javascript:${functionCall}'>${strongsKey}</a>`;
    return currentLink;
  }

  getBreadCrumbEntry(strongsEntry) {
    var breadCrumbEntry = "";

    if (strongsEntry.rawKey == this.currentStrongsEntry.rawKey) {
      breadCrumbEntry = this.currentStrongsEntry.rawKey;
    } else {
      breadCrumbEntry = this.getAlternativeStrongsLink(strongsEntry.rawKey);
    }

    return breadCrumbEntry;
  }

  getAdditionalStrongsEntryLinks(additionalStrongsEntries) {
    var additionalStrongsLinks = "";

    if (additionalStrongsEntries.length > 0) {
      for (var i = 0;  i < additionalStrongsEntries.length; i++) {
        additionalStrongsLinks += ' | ';

        var breadCrumbEntry = this.getBreadCrumbEntry(additionalStrongsEntries[i]);

        if (this.dictionaryInfoBoxStack.length == 1) {
          breadCrumbEntry = "<b>" + breadCrumbEntry + "</b>";
        }

        additionalStrongsLinks += breadCrumbEntry;
      }
    }

    return additionalStrongsLinks;
  }

  getCurrentDictInfoBreadcrumbs(additionalStrongsEntries=[]) {
    var crumbArray = [];
    var additionalStrongsLinks = this.getAdditionalStrongsEntryLinks(additionalStrongsEntries);

    for (var i = 0; i < this.dictionaryInfoBoxStack.length; i++) {
      if (i < this.dictionaryInfoBoxStack.length - 1) {
        var currentRewindNumber = this.dictionaryInfoBoxStack.length - i - 1;
        var currentCrumb = "<a href='javascript:app_controller.dictionary_controller.dictionaryInfoBox.rewindDictInfo(" + currentRewindNumber + ")'>";

        if (i == 0) {
          currentCrumb += this.currentFirstStrongsEntry.rawKey;
        } else {
          currentCrumb += this.dictionaryInfoBoxStack[i];
        }

        currentCrumb += "</a>";
      } else {
        if (this.dictionaryInfoBoxStack[i] == this.currentStrongsEntry.rawKey) {
          currentCrumb = "<b>" + this.dictionaryInfoBoxStack[i] + "</b>";
        } else {
          currentCrumb = "<b>" + this.getAlternativeStrongsLink(this.dictionaryInfoBoxStack[i]) + "</b>";
        }
      }

      if (i == 0 && this.dictionaryInfoBoxStack.length == 1) {
        currentCrumb += additionalStrongsLinks;
      }

      crumbArray.push(currentCrumb);
    }

    return crumbArray.join(' &rarr; ');
  }

  rewindDictInfo(rewindNumber) {
    for (var i = 0; i < rewindNumber; i++) {
      this.dictionaryInfoBoxStack.pop();

      var key = null;

      if (this.dictionaryInfoBoxStack.length >= 2) {
        key = this.dictionaryInfoBoxStack[this.dictionaryInfoBoxStack.length - 1];
      } else {
        key = this.currentFirstStrongsEntry.rawKey;
      }

      this.currentStrongsEntry = this.dictionaryController.getStrongsEntryWithRawKey(key);
      this.currentLemma = this.getJsStrongs[this.currentStrongsEntry.key].lemma;
    }

    this.updateDictInfoBox(this.currentStrongsEntry, this.currentAdditionalStrongsEntries);
  }

  updateDictInfoBoxWithKey(strongsKey) {
    var strongsEntry = this.dictionaryController.getStrongsEntryWithRawKey(strongsKey);

    while (this.dictionaryInfoBoxStack.length > 1) {
      this.dictionaryInfoBoxStack.pop();
    }

    this.updateDictInfoBox(strongsEntry, this.currentAdditionalStrongsEntries);
  }

  getDictInfoHeader(strongsEntry) {
    var infoHeader = "";
    var languageDict;

    if (strongsEntry.key[0] == 'G') {
      languageDict = i18n.t('dictionary-info-box.greek-dict');
    } else {
      languageDict = i18n.t('dictionary-info-box.hebrew-dict');
    }

    infoHeader += "<b>" + languageDict + "</b>";
    return infoHeader;
  }

  getShortInfo(strongsEntry, lemma) {
    var strongsShortInfo = strongsEntry.transcription + " &mdash; " + 
                           strongsEntry.phoneticTranscription + " &mdash; " + 
                           lemma;
    return strongsShortInfo;
  }

  getFindAllLink(strongsEntry) {
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var functionCall = "javascript:app_controller.dictionary_controller.dictionaryInfoBox.findAllOccurrences('" +
      strongsEntry.rawKey + "','" + currentBibleTranslationId + "')";

    var link = "<a href=\"" + functionCall + "\">" + 
               i18n.t("dictionary-info-box.find-all-occurrences") + 
               "</a>";
    return link;
  }

  getBlueletterLink(strongsEntry) {
    var bible = app_controller.tab_controller.getTab().getBibleTranslationId();

    var blueLetterTranslations = ['KJV', 'NASB', 'ASV', 'WEB'];
    if (!blueLetterTranslations.includes(bible)) {
      bible = 'KJV';
    }

    var blueLetterLink = `https://www.blueletterbible.org/lang/lexicon/lexicon.cfm?Strongs=${strongsEntry.key}&t=${bible}`;
    var blueLetterLinkText = i18n.t("dictionary-info-box.open-in-blueletter");
    var htmlBlueLetterLink = `<a class='external' href='${blueLetterLink}'>${blueLetterLinkText}</a>`;
    return htmlBlueLetterLink;
  }

  getStrongsReferenceTableRow(strongsReference, isLastRow=false) {
    var referenceTableRow = "";
    var referenceKey = strongsReference.key;
    var referenceStrongsEntry = nsi.getStrongsEntry(referenceKey);
    var referenceStrongsLemma = this.getJsStrongs[referenceKey].lemma;

    var referenceLink = "<a href=\"javascript:app_controller.dictionary_controller.dictionaryInfoBox.openStrongsReference('";
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
    var blueLetterLink = this.getBlueletterLink(strongsEntry);

    var lang = "";
    if (strongsEntry.key[0] == 'G') {
      lang = 'GREEK';
    } else if (strongsEntry.key[0] == 'H') {
      lang = 'HEBREW';
    }

    var extraDictContent = this.getExtraDictionaryContent(lang, strongsEntry);

    extendedStrongsInfo += "<b>" + strongsShortInfo + "</b>";
    extendedStrongsInfo += "<p>";
    extendedStrongsInfo += findAllLink;
    extendedStrongsInfo += " | ";
    extendedStrongsInfo += blueLetterLink;
    extendedStrongsInfo += "</p>";
    extendedStrongsInfo += extraDictContent;
    extendedStrongsInfo += "<b>Strong's</b>";
    extendedStrongsInfo += "<pre class='strongs-definition'>";
    extendedStrongsInfo += strongsEntry.definition;
    extendedStrongsInfo += "</pre>";

    if (strongsEntry.references.length > 0) {
      extendedStrongsInfo += "<hr></hr>";
      var relatedStrongs = "<b>" + i18n.t("dictionary-info-box.related-strongs") + ":</b><br/>";
      extendedStrongsInfo += relatedStrongs;
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
    if (key == "" || key == null) {
      return;
    } else {
      try {
        var previousIndex = this.dictionaryInfoBoxStack.length - 2;
        var previousKey = null;

        if (previousIndex == 0) {
          previousKey = this.currentFirstStrongsEntry.rawKey;
        } else {
          previousKey = this.dictionaryInfoBoxStack[previousIndex];
        }

        if (this.dictionaryInfoBoxStack.length >= 2 && previousKey == key) {

          // If the last element of the stack is the one that we want to navigate to ... just pop the stack
          this.rewindDictInfo(1);

        } else {
          // Otherwise push on the stack

          var strongsEntry = this.dictionaryController.getStrongsEntryWithRawKey(key);

          if (this.dictionaryInfoBoxStack.length == 1) {
            this.currentFirstStrongsEntry = this.currentStrongsEntry;
          }

          this.dictionaryInfoBoxStack.push(key);
          this.updateDictInfoBox(strongsEntry, this.currentAdditionalStrongsEntries);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  async findAllOccurrences(strongsKey, bibleTranslationId) {
    // Add a new tab. Set the default bible translation to the given one to ensure that the translation in the
    // newly opened tab matches the one in the current tab
    app_controller.tab_controller.addTab(undefined, false, bibleTranslationId);

    // Set search options for the new tab
    var currentTab = app_controller.tab_controller.getTab();
    currentTab.setSearchOptions('strongsNumber', false);

    // Set the search key and populate the search menu
    app_controller.tab_controller.setTabSearch(strongsKey);
    app_controller.module_search.populateSearchMenu();

    // Prepare for the next text to be loaded
    app_controller.text_controller.prepareForNewText(true, true);

    // Perform the Strong's search
    await app_controller.module_search.startSearch(/* event */      null,
                                                             /* tabIndex */   undefined,
                                                             /* searchTerm */ strongsKey);

    // Run the onTabSelected actions at the end, because we added a tab
    var ui = { 'index' : app_controller.tab_controller.getSelectedTabIndex()};
    await app_controller.onTabSelected(undefined, ui);
  }

  getAllExtraDictModules(lang='GREEK') {
    var dictModules = nsi.getAllLocalModules('DICT');
    var filteredDictModules = [];
    var excludeList = [ 'StrongsGreek', 'StrongsHebrew' ];

    dictModules.forEach((module) => {
      var hasStrongsKeys = false;

      if (lang == 'GREEK') {
        hasStrongsKeys = module.hasGreekStrongsKeys;
      } else if (lang == 'HEBREW') {
        hasStrongsKeys = module.hasHebrewStrongsKeys;
      }

      if (hasStrongsKeys && !excludeList.includes(module.name)) {
        filteredDictModules.push(module);
      }
    });

    return filteredDictModules;
  }

  getExtraDictionaryContent(lang='GREEK', strongsEntry) {
    var extraDictModules = this.getAllExtraDictModules(lang);
    var extraDictContent = "<hr></hr>";

    extraDictModules.forEach((dict) => {
      var currentDictContent = this.getDictionaryEntry(dict.name, strongsEntry);

      if (currentDictContent != undefined) {
        currentDictContent = currentDictContent.trim();
        var containsLineBreaks = false;

        if (currentDictContent.indexOf("\n") != -1 ||
            currentDictContent.indexOf("<br />") != -1 ||
            currentDictContent.indexOf("<br/>") != -1 ||
            currentDictContent.indexOf("<entry") != -1) {

          containsLineBreaks = true;
        }

        extraDictContent += "<span class='bold'>" + dict.description;
       
        if (containsLineBreaks) {
          extraDictContent += "</span><br/>" + currentDictContent + "<hr></hr>";
        } else {
          extraDictContent += ": </span>" + currentDictContent + "<hr></hr>";
        }
      }
    });

    return extraDictContent;
  }

  getDictionaryEntry(moduleCode, strongsEntry) {
    // We first try to fetch the dictionary entry by using the rawKey
    var currentDictContent = nsi.getRawModuleEntry(moduleCode, strongsEntry.rawKey.slice(1));

    // If the first attempt returned undefined we try again.
    // This time we try to fetch the dictionary entry by slicing off the first character of the Strong's key.
    if (currentDictContent == undefined) {
      currentDictContent = nsi.getRawModuleEntry(moduleCode, strongsEntry.key.slice(1));
    }

    // If the second attempt returned undefined we try again.
    // This time with the full Strong's key (including H or G as first character)
    if (currentDictContent == undefined) {
      currentDictContent = nsi.getRawModuleEntry(moduleCode, strongsEntry.key);
    }

    if (currentDictContent != undefined) {
      // Rename the title element, since this otherwise replaces the Window title
      currentDictContent = currentDictContent.replace(/<title>/g, "<entryTitle>");
      currentDictContent = currentDictContent.replace(/<\/title>/g, "</entryTitle>");
    }

    return currentDictContent;
  }
}

module.exports = DictionaryInfoBox;

/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2023 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const eventController = require('../../controllers/event_controller.js');
const { html } = require('../../helpers/ezra_helper.js');

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
    this.infoBox = $('#dictionary-panel');
    this.dictionaryInfoBoxPanel = $('#dictionary-panel-wrapper');
    this.dictionaryInfoBoxHeader = $('#dictionary-panel-header');
    this.dictionaryInfoBoxHelp = $('#dictionary-panel-help');
    this.dictionaryInfoBoxContent = $('#dictionary-panel-content');
    this.dictionaryInfoBoxBreadcrumbs = $('#dictionary-panel-breadcrumbs');
    this.dictionaryInfoBoxStack = [];
    this.currentStrongsEntry = null;
    this.currentFirstStrongsEntry = null;
    this.currentAdditionalStrongsEntries = [];
    this.currentLemma = null;

    eventController.subscribe('on-locale-changed', () => {
      if (this.currentStrongsEntry == null) {
        this.clearDictInfoBox();
      }
    });

    this.clearDictInfoBox();
  }

  getJsStrongs() {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    return jsStrongs;
  }

  clearDictInfoBox() {
    this.currentStrongsEntry = null;

    var strongsAvailable = this.dictionaryController.strongsAvailable;
    var dictionaryInstallStatus = i18n.t("general.installed");
    var dictionaryInstallStatusClass = 'dict-installed';

    if (!strongsAvailable) {
      dictionaryInstallStatus = i18n.t("general.not-installed");
      dictionaryInstallStatusClass = "dict-not-installed";
    }

    this.dictionaryInfoBoxPanel.find('div').empty();
    this.dictionaryInfoBoxHeader[0].innerHTML = i18n.t("dictionary-panel.default-header",
                                                       { interpolation: {escapeValue: false} });

    let helpInstructionPart1 = i18n.t("dictionary-panel.help-instruction-part1", {
      install_status_class: dictionaryInstallStatusClass,
      install_status: dictionaryInstallStatus,
      interpolation: {escapeValue: false}
    });

    let helpInstructionPart2 = i18n.t("dictionary-panel.help-instruction-part2");
    let helpInstructionPart3 = "";
    let helpInstructionPart4 = "";
   
    if (platformHelper.isCordova()) {
      helpInstructionPart3 = i18n.t("dictionary-panel.help-instruction-part3-cordova");
    } else {
      helpInstructionPart3 = i18n.t("dictionary-panel.help-instruction-part3");
      helpInstructionPart4 = `<li>${i18n.t("dictionary-panel.help-instruction-part4-desktop")}</li>`;
    }
    
    let helpInstruction = html`
      <p>${i18n.t("dictionary-panel.help-instruction-intro")}</p>
      <ol>
        <li>${helpInstructionPart1}</li>
        <li>${helpInstructionPart2}</li>
        <li>${helpInstructionPart3}</li>
        ${helpInstructionPart4}
      </ol>
    `;

    this.dictionaryInfoBoxHelp[0].innerHTML = helpInstruction.innerHTML;
    this.dictionaryInfoBoxHelp[0].style.display = 'block';
  }

  async updateDictInfoBox(strongsEntry, additionalStrongsEntries=[], firstUpdate=false) {
    if (strongsEntry == null) {
      return;
    }

    var jsStrongsEntry = this.getJsStrongs()[strongsEntry.key];
    if (jsStrongsEntry == null) {
      return;
    }

    if (firstUpdate) {
      this.dictionaryInfoBoxStack = [ strongsEntry.rawKey ];
    }

    this.currentStrongsEntry = strongsEntry;
    this.currentAdditionalStrongsEntries = additionalStrongsEntries;
    this.currentLemma = jsStrongsEntry.lemma;

    var dictInfoHeader = this.getDictInfoHeader(strongsEntry);
    this.dictionaryInfoBoxHeader.html(dictInfoHeader);
    this.dictionaryInfoBoxHelp.hide();
    this.dictionaryInfoBoxBreadcrumbs.html(this.getCurrentDictInfoBreadcrumbs(additionalStrongsEntries));

    let extendedStrongsInfo = await this.getExtendedStrongsInfo(strongsEntry, this.currentLemma);

    this.dictionaryInfoBoxContent.html(extendedStrongsInfo);

    // Replace sword:// links with plain text
    this.dictionaryInfoBoxContent.find('a').each((index, aElement) => {
      var currentA = $(aElement);
      if (currentA.prop('href').indexOf('sword') != -1) {
        currentA.replaceWith(currentA.text());
      }
    });

    uiHelper.configureButtonStyles(this.dictionaryInfoBoxContent[0]);

    let moduleInfoButtons = this.dictionaryInfoBoxContent[0].querySelectorAll('.module-info-button');
    moduleInfoButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        this.handleModuleInfoButtonClick(event);
      });
    });
  }

  handleModuleInfoButtonClick(event) {
    let moduleCode = event.target.closest('.module-info-button').getAttribute('module');
    app_controller.info_popup.showAppInfo(moduleCode);
  }

  getAlternativeStrongsLink(strongsKey) {
    var functionCall = `app_controller.dictionary_controller._dictionaryInfoBox.updateDictInfoBoxWithKey("${strongsKey}")`;
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
      let currentCrumb;
      if (i < this.dictionaryInfoBoxStack.length - 1) {
        const currentRewindNumber = this.dictionaryInfoBoxStack.length - i - 1;
        currentCrumb = "<a href='javascript:app_controller.dictionary_controller._dictionaryInfoBox.rewindDictInfo(" + currentRewindNumber + ")'>";

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

  async rewindDictInfo(rewindNumber) {
    for (var i = 0; i < rewindNumber; i++) {
      this.dictionaryInfoBoxStack.pop();

      var key = null;

      if (this.dictionaryInfoBoxStack.length >= 2) {
        key = this.dictionaryInfoBoxStack[this.dictionaryInfoBoxStack.length - 1];
      } else {
        key = this.currentFirstStrongsEntry.rawKey;
      }

      this.currentStrongsEntry = await this.dictionaryController.getStrongsEntryWithRawKey(key);
      this.currentLemma = this.getJsStrongs()[this.currentStrongsEntry.key].lemma;
    }

    await this.updateDictInfoBox(this.currentStrongsEntry, this.currentAdditionalStrongsEntries);
  }

  async updateDictInfoBoxWithKey(strongsKey) {
    var strongsEntry = await this.dictionaryController.getStrongsEntryWithRawKey(strongsKey);

    if (strongsEntry == null) {
      console.log("DictionaryInfoBox.updateDictInfoBoxWithKey: Got null strongsEntry for key " + strongsKey);
      console.log("Cannot update dict info box!");
      return;
    }

    // Remove existing entries from dictionaryInfoBoxStack
    while (this.dictionaryInfoBoxStack.length > 1) {
      this.dictionaryInfoBoxStack.pop();
    }

    await this.updateDictInfoBox(strongsEntry, this.currentAdditionalStrongsEntries);
  }

  getDictInfoHeader(strongsEntry) {
    var infoHeader = "";
    var languageDict;

    if (strongsEntry.key[0] == 'G') {
      languageDict = i18n.t('dictionary-panel.greek-dict');
    } else {
      languageDict = i18n.t('dictionary-panel.hebrew-dict');
    }

    infoHeader += "<b>" + languageDict + "</b>";
    return infoHeader;
  }

  getShortInfo(strongsEntry, lemma) {
    return `${strongsEntry.transcription} &mdash; ${strongsEntry.phoneticTranscription} &mdash; ${lemma}`;
  }

  getFindAllLink(strongsEntry) {
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var functionCall = "javascript:app_controller.dictionary_controller._dictionaryInfoBox.findAllOccurrences('" +
      strongsEntry.rawKey + "','" + currentBibleTranslationId + "')";

    var link = "<a href=\"" + functionCall + "\">" + 
               i18n.t("dictionary-panel.find-all-occurrences") + 
               "</a>";
    return link;
  }

  getBlueletterLink(strongsEntry) {
    var bible = app_controller.tab_controller.getTab().getBibleTranslationId();

    var blueLetterTranslations = ['KJV', 'NASB', 'ASV', 'WEB'];
    if (!blueLetterTranslations.includes(bible)) {
      bible = 'KJV';
    } else if (bible === 'NASB') {
      bible = 'NASB20'; // There are two versions NASB1995 and NASB2020 on BLB
    }


    var blueLetterLink = `https://www.blueletterbible.org/lang/lexicon/lexicon.cfm?Strongs=${strongsEntry.key}&t=${bible}`;
    var blueLetterLinkText = i18n.t("dictionary-panel.open-in-blueletter");
    var htmlBlueLetterLink = `<a class='external' href='${blueLetterLink}'>${blueLetterLinkText}</a>`;
    return htmlBlueLetterLink;
  }

  async getStrongsReferenceTableRow(strongsReference, isLastRow=false) {
    var referenceTableRow = "";
    var referenceKey = strongsReference.key;
    var referenceStrongsEntry = null;

    try {
      referenceStrongsEntry = await ipcNsi.getStrongsEntry(referenceKey);
    } catch (e) {
      console.log("DictionaryInfoBox.getStrongsReferenceTableRow: Could not get strongs entry for key " + referenceKey);
      return null;
    }
    
    var jsStrongsEntry = this.getJsStrongs()[referenceKey];
    if (jsStrongsEntry == null) {
      return null;
    }

    var referenceStrongsLemma = jsStrongsEntry.lemma;

    var referenceLink = "<a href=\"javascript:app_controller.dictionary_controller._dictionaryInfoBox.openStrongsReference('";
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

  async getExtendedStrongsInfo(strongsEntry, lemma) {

    let lang = "";
    let moduleCode = "";

    if (strongsEntry.key[0] == 'G') {
      lang = 'GREEK';
      moduleCode = 'StrongsGreek';
    } else if (strongsEntry.key[0] == 'H') {
      lang = 'HEBREW';
      moduleCode = 'StrongsHebrew';
    }

    let extraDictContent = await this.getExtraDictionaryContent(lang, strongsEntry);
    let relatedStrongsContent = await this.getRelatedStrongsContent(strongsEntry.references);
    
    const moduleInfoButtonTitle = i18n.t('menu.show-module-info');
    let moduleInfoButton = this.getModuleInfoButton(moduleInfoButtonTitle, moduleCode);

    let extendedStrongsInfo = `
      <b>${this.getShortInfo(strongsEntry, lemma)}</b>
      <p>${this.getFindAllLink(strongsEntry)} | ${this.getBlueletterLink(strongsEntry)}</p>
      ${extraDictContent}
      <div class='bold' style='margin-bottom: 1em'>Strong's
      ${moduleInfoButton} 
      </div>
      <div class='strongs-definition'>${strongsEntry.definition}</div>
      ${relatedStrongsContent}`;

    return extendedStrongsInfo;
  }

  async getRelatedStrongsContent(strongsReferences) {
    if (!strongsReferences.length) {
      return '';
    }

    var relatedStrongsRows = (await Promise.all(strongsReferences.map(async (ref, i) => {
      const isLast = i == (strongsReferences.length - 1);
      return await this.getStrongsReferenceTableRow(ref, isLast);
    }))).join('');

    const relatedStrongsContent = `
      <hr/>
      <b>${i18n.t("dictionary-panel.related-strongs")}:</b><br/>
      <table class="strongs-refs">
      ${relatedStrongsRows}
      </table>`;

    return relatedStrongsContent;
  }

  async openStrongsReference(key) {
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

          var strongsEntry = await this.dictionaryController.getStrongsEntryWithRawKey(key);

          if (strongsEntry == null) {
            console.log("DictionaryInfoBox.openStrongsReference: Got null strongsEntry for key " + key);
            console.log("Cannot update dict info box!");
            return;
          }

          if (this.dictionaryInfoBoxStack.length == 1) {
            this.currentFirstStrongsEntry = this.currentStrongsEntry;
          }

          this.dictionaryInfoBoxStack.push(key);
          await this.updateDictInfoBox(strongsEntry, this.currentAdditionalStrongsEntries);
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
    app_controller.module_search_controller.populateSearchMenu();

    // Prepare for the next text to be loaded
    await app_controller.text_controller.prepareForNewText(true, true);

    // Perform the Strong's search
    await app_controller.module_search_controller.startSearch(/* event */      null,
                                                             /* tabIndex */   undefined,
                                                             /* searchTerm */ strongsKey);

    // Run the on-tab-selected actions at the end, because we added a tab
    const tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    await eventController.publishAsync('on-tab-selected', tabIndex);
  }

  async getAllExtraDictModules(lang='GREEK') {
    var dictModules = await ipcNsi.getAllLocalModules('DICT');
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

  async getExtraDictionaryContent(lang='GREEK', strongsEntry) {
    let extraDictModules = await this.getAllExtraDictModules(lang);
    let extraDictContent = "<hr></hr>";

    const moduleInfoButtonTitle = i18n.t('menu.show-module-info');

    for (let i = 0; i < extraDictModules.length; i++) {
      let dict = extraDictModules[i];
      let currentDictContent = await this.getDictionaryEntry(dict.name, strongsEntry);

      if (currentDictContent != undefined) {
        currentDictContent = currentDictContent.trim();
        let moduleInfoButton = this.getModuleInfoButton(moduleInfoButtonTitle, dict.name);

        let dictHeader = `
          <div class='bold' style='margin-bottom: 1em'>
            <span>${dict.description}</span>
            ${moduleInfoButton}
            </div>
          </div> ${currentDictContent} <hr></hr>
        `;

        extraDictContent += dictHeader;
      }
    }

    return extraDictContent;
  }

  getModuleInfoButton(moduleInfoButtonTitle, moduleCode) {
    return `
      <div class='module-info-button fg-button ui-corner-all ui-state-default ui-state-default'
            i18n='[title]menu.show-module-info' title='${moduleInfoButtonTitle}' module='${moduleCode}'>
        <i class='fas fa-info'></i>
      </div>
    `;
  }

  async getDictionaryEntry(moduleCode, strongsEntry) {
    // We first try to fetch the dictionary entry by using the rawKey
    var currentDictContent = await ipcNsi.getRawModuleEntry(moduleCode, strongsEntry.rawKey.slice(1));

    // If the first attempt returned undefined we try again.
    // This time we try to fetch the dictionary entry by slicing off the first character of the Strong's key.
    if (currentDictContent == undefined) {
      currentDictContent = await ipcNsi.getRawModuleEntry(moduleCode, strongsEntry.key.slice(1));
    }

    // If the second attempt returned undefined we try again.
    // This time with the full Strong's key (including H or G as first character)
    if (currentDictContent == undefined) {
      currentDictContent = await ipcNsi.getRawModuleEntry(moduleCode, strongsEntry.key);
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

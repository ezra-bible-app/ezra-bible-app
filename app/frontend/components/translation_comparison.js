/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const VerseBox = require("../ui_models/verse_box.js");
const i18nHelper = require('../helpers/i18n_helper.js');
const eventController = require('../controllers/event_controller.js');

/**
 * The TranslationComparison component implements a tool panel that shows selected verses
 * in a comparison table using all available Bible translations.
 * 
 * @category Component
 */
class TranslationComparison {
  constructor() {
    eventController.subscribe('on-verses-selected', () => {
      this.performRefresh();
    });

    eventController.subscribe('on-compare-panel-switched', () => {
      this.performRefresh();
    });

    eventController.subscribe('on-locale-changed', () => {
      this.performRefresh();
    });
  }

  getBox() {
    return $('#compare-translations-box');
  }

  getBoxContent() {
    return document.getElementById('compare-panel-content');
  }

  async getVerseHtmlByTranslationId(sourceBibleTranslationId, targetTranslationId, verseBox, totalVerseCount) {
    var referenceVerseBox = new VerseBox(verseBox[0]);
    var bibleBookShortTitle = referenceVerseBox.getBibleBookShortTitle();
    var mappedAbsoluteVerseNumber = await referenceVerseBox.getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetTranslationId);

    var verses = await ipcNsi.getBookText(targetTranslationId,
                                          bibleBookShortTitle,
                                          mappedAbsoluteVerseNumber,
                                          1);

    var targetTranslationVerse = verses[0];
    
    var verseHtml = "";
    
    if (targetTranslationVerse != null && targetTranslationVerse.content != "") {
      verseHtml += "<tr>";

      var moduleReferenceSeparator = await i18nHelper.getReferenceSeparator(targetTranslationId);
      var targetVerseReference = targetTranslationVerse.chapter + moduleReferenceSeparator + targetTranslationVerse.verseNr;
      
      if (totalVerseCount > 1) {
        verseHtml +=  "<td class='verse-reference-td'>" + targetVerseReference + "</td>";
      }

      verseHtml += "<td class='verse-content-td'>" + targetTranslationVerse.content + "</td>";
      verseHtml += "</tr>";
    }

    return verseHtml;
  }

  async getCompareTranslationContent() {
    var tab = app_controller.tab_controller.getTab();
    if (tab == null) {
      return;
    }

    var sourceTranslationId = tab.getBibleTranslationId();
    var selectedVerseBoxes = app_controller.verse_selection.selected_verse_box_elements;
    var compareTranslationContent = "<table style='width: 100%;'>";
    var allTranslations = await ipcNsi.getAllLocalModules();

    if (selectedVerseBoxes.length > 0) {
      for (let i = 0; i < allTranslations.length; i++) {
        let currentTranslationId = allTranslations[i].name;

        /*
        // Do not show the current translation in the compare translations view
        if (currentTranslationId == sourceTranslationId) {
          continue;
        }
        */

        let currentTranslationName = allTranslations[i].description;
        let cssClass = '';
        if (i < allTranslations.length) {
          cssClass = 'compare-translation-row';
        }

        let contentCounter = 0;
        let compareTranslationRow = "";
        
        compareTranslationRow += `<tr class='${cssClass}'>`;
        compareTranslationRow += `<td class='compare-translation-row' style='width: 4em; padding: 0.5em;' title='${currentTranslationName}'>${currentTranslationId}</td>`;
        compareTranslationRow += "<td class='compare-translation-row'><table>";

        for (let j = 0; j < selectedVerseBoxes.length; j++) {
          let currentVerseBox = $(selectedVerseBoxes[j]);
          let verseHtml = await this.getVerseHtmlByTranslationId(sourceTranslationId,
                                                                 currentTranslationId,
                                                                 currentVerseBox,
                                                                 selectedVerseBoxes.length);

          compareTranslationRow += verseHtml;

          if (verseHtml != "") {
            contentCounter += 1;
          }
        }

        compareTranslationRow += "</table></td>";
        compareTranslationRow += "</tr>";

        if (contentCounter > 0) {
          compareTranslationContent += compareTranslationRow;
        }
      }
    }

    compareTranslationContent += "</table>";
    return compareTranslationContent;
  }

  showLoadingIndicator() {
    var loadingIndicator = document.getElementById('compare-translations-loading-indicator');
    loadingIndicator.querySelector('.loader').style.display = 'block';
    loadingIndicator.style.display = 'block';
  }
  
  hideLoadingIndicator() {
    var loadingIndicator = document.getElementById('compare-translations-loading-indicator');
    loadingIndicator.style.display = 'none';
  }

  isPanelActive() {
    var panelButtons = document.getElementById('panel-buttons');
    return panelButtons.activePanel == 'compare-panel';
  }

  getHelpBox() {
    return document.getElementById('compare-panel-help');
  }

  async performRefresh() {
    if (!this.isPanelActive()) {
      return;
    }

    var allTranslations = await ipcNsi.getAllLocalModules();
    if (allTranslations.length < 2) {
      return;
    }

    var panelHeader = document.getElementById('compare-panel-header');
    var helpBox = this.getHelpBox();
    var panelTitle = "";

    if (app_controller.verse_selection != null &&
        app_controller.verse_selection.selected_verse_box_elements != null &&
        app_controller.verse_selection.selected_verse_box_elements.length > 0) {

      panelTitle = i18n.t("bible-browser.comparing-translations-for") + " " + 
        await app_controller.verse_selection.getSelectedVerseLabelText();

      helpBox.classList.add('hidden');

    } else {
      panelTitle = i18n.t("compare-panel.default-header");
      helpBox.classList.remove('hidden');
    }

    panelHeader.innerHTML = "<b>" + panelTitle + "</b>";

    if (platformHelper.isCordova()) {

      this.getBoxContent().innerHTML = "";
      this.showLoadingIndicator();
      this.performDelayedContentRefresh();

    } else {

      await this.performContentRefresh();
    }
  }

  async performContentRefresh() {
    var compareTranslationContent = await this.getCompareTranslationContent();

    if (platformHelper.isCordova()) {
      this.hideLoadingIndicator();
    }

    this.getBoxContent().innerHTML = compareTranslationContent;
  }

  performDelayedContentRefresh() {
    setTimeout(async () => {
      await this.performContentRefresh();
    }, 50);
  }
}

module.exports = TranslationComparison;
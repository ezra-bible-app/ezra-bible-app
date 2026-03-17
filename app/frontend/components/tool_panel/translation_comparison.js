/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const VerseBox = require("../../ui_models/verse_box.js");
const i18nHelper = require('../../helpers/i18n_helper.js');
const eventController = require('../../controllers/event_controller.js');
const swordModuleHelper = require('../../helpers/sword_module_helper.js');
const { getPlatform } = require('../../helpers/ezra_helper.js');
const VerseBoxHelper = require('../../helpers/verse_box_helper.js');
const sectionLabelHelper = require('../../helpers/section_label_helper.js');

/**
 * The TranslationComparison component implements a tool panel that shows selected verses
 * in a comparison table using all available Bible translations.
 * 
 * @category Component
 */
class TranslationComparison {
  constructor() {
    eventController.subscribeMultiple(['on-verses-selected', 'on-compare-panel-switched', 'on-locale-changed'], () => {
      this.performRefresh();
    });

    this.verseBoxHelper = new VerseBoxHelper();
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
    var chapter = referenceVerseBox.getChapter();
    var mappedAbsoluteVerseNumber = await referenceVerseBox.getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetTranslationId);

    var verses = await ipcNsi.getBookText(targetTranslationId,
                                          bibleBookShortTitle,
                                          mappedAbsoluteVerseNumber,
                                          1);

    var targetTranslationVerse = verses[0];
    var verseHtml = "";

    if (targetTranslationVerse != null && targetTranslationVerse.content != "" && targetTranslationVerse.chapter == chapter) {
      verseHtml += `<tr class='verse-content-tr' verse-bible-book-short='${bibleBookShortTitle}'>`;

      var moduleReferenceSeparator = await i18nHelper.getReferenceSeparator(targetTranslationId);
      var targetVerseReference = targetTranslationVerse.chapter + moduleReferenceSeparator + targetTranslationVerse.verseNr;
      
      if (totalVerseCount > 1) {
        verseHtml += `<td class='verse-reference-td verse-reference-content' book='${bibleBookShortTitle}' reference='${targetVerseReference}'>${targetVerseReference}</td>`;
      }

      verseHtml += `<td class='verse-content-td verse-text' book='${bibleBookShortTitle}' reference='${targetVerseReference}'>` + targetTranslationVerse.content + "</td>";
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
    var selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();
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

        const moduleIsRightToLeft = await swordModuleHelper.moduleIsRTL(currentTranslationId);
        const rtlClass = moduleIsRightToLeft ? 'rtl' : '';
        
        compareTranslationRow += `<tr class='${cssClass}'>`;
        compareTranslationRow += `<td class='compare-translation-row' style='width: 4em; padding: 0.5em;' title='${currentTranslationName}'>${currentTranslationId}</td>`;
        compareTranslationRow += `<td class='compare-translation-row ${rtlClass}'><table>`;

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

        const copyButtonTitle = i18n.t('bible-browser.copy-verse-text-to-clipboard');

        compareTranslationRow += "</table></td>";
        compareTranslationRow += "<td class='compare-translation-row' style='font-size: 120%; padding-left: 0.5em; padding-right: 0.5em;'>";
        compareTranslationRow += `<div class='copy-button button-small' i18n='bible-browser.copy-verse-text-to-clipboard' title='${copyButtonTitle}'><i class='fas fa-copy copy-icon'/></div>`;
        compareTranslationRow += "</td>";
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
    let selectedVerseBoxElements = null;
   
    if (app_controller.verse_selection != null) {
      selectedVerseBoxElements = app_controller.verse_selection.getSelectedVerseBoxes();
    }

    if (selectedVerseBoxElements != null &&
        selectedVerseBoxElements.length > 0) {

      panelTitle = i18n.t("bible-browser.comparing-translations-for") + " " + 
        await app_controller.verse_selection.getSelectedVerseLabelText(undefined, true);

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

    this.getBoxContent().addEventListener('click', (event) => {
      event.stopImmediatePropagation();

      let classList = event.target.classList;

      if (classList.contains('copy-button') || classList.contains('copy-icon')) {
        let copyButton = event.target.closest('.copy-button');
        this.copyRowToClipboard(copyButton);
      }
    });
  }

  async copyRowToClipboard(targetButton) {
    let buttonTd = targetButton.parentElement;
    let verseContentCell = buttonTd.previousSibling;
    let bibleTranslationCell = verseContentCell.previousSibling;

    let verseContentTrList = verseContentCell.querySelectorAll('tr.verse-content-tr');
    const bibleTranslationId = bibleTranslationCell.innerText;
    const separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

    let selectedBooks = await app_controller.verse_selection.getSelectedBooks();
    let verseReferenceTextList = await sectionLabelHelper.getVerseDisplayText(selectedBooks,
                                                                              verseContentTrList,
                                                                              true,
                                                                              false,
                                                                              separator,
                                                                              this.getBibleBookShortTitleFromVerseContentTr,
                                                                              this.getVerseReferenceFromVerseContentTr);

    // Check the user's preference for reference placement
    const referenceBeforeText = await app_controller.optionsMenu._copyVerseReferenceBeforeTextOption.isCheckedAsync();
    
    let verseText = await this.verseBoxHelper.getVerseTextFromVerseElements(
      verseContentTrList, 
      verseReferenceTextList, 
      false, 
      separator,
      referenceBeforeText
    );

    let verseTextHtml = await this.verseBoxHelper.getVerseTextFromVerseElements(verseContentTrList, verseReferenceTextList, true, separator);

    getPlatform().copyToClipboard(verseText, verseTextHtml);

    window.uiHelper.showSuccessMessage(i18n.t('bible-browser.copy-verse-text-to-clipboard-success'));
  }

  getBibleBookShortTitleFromVerseContentTr(verseContentTr) {
    let verseReferenceContent = verseContentTr.firstChild;
    let bibleBook = verseReferenceContent.getAttribute('book');
    return bibleBook;
  }

  getVerseReferenceFromVerseContentTr(verseContentTr) {
    let verseReferenceContent = verseContentTr.firstChild;
    return verseReferenceContent.getAttribute('reference');
  }

  performDelayedContentRefresh() {
    setTimeout(async () => {
      await this.performContentRefresh();
    }, 50);
  }
}

module.exports = TranslationComparison;
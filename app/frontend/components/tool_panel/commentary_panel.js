/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const VerseBox = require("../../ui_models/verse_box.js");
const { getPlatform } = require('../../helpers/ezra_helper.js');
const VerseBoxHelper = require('../../helpers/verse_box_helper.js');
const swordModuleHelper = require('../../helpers/sword_module_helper.js');
const sectionLabelHelper = require('../../helpers/section_label_helper.js');

/**
 * The CommentaryPanel component implements a tool panel that shows Bible commentaries for selected verses
 * 
 * @category Component
 */
class CommentaryPanel {
  constructor() {
    eventController.subscribe('on-verses-selected', (verseSelectionDetails) => {
      this.performRefresh(verseSelectionDetails.selectedElements);
    });

    let refreshWithSelection = () => {
      let selectedVerseBoxes = app_controller.verse_selection.getSelectedElements();
      this.performRefresh(selectedVerseBoxes);
    };

    eventController.subscribe('on-commentary-panel-switched', () => {
      refreshWithSelection();
    });

    eventController.subscribe('on-locale-changed', () => {
      refreshWithSelection();
    });

    eventController.subscribeMultiple(['on-translation-added', 'on-translation-removed'], (moduleCode) => {
      if (moduleCode == 'KJV') {
        refreshWithSelection();
      }
    });

    eventController.subscribeMultiple(['on-commentary-added', 'on-commentary-removed'], () => {
      refreshWithSelection();
    });

    this._verseBoxHelper = new VerseBoxHelper();
  }

  getMainContent() {
    return document.getElementById('commentary-panel-main-content');
  }

  getBoxContent() {
    return document.getElementById('commentary-panel-content');
  }

  getReferenceBox() {
    return document.getElementById('commentary-panel-reference-box');
  }

  showLoadingIndicator() {
    let loadingIndicator = document.getElementById('commentary-panel-loading-indicator');
    loadingIndicator.querySelector('.loader').style.display = 'block';
    loadingIndicator.style.display = 'block';
  }
  
  hideLoadingIndicator() {
    let loadingIndicator = document.getElementById('commentary-panel-loading-indicator');
    loadingIndicator.style.display = 'none';
  }

  isPanelActive() {
    let panelButtons = document.getElementById('panel-buttons');
    return panelButtons.activePanel == 'commentary-panel';
  }

  getHelpBox() {
    return document.getElementById('commentary-panel-help');
  }

  showHelpBox() {
    this.getBoxContent().innerHTML = "";
    this.getReferenceBox().innerHTML = "";

    let helpBox = this.getHelpBox();
    helpBox.classList.remove('hidden');
  }

  hideHelpBox() {
    let helpBox = this.getHelpBox();
    helpBox.classList.add('hidden');
  }

  async performRefresh(selectedVerseBoxes) {
    if (!this.isPanelActive()) {
      return;
    }

    let helpMessageNoCommentariesInstalled = document.getElementById('commentary-panel-help-no-commentaries');
    let helpMessageNoKjvInstalled = document.getElementById('commentary-panel-help-no-kjv');
    let installPreconditionsFulfilled = true;

    let allCommentaries = await ipcNsi.getAllLocalModules('COMMENTARY');
    if (allCommentaries.length == 0) {
      helpMessageNoCommentariesInstalled.style.display = '';
      installPreconditionsFulfilled = false;

    } else {
      helpMessageNoCommentariesInstalled.style.display = 'none';
    }

    const kjv = await ipcNsi.getLocalModule('KJV');
    if (kjv == null) {
      helpMessageNoKjvInstalled.style.display = '';
      installPreconditionsFulfilled = false;
    } else {
      helpMessageNoKjvInstalled.style.display = 'none';
    }

    if (!installPreconditionsFulfilled) {
      this.showHelpBox();
      return;
    }

    let panelHeader = document.getElementById('commentary-panel-header');
    let panelTitle = "";
    let selectedVerseBoxElements = null;
   
    if (app_controller.verse_selection != null) {
      selectedVerseBoxElements = app_controller.verse_selection.getSelectedVerseBoxes();
    }

    if (selectedVerseBoxElements != null &&
        selectedVerseBoxElements.length > 0) {

      panelTitle = i18n.t("commentary-panel.commentaries-for") + " " + 
        await app_controller.verse_selection.getSelectedVerseLabelText();

      this.hideHelpBox();

    } else {
      panelTitle = i18n.t("commentary-panel.default-header");

      this.showHelpBox();
    }

    panelHeader.innerHTML = "<b>" + panelTitle + "</b>";

    if (platformHelper.isCordova()) {

      this.getBoxContent().innerHTML = "";
      this.showLoadingIndicator();
      this.performDelayedContentRefresh(selectedVerseBoxes);

    } else {

      await this.performContentRefresh(selectedVerseBoxes);
    }
  }

  async performContentRefresh(selectedVerseBoxes=undefined) {
    const commentaryContent = await this.getCommentaryContent(selectedVerseBoxes);

    if (platformHelper.isCordova()) {
      this.hideLoadingIndicator();
    }

    this.getBoxContent().innerHTML = commentaryContent;
    this.hideReferenceBox();
    this.getReferenceBox().innerHTML = "";

    this.applyParagraphs();

    let moduleInfoButtons = this.getBoxContent().querySelectorAll('.module-info-button');
    moduleInfoButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        this.handleModuleInfoButtonClick(event);
      });
    });

    let commentaryCopyButtons = this.getBoxContent().querySelectorAll('.copy-commentary-button');
    commentaryCopyButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        this.handleCopyCommentaryButtonClick(event);
      });
    });

    let referenceElements = this.getBoxContent().querySelectorAll('reference');
    referenceElements.forEach((reference) => {
      reference.addEventListener('click', (event) => {
        this.handleReferenceClick(event);
      });
    });

    let scripRefElements = this.getBoxContent().querySelectorAll('.sword-scripref');
    scripRefElements.forEach((scripRef) => {
      scripRef.addEventListener('click', (event) => {
        this.handleScripRefClick(event);
      });
    });

    uiHelper.configureButtonStyles(this.getBoxContent());
  }

  applyParagraphs() {
    const sIdElements = this.getBoxContent().querySelectorAll('.sword-sid');

    sIdElements.forEach((sIdElement) => {
      let elementType = sIdElement.getAttribute('type');
      
      if (elementType == 'x-p') {
        sIdElement.classList.add('sword-paragraph');
      }
    });
  }

  handleModuleInfoButtonClick(event) {
    let moduleCode = event.target.closest('.module-info-button').getAttribute('module');
    app_controller.info_popup.showAppInfo(moduleCode);
  }

  async handleCopyCommentaryButtonClick(event) {
    let verseLabelText = await app_controller.verse_selection.getSelectedVerseLabelText();

    const commentaryDiv = event.target.closest('.commentary');
    const commentaryName = commentaryDiv.querySelector('.commentary-name').innerText;
    const commentaryContentBox = commentaryDiv.querySelector('.commentary-content');

    let commentaryContent = commentaryContentBox.innerText;
    let lineBreak = this._verseBoxHelper.getLineBreak(false);
    let commentaryText = `${commentaryName} - ${verseLabelText} ${lineBreak}${lineBreak} ${commentaryContent}`;

    let commentaryTextHtml = this.processCommentaryHtml(commentaryContentBox.innerHTML);
    lineBreak = this._verseBoxHelper.getLineBreak(true);
    commentaryTextHtml = `<b>${commentaryName} - ${verseLabelText}</b> ${lineBreak}${lineBreak} ${commentaryTextHtml}`;

    getPlatform().copyToClipboard(commentaryText, commentaryTextHtml);

    uiHelper.showSuccessMessage(i18n.t('commentary-panel.copy-commentary-to-clipboard-success'));
  }

  async handleReferenceClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const osisRef = event.target.getAttribute('osisref');
    let splitOsisRefs = await swordModuleHelper.getReferencesFromOsisRef(osisRef);
    await this.renderReferenceVerses(splitOsisRefs);
    event.target.scrollIntoView({ block: "nearest" });
  }

  async handleScripRefClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const referenceString = event.target.innerText;
    const references = referenceString.split(';');
    const parsedReferences = [];
    let selectedBooks = app_controller.verse_selection.getSelectedBooks();
    let currentBook = selectedBooks[0];
    let firstSelectedVerseBox = app_controller.verse_selection.getFirstSelectedVerseBox();
    let currentChapter = new VerseBox(firstSelectedVerseBox).getChapter();

    for (let i = 0; i < references.length; i++) {
      let currentReference = references[i].trim();

      if (currentReference.indexOf(' ') == -1) {

        if (currentReference.indexOf(':') == -1) {
          // Add the chapter if it is missing
          currentReference = currentChapter + ':' + currentReference;
        }

        // Reference does not contain a space and is therefore missing a book. We need to add the book in front of the reference.
        currentReference = currentBook + ' ' + currentReference;
        let splitOsisRefs = await swordModuleHelper.getReferencesFromOsisRef(currentReference);
        parsedReferences.push(...splitOsisRefs);
      } else {
        currentBook = currentReference.split(' ')[0];
        let splitOsisRefs = await swordModuleHelper.getReferencesFromOsisRef(currentReference);
        parsedReferences.push(...splitOsisRefs);
      }
    }

    await this.renderReferenceVerses(parsedReferences);

    event.target.scrollIntoView({ block: "nearest" });
  }

  async renderReferenceVerses(references) {
    const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    let verses = await ipcNsi.getVersesFromReferences(bibleTranslationId, references);
    let verseReferences = [];
    let bibleBookStats = app_controller.text_controller.getBibleBookStatsFromVerses(verses);
    let multipleBooks = Object.keys(bibleBookStats).length > 1;

    let multipleVerses = verses.length > 1;
    let verseContent = "";

    verses.forEach((verse) => {
      if (multipleVerses && !multipleBooks) {
        verseContent += `<sup>${verse.verseNr}</sup>`;
      }

      verseContent += verse.content + "<br/>";

      if (multipleBooks) {
        let verseReference = verse.bibleBookShortTitle + ' ' + verse.chapter + window.reference_separator + verse.verseNr;
        verseContent += verseReference + "<br/><br/>";
      }

      let shortVerseReference = verse.chapter + window.reference_separator + verse.verseNr;
      verseReferences.push(shortVerseReference);
    });

    if (!multipleBooks) {
      let currentBook = Object.keys(bibleBookStats)[0];
      let formattedVerseList = await sectionLabelHelper.formatVerseList(verseReferences, currentBook, window.reference_separator);

      verseContent += `<div>${currentBook} ${formattedVerseList}</div>`;
    }

    let closeIcon = '<div class="close-icon"><i class="fa-solid fa-rectangle-xmark"></i></div>';

    const commentaryPanelReferenceBox = this.getReferenceBox();
    commentaryPanelReferenceBox.innerHTML = closeIcon + verseContent;
    commentaryPanelReferenceBox.querySelector('.close-icon').addEventListener('click', (event) => {
      this.hideReferenceBox();
    });

    this.showReferenceBox();
  }

  showReferenceBox() {
    this.getMainContent().classList.add('with-reference-box');
    this.getReferenceBox().style.display = 'block';
  }

  hideReferenceBox() {
    this.getMainContent().classList.remove('with-reference-box');
    this.getReferenceBox().style.display = 'none';
  }

  processCommentaryHtml(htmlInput) {
    let processedHtml = '';

    processedHtml = htmlInput.replace(/&nbsp;/g, ' ');
    processedHtml = processedHtml.replaceAll('<reference', '<span');
    processedHtml = processedHtml.replaceAll('</reference', '</span');
    processedHtml = processedHtml.replaceAll('<hi', '<span');
    processedHtml = processedHtml.replaceAll('</hi>', '</span>');
    processedHtml = processedHtml.replaceAll('class="bold"', 'style="font-weight: bold;"');
    processedHtml = processedHtml.replaceAll('class="italic"', 'style="font-style: italic;"');
    processedHtml = processedHtml.replaceAll('sword-section-title"', 'sword-section-title"; style="font-weight: bold;"');
    processedHtml = processedHtml.replaceAll('<div class="sword-markup sword-sid sword-paragraph', '<br/><div class="sword-markup sword-sid sword-paragraph');

    return processedHtml;
  }

  performDelayedContentRefresh(selectedVerseBoxes=undefined) {
    setTimeout(async () => {
      await this.performContentRefresh(selectedVerseBoxes);
    }, 50);
  }

  async getCommentaryContent(selectedVerseBoxes=undefined) {
    let commentaryContent = "";

    if (selectedVerseBoxes != null) {
      if (selectedVerseBoxes.length != 0) {
        let allCommentaries = await ipcNsi.getAllLocalModules('COMMENTARY');

        // Sort commentaries by description
        allCommentaries.sort((a,b) => {
          if (a.description < b.description) return -1;
          if (a.description > b.description) return 1;
          return 0;
        });

        const moduleInfoButtonTitle = i18n.t('menu.show-module-info');
        const copyCommentaryButtonTitle = i18n.t('commentary-panel.copy-commentary-to-clipboard');

        for (let i = 0; i < allCommentaries.length; i++) {
          let currentCommentary = allCommentaries[i];

          // We do not support Image modules
          if (currentCommentary.category == 'Images') {
            continue;
          }

          let firstVerseBox = $(selectedVerseBoxes[0]);
          let verseCommentary = await this.getCommentaryForVerse(currentCommentary.name, firstVerseBox);

          if (verseCommentary != null && verseCommentary.length != 0) {
            commentaryContent += `
            <div class='commentary module-code-${currentCommentary.name.toLowerCase()}' module='${currentCommentary.name}'>
              <h3>
                <span class='commentary-name'>${currentCommentary.description}</span>

                <div class='module-info-button fg-button ui-corner-all ui-state-default'
                    i18n='[title]menu.show-module-info' title='${moduleInfoButtonTitle}' module='${currentCommentary.name}'>
                  <i class='fas fa-info'></i>
                </div>

                <div class='copy-commentary-button fg-button ui-corner-all ui-state-default'
                  i18n='[title]commentary-panel.copy-commentary-to-clipboard' title='${copyCommentaryButtonTitle}' module='${currentCommentary.name}'>
                  <i class='fas fa-copy copy-icon'></i>
                </div>
              </h3>

              <div class='commentary-content'>
              ${verseCommentary}
              </div>
            </div>
            `;
          }
        }

        if (commentaryContent.length == 0) {

          commentaryContent = "<div style='margin-top: 0.5em;'>" + 
                              i18n.t("commentary-panel.no-commentaries-available-for-this-verse") +
                              "</div>";
        }
      }
    }

    return commentaryContent;
  }

  async getCommentaryForVerse(commentaryId, verseBox) {
    const tab = app_controller.tab_controller.getTab();
    if (tab == null) {
      return;
    }

    const sourceTranslationId = tab.getBibleTranslationId();
    // TODO: Determine targetTranslationId based on language of commentary
    let targetTranslationId = 'KJV';

    let referenceVerseBox = new VerseBox(verseBox[0]);
    let bibleBookShortTitle = referenceVerseBox.getBibleBookShortTitle();
    let mappedAbsoluteVerseNumber = await referenceVerseBox.getMappedAbsoluteVerseNumber(sourceTranslationId, targetTranslationId);

    let kjvVerses = await ipcNsi.getBookText(targetTranslationId, bibleBookShortTitle, mappedAbsoluteVerseNumber, 1);
    let verse = kjvVerses[0];
    let commentary = "";

    if (verse != null) {
      let reference = bibleBookShortTitle + ' ' + verse.chapter + ':' + verse.verseNr;

      let commentaryEntry = await ipcNsi.getReferenceText(commentaryId, reference);
      commentary = commentaryEntry.content;
    }

    if (platformHelper.isElectron()) {
      commentary = this._verseBoxHelper.sanitizeHtmlCode(commentary);
    }

    return commentary;
  }
}

module.exports = CommentaryPanel;

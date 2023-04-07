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
const VerseBox = require("../../ui_models/verse_box.js");

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

    eventController.subscribe('on-commentary-panel-switched', () => {
      let selectedVerseBoxes = app_controller.verse_selection.getSelectedElements();
      this.performRefresh(selectedVerseBoxes);
    });

    eventController.subscribe('on-locale-changed', () => {
      let selectedVerseBoxes = app_controller.verse_selection.getSelectedElements();
      this.performRefresh(selectedVerseBoxes);
    });
  }

  getBoxContent() {
    return document.getElementById('commentary-panel-content');
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

  async performRefresh(selectedVerseBoxes) {
    if (!this.isPanelActive()) {
      return;
    }

    let panelContent = document.getElementById('commentary-panel-content');
    let helpMessageNoCommentariesInstalled = document.getElementById('commentary-panel-help-no-commentaries');

    let allCommentaries = await ipcNsi.getAllLocalModules('COMMENTARY');
    if (allCommentaries.length == 0) {
      helpMessageNoCommentariesInstalled.style.display = '';
      return;

    } else {
      helpMessageNoCommentariesInstalled.style.display = 'none';
    }

    let panelHeader = document.getElementById('commentary-panel-header');
    let helpBox = this.getHelpBox();
    let panelTitle = "";

    if (app_controller.verse_selection != null &&
        app_controller.verse_selection.selected_verse_box_elements != null &&
        app_controller.verse_selection.selected_verse_box_elements.length > 0) {

      panelTitle = i18n.t("commentary-panel.commentaries-for") + " " + 
        await app_controller.verse_selection.getSelectedVerseLabelText();

      helpBox.classList.add('hidden');

    } else {
      panelTitle = i18n.t("commentary-panel.default-header");
      helpBox.classList.remove('hidden');
      panelContent.innerHTML = "";
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
    let commentaryContent = await this.getCommentaryContent(selectedVerseBoxes);

    if (platformHelper.isCordova()) {
      this.hideLoadingIndicator();
    }

    this.getBoxContent().innerHTML = commentaryContent;

    let moduleInfoButtons = this.getBoxContent().querySelectorAll('.module-info-button');
    moduleInfoButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        this.handleModuleInfoButtonClick(event);
      });
    });

    uiHelper.configureButtonStyles(this.getBoxContent());
  }

  handleModuleInfoButtonClick(event) {
    let moduleCode = event.target.closest('.module-info-button').getAttribute('module');
    app_controller.info_popup.showAppInfo(moduleCode);
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

        for (let i = 0; i < allCommentaries.length; i++) {
          let currentCommentary = allCommentaries[i];
          let firstVerseBox = $(selectedVerseBoxes[0]);
          let verseCommentary = await this.getCommentaryForVerse(currentCommentary.name, firstVerseBox);

          if (verseCommentary != null && verseCommentary.length != 0) {
            commentaryContent += `
            <div class='commentary module-code-${currentCommentary.name.toLowerCase()}'>
              <h3>${currentCommentary.description}
                <div class='module-info-button fg-button ui-corner-all ui-state-default ui-state-default'
                    i18n='[title]menu.show-module-info' title='${moduleInfoButtonTitle}' module='${currentCommentary.name}'>
                  <i class='fas fa-info'></i>
                </div>
              </h3>

              ${verseCommentary}
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
    let reference = bibleBookShortTitle + ' ' + verse.chapter + ':' + verse.verseNr;

    let commentaryEntry = await ipcNsi.getReferenceText(commentaryId, reference);
    return commentaryEntry.content;
  }
}

module.exports = CommentaryPanel;
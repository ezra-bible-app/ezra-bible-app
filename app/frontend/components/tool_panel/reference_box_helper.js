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

const sectionLabelHelper = require('../../helpers/section_label_helper.js');

class ReferenceBoxHelper {
  constructor(mainContent, referenceBox) {
    this._mainContent = mainContent;
    this._referenceBox = referenceBox;
  }

  async handleReferenceClick(event, withReferenceVerse=true) {
    event.preventDefault();
    event.stopPropagation();

    let newTabOption = app_controller.optionsMenu._verseListNewTabOption;

    await app_controller.verse_list_popup.initCurrentCommentaryDictXrefs(event.target, withReferenceVerse);

    if (app_controller.verse_list_popup.currentXrefs.length > 2 || platformHelper.isMobile()) {
      this.hideReferenceBox();

      if (newTabOption.isChecked) {
        await app_controller.verse_list_popup.openVerseListInNewTab();
      } else {
        await app_controller.verse_list_popup.openVerseListPopup(event, 'COMMENTARY_DICT_XREFS', false, withReferenceVerse);
      }

    } else if (app_controller.verse_list_popup.currentXrefs.length > 0) {
      await this.renderReferenceVerses(app_controller.verse_list_popup.currentXrefs);
      event.target.scrollIntoView({ block: "nearest" });
    }
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

    verseContent = '<div class="verse-text panel-content" style="margin-top: 1em;">' + verseContent + '</div>';

    let tabIconTitle = i18n.t('bible-browser.open-new-tab');
    let tabIcon = `<div class="tab-icon icon" title="${tabIconTitle}"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>`;
    let closeIcon = '<div class="close-icon icon"><i class="fa-solid fa-rectangle-xmark"></i></div>';

    this._referenceBox.innerHTML = closeIcon + tabIcon + verseContent;

    this._referenceBox.querySelector('.close-icon').addEventListener('click', (event) => {
      this.hideReferenceBox();
    });

    this._referenceBox.querySelector('.tab-icon').addEventListener('click', (event) => {
      this.hideReferenceBox();
      app_controller.verse_list_popup.openVerseListInNewTab();
    });

    this.showReferenceBox();
  }

  showReferenceBox() {
    this._mainContent.classList.add('with-reference-box');
    this._referenceBox.style.display = 'block';
  }

  hideReferenceBox() {
    this._mainContent.classList.remove('with-reference-box');
    this._referenceBox.style.display = 'none';
  }
}

module.exports = ReferenceBoxHelper;

/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

/**
 * The TranslationComparison component implements a dialog that shows selected verses
 * in a comparison table using all available Bible translations.
 * 
 * @category Component
 */
class TranslationComparison {
  constructor() {
    this.initDone = false;
  }

  getButton() {
    return $('.show-parallel-translations-button');
  }

  initButtonEvents() {
    this.getButton().bind('click', async () => {
      if (this.isButtonEnabled()) {
        await this.handleButtonClick();
      }
    });
  }

  getBox() {
    return $('#compare-translations-box');
  }

  getBoxContent() {
    return $('#compare-translations-box-content');
  }

  isButtonEnabled() {
    return !(this.getButton().hasClass('ui-state-disabled'));
  }

  enableComparisonButton() {
    this.getButton().removeClass('ui-state-disabled');
  }

  disableComparisonButton() {
    this.getButton().addClass('ui-state-disabled');
  }

  initCompareTranslationsBox() {
    var width = uiHelper.getMaxDialogWidth();

    this.getBox().dialog({
      width: width,
      height: 500,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  };

  async getVerseHtmlByTranslationId(sourceBibleTranslationId, targetTranslationId, verseBox, totalVerseCount) {
    var referenceVerseBox = new VerseBox(verseBox[0]);
    var bibleBookShortTitle = referenceVerseBox.getBibleBookShortTitle();
    var mappedAbsoluteVerseNumber = await referenceVerseBox.getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetTranslationId);

    var verses = await ipcNsi.getBookText(targetTranslationId,
                                          bibleBookShortTitle,
                                          mappedAbsoluteVerseNumber,
                                          1);
    var targetTranslationVerse = verses[0];
    
    var verseHtml = "<tr>";
    
    if (targetTranslationVerse == null) {
      console.log("Couldn't get verse " + bibleBookShortTitle + ' / ' + mappedAbsoluteVerseNumber + " for " + targetTranslationId);
      if (totalVerseCount > 1) {
        verseHtml += "<td></td>";
      }

      verseHtml += "<td></td>";
    } else {
      var moduleReferenceSeparator = await getReferenceSeparator(targetTranslationId);
      var targetVerseReference = targetTranslationVerse.chapter + moduleReferenceSeparator + targetTranslationVerse.verseNr;
      
      if (totalVerseCount > 1) {
        verseHtml +=  "<td class='verse-reference-td'>" + targetVerseReference + "</td>";
      }

      verseHtml += "<td class='verse-content-td'>" + targetTranslationVerse.content + "</td>";
    }

    verseHtml += "</tr>";

    return verseHtml;
  }

  async getCompareTranslationContent() {
    var sourceTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var selectedVerseBoxes = app_controller.verse_selection.selected_verse_box_elements;
    var compareTranslationContent = "<table>";
    var allTranslations = await ipcNsi.getAllLocalModules();

    if (selectedVerseBoxes.length > 0) {
      for (var i = 0; i < allTranslations.length; i++) {
        var currentTranslationId = allTranslations[i].name;
        var currentTranslationName = allTranslations[i].description;
        var cssClass = '';
        if (i < allTranslations.length) {
          cssClass = 'compare-translation-row';
        }

        compareTranslationContent += "<tr class='" + cssClass + "'>";
        compareTranslationContent += "<td class='compare-translation-row' style='width: 16em; padding: 0.5em;'>" + currentTranslationName + "</td>";
        compareTranslationContent += "<td class='compare-translation-row'><table>";

        for (var j = 0; j < selectedVerseBoxes.length; j++) {
          var currentVerseBox = $(selectedVerseBoxes[j]);
          var verseHtml = await this.getVerseHtmlByTranslationId(sourceTranslationId, currentTranslationId, currentVerseBox, selectedVerseBoxes.length);
          compareTranslationContent += verseHtml;
        }

        compareTranslationContent += "</table></td>";

        compareTranslationContent += "</tr>";
      }
    }

    compareTranslationContent += "</table>";
    return compareTranslationContent;
  }

  async handleButtonClick() {
    if (!this.initDone) {
      this.initCompareTranslationsBox();
      this.initDone = true;
    }

    var boxTitle = i18n.t("bible-browser.comparing-translations-for") + " " + 
      app_controller.verse_selection.getSelectedVersesLabel().text();

    var width = uiHelper.getMaxDialogWidth();

    this.getBox().dialog({
      width: width,
      title: boxTitle
    });

    this.getBoxContent().html("");

    $('#compare-translations-loading-indicator').find('.loader').show();
    $('#compare-translations-loading-indicator').show();

    this.getBox().dialog("open");

    setTimeout(async () => {
      var compareTranslationContent = await this.getCompareTranslationContent();

      $('#compare-translations-loading-indicator').hide();
      this.getBoxContent().html(compareTranslationContent);
    }, 50);
  }
}

module.exports = TranslationComparison;
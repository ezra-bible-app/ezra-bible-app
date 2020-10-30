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

const VerseBox = require("../bible_browser/verse_box.js");

class TranslationComparison {
  constructor() {
    this.initCompareTranslationsBox();
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
    this.getBox().dialog({
      width: 700,
      height: 500,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  };

  getVerseHtmlByTranslationId(sourceBibleTranslationId, targetTranslationId, verseBox) {
    var referenceVerseBox = new VerseBox(verseBox[0]);
    var bibleBookShortTitle = referenceVerseBox.getBibleBookShortTitle();
    var mappedAbsoluteVerseNumber = referenceVerseBox.getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetTranslationId);

    var targetTranslationVerse = nsi.getBookText(targetTranslationId,
                                                 bibleBookShortTitle,
                                                 mappedAbsoluteVerseNumber,
                                                 1)[0];
    
    var verseHtml = "<div class='verse-box'>";
    
    if (targetTranslationVerse == null) {
      console.log("Couldn't get verse " + bibleBookShortTitle + ' / ' + mappedAbsoluteVerseNumber + " for " + targetTranslationId);
    } else {
      var targetVerseReference = targetTranslationVerse.chapter + reference_separator + targetTranslationVerse.verseNr;
                                  
      verseHtml += "<div class='verse-reference'><div class='verse-reference-content'>" + 
                  targetVerseReference + "</div></div>";
      verseHtml += "<div class='verse-content'><div class='verse-text'>" + 
                  targetTranslationVerse.content + "</div></div>";
    }

    verseHtml += "</div>";

    return verseHtml;
  }

  async getCompareTranslationContent() {
    var sourceTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
    var selectedVerseBoxes = bible_browser_controller.verse_selection.selected_verse_box_elements;
    var compareTranslationContent = "<table>";
    var allTranslations = nsi.getAllLocalModules();

    if (selectedVerseBoxes.length > 0) {
      for (var i = 0; i < allTranslations.length; i++) {
        var currentTranslationId = allTranslations[i].name;
        var currentTranslationName = allTranslations[i].description;
        var cssClass = '';
        if (i < allTranslations.length) {
          cssClass = 'compare-translation-row';
        }

        compareTranslationContent += "<tr class='" + cssClass + "'>";
        compareTranslationContent += "<td style='width: 16em; padding: 0.5em;'>" + currentTranslationName + "</td>";
        compareTranslationContent += "<td style='padding: 0.5em;'>";

        for (var j = 0; j < selectedVerseBoxes.length; j++) {
          var currentVerseBox = $(selectedVerseBoxes[j]);
          var verseHtml = this.getVerseHtmlByTranslationId(sourceTranslationId, currentTranslationId, currentVerseBox);
          compareTranslationContent += verseHtml;
        }

        compareTranslationContent += "</td>";
        compareTranslationContent += "</tr>";
      }
    }

    compareTranslationContent += "</table>";
    return compareTranslationContent;
  }

  async handleButtonClick() {
    var boxTitle = i18n.t("bible-browser.comparing-translations-for") + " " + 
      bible_browser_controller.verse_selection.getSelectedVersesLabel().text();

    this.getBox().dialog({
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
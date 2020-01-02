/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

class TranslationComparison {
  constructor() {
    this.initCompareTranslationsBox();
    this.getButton().bind('click', async () => {
      if (this.isButtonEnabled()) {
        await this.handleButtonClick();
      }
    });
  }

  getButton() {
    return $('#show-parallel-translations-button');
  }

  getBox() {
    return $('#compare-translations-box');
  }

  getBoxContent() {
    return $('#compare-translations-box-content');
  }

  getSelectedVersesLabel() {
    return $('#selected-verses').text();
  }

  isButtonEnabled() {
    return !(this.getButton().hasClass('ui-state-disabled'));
  }

  enableComparisonButton() {
    this.getButton().removeClass('ui-state-disabled');
    configure_button_styles('#tags-toolbar');
  }

  disableComparisonButton() {
    this.getButton().addClass('ui-state-disabled');
  }

  initCompareTranslationsBox() {
    this.getBox().dialog({
      width: 800,
      height: 500,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  };

  async getVerseHtmlByTranslationId(translationId, verseBox) {
    var bibleBookShortTitle = verseBox.find('.verse-bible-book-short').text();
    var currentVerseId = parseInt(verseBox.find('.verse-id').text());
    var currentDbVerse = await models.Verse.findByPk(currentVerseId);
    var sourceBibleTranslationId = currentDbVerse.bibleTranslationId;
    var sourceBibleTranslation = await models.BibleTranslation.findByPk(sourceBibleTranslationId);
    var targetBibleTranslation = await models.BibleTranslation.findByPk(translationId);

    var absoluteVerseNrEng = null;
    var absoluteVerseNrHeb = null;

    if (sourceBibleTranslation.versification == 'ENGLISH') {
      absoluteVerseNrEng = currentDbVerse.absoluteVerseNr;
      absoluteVerseNrHeb = currentDbVerse.getAbsoluteVerseNrHebFromEng(bibleBookShortTitle, absoluteVerseNrEng);
    } else if (sourceBibleTranslation.versification == 'HEBREW') {
      absoluteVerseNrHeb = currentDbVerse.absoluteVerseNr;
      absoluteVerseNrEng = currentDbVerse.getAbsoluteVerseNrEngFromHeb(bibleBookShortTitle, absoluteVerseNrHeb);
    }

    var currentAbsoluteVerseNr = null;
    if (targetBibleTranslation.versification == 'ENGLISH') {
      currentAbsoluteVerseNr = absoluteVerseNrEng;
    } else if (targetBibleTranslation.versification == 'HEBREW') {
      currentAbsoluteVerseNr = absoluteVerseNrHeb;
    }

    var currentBookId = parseInt(verseBox.find('.verse-bible-book-id').text());
    var targetTranslationVerse = await models.Verse.findByAbsoluteVerseNr(translationId,
                                                                          currentBookId,
                                                                          currentAbsoluteVerseNr);
    
    var verseHtml = "<div class='verse-box'>";
    
    if (targetTranslationVerse == null) {
      console.log("Couldn't get verse " + currentBookId + ' / ' + currentAbsoluteVerseNr + " for " + translationId);
    } else {
      var targetVerseReference = targetTranslationVerse.chapter + 
                                reference_separator + 
                                targetTranslationVerse.verseNr;
                                  
      verseHtml += "<div class='verse-reference'><div class='verse-reference-content'>" + 
                  targetVerseReference + "</div></div>";
      verseHtml += "<div class='verse-content'><div class='verse-text'>" + 
                  targetTranslationVerse.content + "</div></div>";
    }

    verseHtml += "</div>";

    return verseHtml;
  }

  async getCompareTranslationContent() {
    var selectedVerseBoxes = bible_browser_controller.verse_selection.selected_verse_boxes;
    var compareTranslationContent = "<table>";
    var allTranslations = await models.BibleTranslation.getTranslations();

    if (selectedVerseBoxes.length > 0) {
      for (var i = 0; i < allTranslations.length; i++) {
        var currentTranslationId = allTranslations[i];
        var currentTranslationName = await models.BibleTranslation.getName(currentTranslationId);
        var cssClass = '';
        if (i < allTranslations.length - 1) {
          cssClass = 'compare-translation-row';
        }

        compareTranslationContent += "<tr class='" + cssClass + "'>";
        compareTranslationContent += "<td style='width: 16em; padding: 0.5em;'>" + currentTranslationName + "</td>";
        compareTranslationContent += "<td style='padding: 0.5em;'>";

        for (var j = 0; j < selectedVerseBoxes.length; j++) {
          var currentVerseBox = $(selectedVerseBoxes[j]);
          var verseHtml = await this.getVerseHtmlByTranslationId(currentTranslationId, currentVerseBox);
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
    var compareTranslationContent = await this.getCompareTranslationContent();
    this.getBoxContent().html(compareTranslationContent);

    var boxTitle = i18n.t("bible-browser.comparing-translations-for") + " " + this.getSelectedVersesLabel();
    this.getBox().dialog({
      title: boxTitle
    });

    this.getBox().dialog("open");
  }
}

module.exports = TranslationComparison;
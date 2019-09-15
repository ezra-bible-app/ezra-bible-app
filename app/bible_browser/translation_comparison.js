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
    this.getButton().bind('click', () => { this.handleButtonClick(); });
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

  enableComparisonButton() {
    this.getButton().removeClass('ui-state-disabled');
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

  handleButtonClick() {
    var selectedVerseBoxes = tags_controller.selected_verse_boxes;
    var compareTranslationContent = "COMPARE TRANSLATIONS";

    if (selectedVerseBoxes.length > 0) {

    }

    this.getBoxContent().html(compareTranslationContent);

    var boxTitle = i18n.t("bible-browser.comparing-translations-for") + " " + this.getSelectedVersesLabel();
    this.getBox().dialog({
      title: boxTitle
    });

    this.getBox().dialog("open");
  }
}

module.exports = TranslationComparison;
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

const Verse = require('./verse.js');

class VerseBox {
  constructor(verseBoxElement) {
    this.verseBoxElement = verseBoxElement;
  }

  getVerseObject() {
    var isBookNoteVerse = this.isBookNoteVerse();

    if (isBookNoteVerse) {
      var verse = new Verse(
        app_controller.tab_controller.getTab().getBook(),
        null,
        null,
        null,
        isBookNoteVerse
      );

    } else {
      var verse = new Verse(
        this.getBibleBookShortTitle(),
        this.getAbsoluteVerseNumber(),
        this.getChapter(),
        this.getVerseNumber(),
        isBookNoteVerse
      );

    }

    return verse;
  }

  isBookNoteVerse() {
    return this.verseBoxElement.classList.contains('book-notes');
  }

  getVerseReferenceId() {
    return this.verseBoxElement.getAttribute('verse-reference-id');
  }

  getAbsoluteVerseNumber() {
    return parseInt(this.verseBoxElement.getAttribute('abs-verse-nr'));
  }

  getBibleBookShortTitle() {
    return this.verseBoxElement.getAttribute('verse-bible-book-short');
  }

  getSplittedReference() {
    var verseReference = this.verseBoxElement.querySelector('.verse-reference-content').innerText;
    var splittedReference = verseReference.split(reference_separator);
    return splittedReference;
  }

  getChapter() {
    var splittedReference = this.getSplittedReference();
    var chapter = parseInt(splittedReference[0]);
    return chapter;
  }

  getVerseNumber() {
    var splittedReference = this.getSplittedReference();
    var verseNumber = parseInt(splittedReference[1]);
    return verseNumber;
  }

  async getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetBibleTranslationId) {
    var sourceVersification = await app_controller.translation_controller.getVersification(sourceBibleTranslationId);
    var targetVersification = await app_controller.translation_controller.getVersification(targetBibleTranslationId);

    var absoluteVerseNumbers = models.VerseReference.getAbsoluteVerseNrs(sourceVersification,
                                                                         this.getBibleBookShortTitle(),
                                                                         this.getAbsoluteVerseNumber(),
                                                                         this.getChapter(),
                                                                         this.getVerseNumber());

    var mappedAbsoluteVerseNr = null;
    if (targetVersification == 'HEBREW') {
      mappedAbsoluteVerseNr = absoluteVerseNumbers.absoluteVerseNrHeb;
    } else {
      mappedAbsoluteVerseNr = absoluteVerseNumbers.absoluteVerseNrEng;
    }

    return mappedAbsoluteVerseNr;
  }
}

module.exports = VerseBox;
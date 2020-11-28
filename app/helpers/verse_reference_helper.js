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

class VerseReferenceHelper
{
  constructor(referenceSeparator, nsi) {
    this._referenceSeparator = referenceSeparator;
    this._nsi = nsi;
  }

  referenceToAbsoluteVerseNr(translation, bible_book, chapter, verse) {
    var verse_nr = 0;
  
    for (var i = 0; i < chapter - 1; i++) {
      var currentChapterVerseCount = this._nsi.getChapterVerseCount(translation, bible_book, chapter);
      verse_nr += currentChapterVerseCount;
    }
    
    verse_nr += Number(verse);
    return verse_nr;
  }
  
  referenceStringToAbsoluteVerseNr(translation, bible_book_short_title, reference, split_support=false) {
    if (reference == null) {
      return;
    }
  
    var split_support = false;
    if (reference.search(/b/) != -1) {
      split_support = true;
    }

    reference = reference.replace(/[a-z]/g, '');
    var ref_chapter = Number(reference.split(this._referenceSeparator)[0]);
    var ref_verse = Number(reference.split(this._referenceSeparator)[1]);
  
    var verse_nr = this.referenceToAbsoluteVerseNr(translation, bible_book_short_title, ref_chapter, ref_verse);
    if (split_support) verse_nr += 0.5;
  
    return verse_nr;
  }
}

module.exports = VerseReferenceHelper;
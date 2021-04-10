/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

class VerseReferenceHelper
{
  constructor(nsi) {
    this._nsi = nsi;
    this._customReferenceSeparator = null;
  }

  setReferenceSeparator(referenceSeparator) {
    this._customReferenceSeparator = referenceSeparator;
  }

  async getReferenceSeparator(translation) {
    if (this._customReferenceSeparator != null) {
      return this._customReferenceSeparator;
    } else {
      var separator = await getReferenceSeparator(translation);
      return separator;
    }
  }

  async referenceToAbsoluteVerseNr(translation, bible_book, chapter, verse) {
    var verse_nr = 0;
  
    for (var i = 1; i <= chapter - 1; i++) {
      var currentChapterVerseCount = await this._nsi.getChapterVerseCount(translation, bible_book, i);
      verse_nr += currentChapterVerseCount;
    }
    
    verse_nr += Number(verse);
    return verse_nr;
  }
  
  async referenceStringToAbsoluteVerseNr(translation, bible_book_short_title, reference, split_support=false) {
    if (!reference) {
      return 0; // for book level references
    }

    var separator = await this.getReferenceSeparator(translation);
  
    var split_support = false;
    if (reference.search(/b/) != -1) {
      split_support = true;
    }

    reference = reference.replace(/[a-z]/g, '');
    var ref_chapter = Number(reference.split(separator)[0]);
    var ref_verse = Number(reference.split(separator)[1]);
  
    var verse_nr = await this.referenceToAbsoluteVerseNr(translation, bible_book_short_title, ref_chapter, ref_verse);
    if (split_support) verse_nr += 0.5;
  
    return verse_nr;
  }
}

module.exports = VerseReferenceHelper;
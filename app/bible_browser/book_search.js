/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@tklein.info>

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

const Mousetrap = require('mousetrap');

class BookSearch {
  constructor() {
  }

  init(searchInput, searchOccurancesElement) {
    this.inputField = $(searchInput);
    this.searchOccurancesElement = $(searchOccurancesElement);

    this.inputField.bind('focus', function() { $(this).select(); });
    this.inputField.bind('keyup', () => this.doSearch(this.inputField.val()));

    Mousetrap.bind('ctrl+f', () => {
      console.log('ctrl + f pressed ...');

      this.inputField.focus()
      return false;
    });
  }

  doSearch(searchString) {
    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      var verseList = $('#verse-list');
      var allVerses = verseList.find('.verse-text');
      var bookOccurancesCount = 0;

      //console.log("Found " + allVerses.length + " verses to search in.");

      for (var i = 0; i < allVerses.length; i++) {
        var currentVerse = $(allVerses[i]);
        var verseOccurancesCount = this.doVerseSearch(currentVerse, searchString);

        bookOccurancesCount += verseOccurancesCount;
      }

      var occurancesString = "";

      if (bookOccurancesCount > 0) {
        var occurancesString = "(" + bookOccurancesCount + ")";
      }

      this.searchOccurancesElement.html(occurancesString);
    }, 200);
  }

  doVerseSearch(verseElement, searchString) {
    var occurances = this.getOccurancesInVerse(verseElement, searchString);
    var occurancesCount = occurances.length;

    if (occurancesCount > 0) {
      this.highlightOccurancesInVerse(verseElement, searchString, occurances);
    } else {
      this.removeHighlightingFromVerse(verseElement);
    }

    return occurancesCount;
  }

  getOccurancesInVerse(verseElement, searchString) {
    var occurances = [];
    var searchStringLength = searchString.length;

    if (searchStringLength > 0) {
      var verseText = verseElement.text();
      var currentIndex = 0;

      while (true) {
        var nextOccurance = verseText.indexOf(searchString, currentIndex);

        if (nextOccurance == -1) {
          break;
        } else {
          occurances.push(nextOccurance);
          currentIndex = nextOccurance + searchStringLength;
        }
      }
    }

    return occurances;
  }

  highlightOccurancesInVerse(verseElement, searchString, occurances) {
    var verseText = verseElement.text()
    var highlightedSearchString = this.getHighlightedSearchString(searchString);
    var regexSearchString = new RegExp(searchString, 'g');
    var highlightedVerseText = verseText.replace(regexSearchString, highlightedSearchString);
    verseElement.html(highlightedVerseText);
  }

  getHighlightedSearchString(searchString) {
    return "<span class='search-hl' style='background-color: yellow;'>" + searchString + "</span>";
  }

  removeHighlightingFromVerse(verseElement) {
    var verseText = verseElement.text();
    verseElement.html(verseText);
  }
}

module.exports = BookSearch;


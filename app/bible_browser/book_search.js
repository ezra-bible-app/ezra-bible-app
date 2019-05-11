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

const Mousetrap = require('mousetrap');

class BookSearch {
  constructor() {
  }

  init(searchForm, searchInput, searchOccurancesElement, prevButton, nextButton, onSearchResultsAvailable, onSearchReset) {
    this.searchForm = $(searchForm);
    this.inputField = $(searchInput);
    this.searchOccurancesElement = $(searchOccurancesElement);
    this.prevButton = $(prevButton);
    this.nextButton = $(nextButton);
    this.currentOccuranceIndex = 0;
    this.currentOccurancesCount = 0;
    this.allOccurances = [];
    this.previousOccuranceElement = null;
    this.currentOccuranceElement = null;
    this.onSearchResultsAvailable = onSearchResultsAvailable;
    this.onSearchReset = onSearchReset;

    this.initInputField();
    this.initNavigationButtons();
    this.initGlobalShortCuts();
  }

  initInputField() {
    this.inputField.bind('focus', function() { $(this).select(); });

    this.inputField.bind('keyup', (e) => {
      if (e.key == 'Escape') {
        this.clearSearch();
        return;
      }

      if (e.key == 'Enter') {
        this.jumpToNextOccurance();
        return;
      }

      var searchString = this.inputField.val();
      clearTimeout(this.searchTimeout);

      this.searchTimeout = setTimeout(() => {
        this.onSearchReset();
        this.doSearch(searchString);
      }, 200);
    });
  }

  initNavigationButtons() {
    this.prevButton.bind('click', () => {
      this.jumpToNextOccurance(false);
    });

    this.nextButton.bind('click', () => {
      this.jumpToNextOccurance();
    });
  }

  initGlobalShortCuts() {
    Mousetrap.bind('ctrl+f', () => {
      this.searchForm.show();
      this.inputField.focus()
      return false;
    });

    Mousetrap.bind('esc', () => {
      this.clearSearch();
      return false;
    });
  }

  setVerseList(verseList) {
    this.verseList = verseList;
  }

  clearSearch() {
    this.onSearchReset();
    this.searchForm.hide();
    this.doSearch("");
  }

  jumpToNextOccurance(forward=true) {
    this.previousOccuranceElement = $(this.allOccurances[this.currentOccuranceIndex]);

    var increment = 1;
    if (!forward) {
      increment = -1;
    }

    var inBounds = false;
    if (forward && (this.currentOccuranceIndex < (this.allOccurances.length - 1))) {
      inBounds = true;
    }

    if (!forward && (this.currentOccuranceIndex > 0)) {
      inBounds = true;
    }

    if (inBounds) {
      this.currentOccuranceIndex += increment;
    } else {
      if (forward) { // jump to the beginning when going forward at the end
        this.currentOccuranceIndex = 0;
      } else { // jump to the end when going backwards in the beginning
        this.currentOccuranceIndex = this.allOccurances.length - 1;
      }
    }

    // Jump to occurance in window
    this.currentOccuranceElement = $(this.allOccurances[this.currentOccuranceIndex]);
    var currentOccuranceVerseBox = this.currentOccuranceElement.closest('.verse-box');
    var currentOccuranceAnchor = '#' + $(currentOccuranceVerseBox.find('a')[0]).attr('name');
    window.location = currentOccuranceAnchor;

    this.highlightCurrentOccurance();
    this.inputField.focus();
  }

  highlightCurrentOccurance() {
    // Update highlighting
    if (this.previousOccuranceElement != null) {
      this.previousOccuranceElement.removeClass('current-hl');
    }

    if (this.currentOccuranceElement != null) {
      this.currentOccuranceElement.addClass('current-hl');
    }

    // Update occurances label
    this.updateOccurancesLabel();
  }

  updateOccurancesLabel() {
    var occurancesString = "";

    if (this.currentOccurancesCount > 0) {
      var currentOccuranceNumber = this.currentOccuranceIndex + 1;
      var occurancesString = currentOccuranceNumber + '/' + this.currentOccurancesCount;
    }

    this.searchOccurancesElement.html(occurancesString);
  }

  doSearch(searchString) {
    var allVerses = this.verseList.find('.verse-text');

    this.currentOccuranceIndex = 0;
    this.currentOccurancesCount = 0;
    this.allOccurances = [];

    //console.log("Found " + allVerses.length + " verses to search in.");

    for (var i = 0; i < allVerses.length; i++) {
      var currentVerse = $(allVerses[i]);
      var verseOccurancesCount = this.doVerseSearch(currentVerse, searchString);

      this.currentOccurancesCount += verseOccurancesCount;
    }

    this.allOccurances = this.verseList.find('.search-hl');
    this.currentOccuranceElement = $(this.allOccurances[this.currentOccuranceIndex]);
    this.highlightCurrentOccurance();

    this.onSearchResultsAvailable(this.allOccurances);
  }

  doVerseSearch(verseElement, searchString) {
    this.removeHighlightingFromVerse(verseElement);

    var occurances = this.getOccurancesInVerse(verseElement, searchString);
    var occurancesCount = occurances.length;
    if (occurancesCount > 0) {
      this.highlightOccurancesInVerse(verseElement, searchString, occurances);
    }

    return occurancesCount;
  }

  getOccurancesInVerse(verseElement, searchString) {
    var occurances = [];
    var searchStringLength = searchString.length;

    if (searchStringLength > 0) {
      var verseHtml = verseElement.html();
      var currentIndex = 0;

      while (true) {
        var nextOccurance = verseHtml.indexOf(searchString, currentIndex);

        if (nextOccurance == -1) {
          break;
        } else {
          if (this.isOccuranceValid(searchString, nextOccurance, verseHtml)) {
            occurances.push(nextOccurance);
          }

          currentIndex = nextOccurance + searchStringLength;
        }
      }
    }

    return occurances;
  }

  // based on https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
  escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  isOccuranceValid(match, offset, string) {
    var offsetAfterMatch = offset + match.length;
    var lengthAfterMatch = string.length - offset;
    var foundOpeningAngleBracketIndex = -1;
    var foundClosingAngleBracketIndex = -1;
    var matchIsValid = true;

    for (var i = offsetAfterMatch; i < (offsetAfterMatch + lengthAfterMatch); i++) {
      var currentChar = string[i];

      if (foundOpeningAngleBracketIndex == (i - 1)) {
        // We found an opening angle bracket in the previous iteration

        if (currentChar == '/') {
          // Found closing angle bracket - so essential we found '</' now.
          foundClosingAngleBracketIndex = i;

        } else if (currentChar == 'd') {
          // Some other markup is starting (with a div), it's not a closing one, so the match is not surrounded by markup.
          // In this case we also cancel the search and the match is valid in this case.
          break;
        }
      }

      if (foundClosingAngleBracketIndex == (i - 1)) {
        // We previously found a closing angle bracket ('</').
        if (currentChar == 'd') {
          // Now it's clear that the closing element is a div.

          // This means that the match is within special markup and must be ignored (invalid match)
          // Then we're cancelling the search and are done.
          matchIsValid = false;
          break;
        }
      }
      
      if (currentChar == '<') {
        foundOpeningAngleBracketIndex = i;
      }

      if (currentChar == '>' && foundOpeningAngleBracketIndex == -1) {
        // If we find a closing angle bracket and have not found a opening angle bracket before, it's clear that the occurance is within special markup and is invalid
        matchIsValid = false;
        break;
      }
    }
    
    return matchIsValid;
  }

  highlightOccurancesInVerse(verseElement, searchString, occurances) {
    var verseHtml = verseElement.html()
    searchString = this.escapeRegExp(searchString);

    var regexSearchString = new RegExp(searchString, 'g');
    var highlightedVerseText = verseHtml.replace(regexSearchString, (match, offset, string) => {
      if (this.isOccuranceValid(match, offset, string)) {
        return this.getHighlightedSearchString(match);
      } else {
        return match;
      }
    });

    verseElement.html(highlightedVerseText);
  }

  getHighlightedSearchString(searchString) {
    return "<span class='search-hl'>" + searchString + "</span>";
  }

  removeHighlightingFromVerse(verseElement) {
    var searchHl = verseElement.find('.search-hl, .current-hl');
    for (var i = 0; i < searchHl.length; i++) {
      var highlightedText = $(searchHl[i]);
      var text = highlightedText.text();
      highlightedText.replaceWith(text);
    }

    var verseElementHtml = verseElement.html();
    verseElementHtml = verseElementHtml.replace("\"\n\"", "");
    verseElement.html(verseElementHtml);
  }
}

module.exports = BookSearch;


/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class VerseSearch {
  constructor() {}

  doVerseSearch(verseElement, searchString, searchType, caseSensitive=false) {
    var searchTermList = null;

    if (searchType == "phrase") {

      searchTermList = [ searchString ];

    } else if (searchType == "multiWord") {

      searchTermList = searchString.split(' ');

    } else {
      console.error("VerseSearch: Unknown search type!");
      return 0;
    }

    var occurancesCount = 0;
    var allTermsFound = true;

    for (var i = 0; i < searchTermList.length; i++) {
      var currentSearchTerm = searchTermList[i];

      var occurances = this.getOccurancesInVerse(verseElement, currentSearchTerm, caseSensitive);
      var currentOccurancesCount = occurances.length;
      occurancesCount += currentOccurancesCount;

      if (currentOccurancesCount == 0) {
        allTermsFound = false;
        occurancesCount = 0;
        break;
      }
    }

    if (allTermsFound) {
      for (var i = 0; i < searchTermList.length; i++) {
        var currentSearchTerm = searchTermList[i];
        this.highlightOccurancesInVerse(verseElement, currentSearchTerm, caseSensitive);
      }
    }

    return occurancesCount;
  }

  getOccurancesInVerse(verseElement, searchString, caseSensitive=false) {
    var occurances = [];
    var searchStringLength = searchString.length;

    if (searchStringLength > 0) {
      var verseText = verseElement.textContent;
      if (searchString.indexOf(" ") != -1) {
        // Replace all white space with regular spaces
        var verseText = verseText.replace(/\s/g, " ");
      }

      if (!caseSensitive) {
        verseText = verseText.toLowerCase();
        searchString = searchString.toLowerCase();
      }

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

  highlightOccurancesInVerse(verseElement, searchString, caseSensitive=false) {
    var verseHtml = verseElement.innerHTML;
    // Replace all &nbsp; occurances with space. This is necessary in case of Strong's verse content.
    // Otherwise we don't find the user's searchString if it contains spaces.
    // Later we need to undo this!
    verseHtml = verseHtml.replace(/&nbsp;/g, ' ');

    searchString = this.escapeRegExp(searchString);

    var regexOptions = 'g';
    if (!caseSensitive) {
      regexOptions += 'i';
    }

    var regexSearchString = new RegExp(searchString, regexOptions);
    var highlightedVerseText = verseHtml.replace(regexSearchString, (match, offset, string) => {
      if (this.isOccuranceValid(match, offset, string)) {
        return this.getHighlightedSearchString(match);
      } else {
        return match;
      }
    });

    verseElement.innerHTML = highlightedVerseText;
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
        // Next we will be looking for '/'

        if (currentChar == '/') {
          // Found closing angle bracket - so essential we found '</' now.
          foundClosingAngleBracketIndex = i;

        } else if (currentChar == 'd') {
          // Some other markup is starting (with a div), it's not a closing one, so the match is not surrounded by markup.
          // In this case we cancel the search and the match is considered valid.
          break;
        }
      }

      if (foundClosingAngleBracketIndex == (i - 1)) {
        // We previously found a closing angle bracket ('</').

        if (currentChar == 'd') {
          // Now it's clear that the closing element is a div. (No other element starting with 'd')
          // This means that the match is within special markup and must be ignored (invalid match)
          // We're cancelling the search and are now done.

          matchIsValid = false;
          break;
        }
      }
      
      if (currentChar == '<') {
        foundOpeningAngleBracketIndex = i;
      }

      if (currentChar == '>' && foundOpeningAngleBracketIndex == -1) {
        // If we find a closing angle bracket and have not found a opening angle bracket before,
        // it's clear that the occurance is within special markup and is invalid.
        // We're cancelling the search and are now done.

        matchIsValid = false;
        break;
      }
    }
    
    return matchIsValid;
  }

  getHighlightedSearchString(searchString) {
    return "<span class='search-hl'>" + searchString + "</span>";
  }
}

module.exports = VerseSearch;
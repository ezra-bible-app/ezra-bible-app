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

class SingleWordHighlighter {
  constructor(highlightFunction) {
    this.highlightFunction = highlightFunction;
  }

  highlightOccurrances(verseElement, searchString, regexOptions) {
    var verseHtml = verseElement.innerHTML;
    // Replace all &nbsp; occurances with space. This is necessary in case of Strong's verse content.
    // Otherwise we don't find the user's searchString if it contains spaces.
    // Later we need to undo this!
    verseHtml = verseHtml.replace(/&nbsp;/g, ' ');

    searchString = escapeRegExp(searchString);

    var regexSearchString = new RegExp(searchString, regexOptions);
    var highlightedVerseText = verseHtml.replace(regexSearchString, (match, offset, string) => {
      if (this.isOccuranceValid(match, offset, string)) {
        return this.highlightFunction(match);
      } else {
        return match;
      }
    });

    verseElement.innerHTML = highlightedVerseText;
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
}

module.exports = SingleWordHighlighter;
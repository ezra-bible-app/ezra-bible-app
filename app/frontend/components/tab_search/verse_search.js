/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const ExactPhraseHighlighter = require('./exact_phrase_highlighter.js');
const SingleWordHighlighter = require('./single_word_highlighter.js');
const StrongsHighlighter = require('./strongs_highlighter.js');

class VerseSearch {
  constructor() {
    this.currentVerseElementTextNodes = undefined;
    this.exactPhraseHighlighter = new ExactPhraseHighlighter(this.getHighlightedText);
    this.singleWordHighlighter = new SingleWordHighlighter(this.getHighlightedText);
    this.strongsHighlighter = new StrongsHighlighter(this.getHighlightedText);
  }

  doVerseSearch(verseElement, searchString, searchType, caseSensitive=false, extendedVerseBoundaries=false, wordBoundaries=false) {
    this.currentVerseElementTextNodes = undefined;

    var searchTermList = null;
    var isStrongs = (searchType == "strongsNumber");

    if (searchType == "phrase" || searchType == "strongsNumber") {

      searchTermList = [ searchString ];

    } else if (searchType == "multiWord") {

      searchTermList = searchString.split(' ');

    } else {
      console.error("VerseSearch: Unknown search type!");
      return 0;
    }

    var occurancesCount = 0;
    var allTermsFound = true;
    var allOccurances = [];

    for (let i = 0; i < searchTermList.length; i++) {
      var currentSearchTerm = searchTermList[i];
      var occurances = [];

      if (isStrongs) {
        occurances = this.getStrongsOccurancesInVerse(verseElement, currentSearchTerm);
      } else {
        occurances = this.getOccurancesInVerse(verseElement, currentSearchTerm, caseSensitive, wordBoundaries);
      }

      var currentOccurancesCount = occurances.length;
      occurancesCount += currentOccurancesCount;
      allOccurances = allOccurances.concat(occurances);

      /*if (occurancesCount > 0) {
        var verseReference = $(verseElement).closest('.verse-box').find('.verse-reference-content').text();
        console.log(`Got ${occurancesCount} for verse ${verseReference}`);
      }*/

      if (currentOccurancesCount == 0) {
        allTermsFound = false;

        if (!extendedVerseBoundaries) {
          occurancesCount = 0;
          break;
        }
      }
    }

    if (allTermsFound || extendedVerseBoundaries) {
      searchTermList.forEach((currentSearchTerm) => {
        this.highlightOccurancesInVerse(verseElement, allOccurances, currentSearchTerm, searchType, caseSensitive, wordBoundaries);
      });
    }

    return occurancesCount;
  }

  getStrongsOccurancesInVerse(verseElement, searchString) {
    var occurances = [];
    var wElements = verseElement.querySelectorAll('w');

    for (let i = 0; i < wElements.length; i++) {
      var currentElement = wElements[i];
      var currentStrongsIds = app_controller.word_study_controller.getStrongsIdsFromStrongsElement(currentElement);

      for (let j = 0; j < currentStrongsIds.length; j++) {
        if (currentStrongsIds[j] == searchString) {
          occurances.push(currentElement);
        }
      }
    }

    return occurances;
  }

  getOccurancesInVerse(verseElement, searchString, caseSensitive=false, wordBoundaries=false) {
    var occurances = [];
    var searchStringLength = searchString.length;

    if (searchStringLength > 0) {
      this.currentVerseElementTextNodes = this.getTextNodes(verseElement);
      var verseText = '';

      this.currentVerseElementTextNodes.forEach((textNode) => {
        verseText += textNode.nodeValue;
      });

      if (searchString.indexOf(' ') != -1) {
        // Replace all white space with regular spaces
        verseText = verseText.replace(/\s/g, ' ');
      }

      var verseTextForComparison = verseText;
      var searchStringForComparison = searchString;

      if (!caseSensitive) {
        verseTextForComparison = verseText.toLowerCase();
        searchStringForComparison = searchString.toLowerCase();
      }

      if (wordBoundaries) {
        // Use custom word boundary detection for more consistent results
        var currentIndex = 0;
        
        while (true) {
          var nextOccurance = verseTextForComparison.indexOf(searchStringForComparison, currentIndex);
          
          if (nextOccurance === -1) {
            break;
          } else {
            // Check if this is a whole word match using word boundary characters
            var prevChar = nextOccurance > 0 ? verseTextForComparison[nextOccurance - 1] : null;
            var nextChar = nextOccurance + searchStringForComparison.length < verseTextForComparison.length ? 
                           verseTextForComparison[nextOccurance + searchStringForComparison.length] : null;
            
            // Word boundaries are whitespace, punctuation, or start/end of string
            var prevIsBoundary = !prevChar || /[\s.,;:!?()[\]{}|<>"'\/\\-]/.test(prevChar);
            var nextIsBoundary = !nextChar || /[\s.,;:!?()[\]{}|<>"'\/\\-]/.test(nextChar);
            
            if (prevIsBoundary && nextIsBoundary) {
              occurances.push(nextOccurance);
            }
            
            currentIndex = nextOccurance + searchStringForComparison.length;
          }
        }
      } else {
        // For non-word boundary search, use the original string search approach
        var currentIndex = 0;
        
        while (true) {
          var nextOccurance = verseTextForComparison.indexOf(searchStringForComparison, currentIndex);
          
          if (nextOccurance === -1) {
            break;
          } else {
            occurances.push(nextOccurance);
            currentIndex = nextOccurance + searchStringForComparison.length;
          }
        }
      }
    }

    return occurances;
  }

  getTextNodes(verseElement) {
    if (this.currentVerseElementTextNodes !== undefined) {
      return this.currentVerseElementTextNodes;
    }

    var customNodeFilter = {
      acceptNode: function(node) {
        // Logic to determine whether to accept, reject or skip node
        var parentNode = node.parentNode;
        var parentClass = parentNode.className;
        var parentNodeName = parentNode.nodeName;

        if (parentClass.startsWith('verse') ||
            parentClass.indexOf('sword-quote-jesus') != -1 ||
            parentNodeName == "W" ||
            parentNodeName == "SEG" ||
            parentNodeName == "TRANSCHANGE") {

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    };

    var nextNode;
    var textNodes = [];
    var walk = document.createTreeWalker(verseElement, NodeFilter.SHOW_TEXT, customNodeFilter, false);

    // eslint-disable-next-line no-cond-assign
    while (nextNode = walk.nextNode()) {
      textNodes.push(nextNode);
    }

    this.currentVerseElementTextNodes = textNodes;
    return textNodes;
  }

  highlightOccurancesInVerse(verseElement, occurances, searchString, searchType, caseSensitive=false, wordBoundaries=false) {
    var regexOptions = 'g';
    if (!caseSensitive) {
      regexOptions += 'i';
      searchString = searchString.toLowerCase();
    }

    if (searchType == "phrase") {
      this.currentVerseElementTextNodes = this.getTextNodes(verseElement);
      this.exactPhraseHighlighter.highlightOccurrences(this.currentVerseElementTextNodes, searchString, caseSensitive, regexOptions, wordBoundaries);
    } else if (searchType == "strongsNumber") {
      this.strongsHighlighter.highlightOccurrences(occurances);
    } else {
      this.singleWordHighlighter.highlightOccurrences(verseElement, searchString, regexOptions, wordBoundaries);
    }
  }

  getHighlightedText(text, first=true) {
    var cssClass = 'search-hl';
    if (first) cssClass += ' first';

    var highlightedText = `<span class='${cssClass}'>${text}</span>`;
    return highlightedText;
  }
}

module.exports = VerseSearch;
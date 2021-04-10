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

  doVerseSearch(verseElement, searchString, searchType, caseSensitive=false, extendedVerseBoundaries=false) {
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

    for (var i = 0; i < searchTermList.length; i++) {
      var currentSearchTerm = searchTermList[i];
      var occurances = [];

      if (isStrongs) {
        occurances = this.getStrongsOccurancesInVerse(verseElement, currentSearchTerm);
      } else {
        occurances = this.getOccurancesInVerse(verseElement, currentSearchTerm, caseSensitive);
      }

      var currentOccurancesCount = occurances.length;
      occurancesCount += currentOccurancesCount;

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
        this.highlightOccurancesInVerse(verseElement, occurances, currentSearchTerm, searchType, caseSensitive);
      });
    }

    return occurancesCount;
  }

  getStrongsOccurancesInVerse(verseElement, searchString) {
    var occurances = [];
    var wElements = verseElement.querySelectorAll('w');

    for (var i = 0; i < wElements.length; i++) {
      var currentElement = wElements[i];
      var currentStrongsIds = app_controller.dictionary_controller.getStrongsIdsFromStrongsElement($(currentElement));

      for (var j = 0; j < currentStrongsIds.length; j++) {
        if (currentStrongsIds[j] == searchString) {
          occurances.push(currentElement);
        }
      }
    }

    return occurances;
  }

  getOccurancesInVerse(verseElement, searchString, caseSensitive=false) {
    var occurances = [];
    var searchStringLength = searchString.length;

    if (searchStringLength > 0) {
      this.currentVerseElementTextNodes = this.getTextNodes(verseElement);
      var verseText = "";

      this.currentVerseElementTextNodes.forEach((textNode) => {
        verseText += textNode.nodeValue;
      });

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

        if (parentClass.startsWith('verse') || parentNodeName == "W" ||
            parentNodeName == "SEG" || parentNodeName == "TRANSCHANGE") {

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    };

    var nextNode;
    var textNodes = [];
    var walk = document.createTreeWalker(verseElement, NodeFilter.SHOW_TEXT, customNodeFilter, false);

    while (nextNode = walk.nextNode()) {
      textNodes.push(nextNode);
    }

    this.currentVerseElementTextNodes = textNodes;
    return textNodes;
  }

  highlightOccurancesInVerse(verseElement, occurances, searchString, searchType, caseSensitive=false) {
    var regexOptions = 'g';
    if (!caseSensitive) {
      regexOptions += 'i';
      searchString = searchString.toLowerCase();
    }

    if (searchType == "phrase") {
      this.currentVerseElementTextNodes = this.getTextNodes(verseElement);
      this.exactPhraseHighlighter.highlightOccurrances(this.currentVerseElementTextNodes, searchString, caseSensitive, regexOptions);
    } else if (searchType == "strongsNumber") {
      this.strongsHighlighter.highlightOccurrances(occurances);
    } else {
      this.singleWordHighlighter.highlightOccurrances(verseElement, searchString, regexOptions);
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
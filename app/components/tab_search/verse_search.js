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

const ExactPhraseHighlighter = require('./exact_phrase_highlighter.js');
const SingleWordHighlighter = require('./single_word_highlighter.js');
const StrongsHighlighter = require('./strongs_highlighter.js');

class VerseSearch {
  constructor() {
    this.exactPhraseHighlighter = new ExactPhraseHighlighter(this.getHighlightedText);
    this.singleWordHighlighter = new SingleWordHighlighter(this.getHighlightedText);
    this.strongsHighlighter = new StrongsHighlighter(this.getHighlightedText);
  }

  doVerseSearch(verseElement, searchString, searchType, caseSensitive=false, extendedVerseBoundaries=false) {
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

      var verseElementTextNodes = this.getTextNodes(verseElement);
      var verseText = "";

      verseElementTextNodes.forEach((textNode) => {
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
    var customNodeFilter = {
      acceptNode: function(node) {
        // Logic to determine whether to accept, reject or skip node
        var parentNode = node.parentNode;
        var acceptedNodeNames = [ "W", "SEG", "TRANSCHANGE"];
        if (acceptedNodeNames.includes(parentNode.nodeName) || parentNode.classList.contains('verse-text')) {
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

    return textNodes;
  }

  highlightOccurancesInVerse(verseElement, occurances, searchString, searchType, caseSensitive=false) {
    var regexOptions = 'g';
    if (!caseSensitive) {
      regexOptions += 'i';
      searchString = searchString.toLowerCase();
    }

    if (searchType == "phrase") {
      var nodes = this.getTextNodes(verseElement);
      this.exactPhraseHighlighter.highlightOccurrances(nodes, searchString, caseSensitive, regexOptions);
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
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
  constructor() {
  }

  doVerseSearch(verseElement, searchString, searchType, caseSensitive=false, extendedVerseBoundaries=false) {
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
        this.highlightOccurancesInVerse(verseElement, currentSearchTerm, searchType, caseSensitive);
      });
    }

    /*if (occurancesCount > 0) {
      return 1;
    } else {
      return 0;
    }*/
    return occurancesCount;
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

  getSplittedSearchString(searchString) {
    var splittedSearchString = searchString.split(" ");
    var specialCharacters = ".,;:!?“”\"'";

    for (var i = 0; i < specialCharacters.length; i++) {
      var specialChar = specialCharacters[i];
      splittedSearchString.forEach((searchTerm, i) => {
        if (searchTerm.length > 1 && searchTerm.indexOf(specialChar) != -1) {
          splittedSearchString[i] = splittedSearchString[i].replace(specialChar, "");
          splittedSearchString.splice(i + 1, 0, specialChar);
        }
      });
    }

    return splittedSearchString;
  }

  highlightOccurancesInVerse(verseElement, searchString, searchType, caseSensitive=false) {
    var regexOptions = 'g';
    if (!caseSensitive) {
      regexOptions += 'i';
      searchString = searchString.toLowerCase();
    }

    if (searchType == "phrase") {
      this.highlightExactPhraseOccurrances(verseElement, searchString, caseSensitive, regexOptions);
    } else {
      var verseHtml = verseElement.innerHTML;
      // Replace all &nbsp; occurances with space. This is necessary in case of Strong's verse content.
      // Otherwise we don't find the user's searchString if it contains spaces.
      // Later we need to undo this!
      verseHtml = verseHtml.replace(/&nbsp;/g, ' ');
  
      searchString = this.escapeRegExp(searchString);
  
      var regexSearchString = new RegExp(searchString, regexOptions);
      var highlightedVerseText = verseHtml.replace(regexSearchString, (match, offset, string) => {
        if (this.isOccuranceValid(match, offset, string)) {
          return this.getHighlightedText(match);
        } else {
          return match;
        }
      });
  
      verseElement.innerHTML = highlightedVerseText;
    }
  }

  resetPhraseSearch(searchString) {
    this.splittedPhrase = this.getSplittedSearchString(searchString);
    this.firstTerm = this.splittedPhrase[0];
    this.searchTermCount = this.splittedPhrase.length;
    this.nextSearchTerm = this.splittedPhrase.shift();
    this.foundNodeCounter = 0;
    this.initialFoundNodeCounter = this.foundNodeCounter;
    this.highlightNodes = [];
  }

  getHighlightNodes(nodes, searchString, caseSensitive) {
    var allHighlightNodes = [];

    for (var i = 0; i < nodes.length; i++) {
      var currentNode = nodes[i];
      var currentNodeValue = currentNode.nodeValue.trim();
      var continueSearchInCurrentNode = true;
      this.initialFoundNodeCounter = this.foundNodeCounter;
      var currentNodeIterations = 0;
      var expectedNewResultIndex = -1;

      var matchExpected = false;
      var charactersLeft = currentNodeValue.length;

      if (!caseSensitive) {
        currentNodeValue = currentNodeValue.toLowerCase();
      }
      
      while (continueSearchInCurrentNode) {
        // If the characters left are less then our search term we reset the search
        if (currentNodeValue != "" && charactersLeft < this.nextSearchTerm.length) {
          this.resetPhraseSearch(searchString);
          matchExpected = false;
          break;
        } else if (currentNodeIterations == 0 && this.foundNodeCounter > 0 && currentNodeValue.trim().length > 0) {
          matchExpected = true;
          expectedNewResultIndex = 0;
        } else if (currentNodeIterations > 0 && this.foundNodeCounter > this.initialFoundNodeCounter) {
          matchExpected = true;
        }

        var resultIndex = -1;

        if (expectedNewResultIndex == -1) {
          resultIndex = currentNodeValue.indexOf(this.nextSearchTerm);
        } else {
          resultIndex = currentNodeValue.indexOf(this.nextSearchTerm, expectedNewResultIndex);
        }

        if ((resultIndex != -1 && expectedNewResultIndex == -1) ||
            (resultIndex != -1 && expectedNewResultIndex >= 0 &&
             resultIndex >= expectedNewResultIndex && 
             ((matchExpected && resultIndex <= expectedNewResultIndex + 2) || !matchExpected))) {

          this.foundNodeCounter += 1;
          expectedNewResultIndex = resultIndex + this.nextSearchTerm.length;

          var matchExisting = false;

          for (var j = 0; j < this.highlightNodes.length; j++) {
            var currentMatch = this.highlightNodes[j];

            if (currentMatch.node == i) {
              currentMatch.matches.push({
                term: this.nextSearchTerm,
                index: resultIndex
              });
              matchExisting = true;
              break;
            }
          }

          if (!matchExisting) {
            var match = {
              node: i,
              matches: [{
                term: this.nextSearchTerm,
                index: resultIndex
              }]
            };

            this.highlightNodes.push(match);
          }

          this.nextSearchTerm = this.splittedPhrase.shift();
          if (this.nextSearchTerm == undefined) {
            break;
          }
        } else {
          // Reset the search if we have multiple terms and there is a break between the first match and the current node
          if (matchExpected ||
             (currentNodeValue.trim() != "" &&
              currentNodeIterations == 0 &&
              this.initialFoundNodeCounter > 0 &&
              this.searchTermCount > 1)) {
                
            this.resetPhraseSearch(searchString);
            matchExpected = false;
          } else {
            continueSearchInCurrentNode = false;
          }
        }

        charactersLeft = currentNodeValue.length - expectedNewResultIndex;
        if (charactersLeft <= 0) {
          break;
        }

        currentNodeIterations++;
      }

      if (this.nextSearchTerm == undefined) {
        if (this.highlightNodes.length > 0) {
          allHighlightNodes = allHighlightNodes.concat(this.highlightNodes);
        }

        this.resetPhraseSearch(searchString);
      }
    }

    return allHighlightNodes;
  }

  highlightExactPhraseOccurrances(verseElement, searchString, caseSensitive=false, regexOptions) {
    this.resetPhraseSearch(searchString);
    var nodes = this.getTextNodes(verseElement);
    var allHighlightNodes = this.getHighlightNodes(nodes, searchString, caseSensitive);

    this.splittedPhrase = this.getSplittedSearchString(searchString);
    this.nextSearchTerm = this.splittedPhrase.shift();
    var totalMatchCounter = 0;

    for (var i = 0; i < allHighlightNodes.length; i++) {
      var currentMatchList = allHighlightNodes[i];

      var currentNode = nodes[currentMatchList.node];
      var currentNodeValue = currentNode.nodeValue;
      var highlightedNodeValue = currentNodeValue;
      var matchCounter = 0;
      var extraOffset = 0;

      for (var j = 0; j < currentMatchList.matches.length; j++) {
        var currentMatch = currentMatchList.matches[j];
        var term = this.escapeRegExp(currentMatch.term);
        var regexSearchString = new RegExp(term, regexOptions);
        highlightedNodeValue = highlightedNodeValue.replace(regexSearchString, (match, offset, string) => {
          var expectedOffset = currentMatch.index + extraOffset;

          if (offset >= expectedOffset && offset <= expectedOffset + 1) {
            matchCounter += 1;
            
            var isFirstTerm = false;
            if (caseSensitive) {
              isFirstTerm = (match == this.firstTerm);
            } else {
              isFirstTerm = (match.toLowerCase() == this.firstTerm.toLowerCase());
            }

            var hlText = this.getHighlightedText(match, isFirstTerm);
            extraOffset += (hlText.length - match.length);
            return hlText;
          } else {
            return match;
          }
        });
      }

      $(currentNode).replaceWith(highlightedNodeValue);
      totalMatchCounter += matchCounter;
    }
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

  getHighlightedText(text, first=true) {
    var cssClass = 'search-hl';
    if (first) cssClass += ' first';

    var highlightedText = `<span class='${cssClass}'>${text}</span>`;
    return highlightedText;
  }
}

module.exports = VerseSearch;
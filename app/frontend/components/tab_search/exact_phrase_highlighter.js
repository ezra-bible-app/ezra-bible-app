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

const { escapeRegExp } = require('../../helpers/ezra_helper.js');

class ExactPhraseHighlighter {
  constructor(highlightFunction) {
    this.highlightFunction = highlightFunction;
  }

  highlightOccurrences(nodes, searchString, caseSensitive=false, regexOptions, wordBoundaries=false) {
    this.resetPhraseSearch(searchString);
    this.wordBoundaries = wordBoundaries;
    var allHighlightNodes = this.getHighlightNodes(nodes, searchString, caseSensitive);

    this.splittedPhrase = this.getSplittedSearchString(searchString);
    this.nextSearchTerm = this.splittedPhrase.shift();

    for (let i = 0; i < allHighlightNodes.length; i++) {
      let currentMatchList = allHighlightNodes[i];
      let currentNode = nodes[currentMatchList.node];
      let currentNodeValue = currentNode.nodeValue;

      let highlightedNodeValue = this.getHighlightedNodeValue(currentNodeValue,
                                                              currentMatchList,
                                                              caseSensitive,
                                                              regexOptions);
      let highlightedNode = document.createElement("span");
      highlightedNode.innerHTML = highlightedNodeValue;
      currentNode.replaceWith(highlightedNode);
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

  getSplittedSearchString(searchString) {
    // We cannot work with white space on either side of the search string.
    // Therefore we first trim the search string.
    searchString = searchString.trim();
    let splittedSearchString = searchString.split(" ");
    const specialCharacters = ".,;:!?“”\"'";

    for (let i = 0; i < specialCharacters.length; i++) {
      let specialChar = specialCharacters[i];
      splittedSearchString.forEach((searchTerm, i) => {
        if (searchTerm.length > 1 && searchTerm.indexOf(specialChar) != -1) {
          splittedSearchString[i] = splittedSearchString[i].replace(specialChar, "");
          splittedSearchString.splice(i + 1, 0, specialChar);
        }
      });
    }

    return splittedSearchString;
  }

  processMatch(nodeIndex, resultIndex) {
    this.foundNodeCounter += 1;
    let expectedNewResultIndex = resultIndex + this.nextSearchTerm.length;

    let matchExisting = false;

    for (let j = 0; j < this.highlightNodes.length; j++) {
      let currentMatch = this.highlightNodes[j];

      if (currentMatch.node == nodeIndex) {
        currentMatch.matches.push({
          term: this.nextSearchTerm,
          index: resultIndex
        });
        matchExisting = true;
        break;
      }
    }

    if (!matchExisting) {
      let match = {
        node: nodeIndex,
        matches: [{
          term: this.nextSearchTerm,
          index: resultIndex
        }]
      };

      this.highlightNodes.push(match);
    }

    return expectedNewResultIndex;
  }

  updateHighlightsInCurrentNode(currentNodeValue, searchString, nodeIndex) {
    this.initialFoundNodeCounter = this.foundNodeCounter;
    this.currentNodeIterations = 0;

    var continueSearchInCurrentNode = true;
    var expectedNewResultIndex = -1;
    var matchExpected = false;
    var charactersLeft = currentNodeValue.length;

    const MAX_NODE_ITERATIONS = 20;

    while (continueSearchInCurrentNode && this.currentNodeIterations < MAX_NODE_ITERATIONS) {
      // If the characters left are less then our search term we reset the search
      if (currentNodeValue != '' && charactersLeft < this.nextSearchTerm.length) {
        this.resetPhraseSearch(searchString);
        matchExpected = false;
        break;
      } else if (this.currentNodeIterations == 0 && this.foundNodeCounter > 0 && currentNodeValue.trim().length > 0) {
        matchExpected = true;
        expectedNewResultIndex = 0;
      } else if (this.currentNodeIterations > 0 && this.foundNodeCounter > this.initialFoundNodeCounter) {
        matchExpected = true;
      }

      let resultIndex = -1;

      if (expectedNewResultIndex == -1) {
        resultIndex = currentNodeValue.indexOf(this.nextSearchTerm);
      } else {
        resultIndex = currentNodeValue.indexOf(this.nextSearchTerm, expectedNewResultIndex);
      }

      if ((resultIndex != -1 && expectedNewResultIndex == -1) ||
          (resultIndex != -1 && expectedNewResultIndex >= 0 &&
            resultIndex >= expectedNewResultIndex && 
            ((matchExpected && resultIndex <= expectedNewResultIndex + 2) || !matchExpected))) {

        // Apply word boundary check if enabled
        let validMatch = true;
        if (this.wordBoundaries) {
          const prevChar = resultIndex > 0 ? currentNodeValue[resultIndex - 1] : null;
          const nextChar = resultIndex + this.nextSearchTerm.length < currentNodeValue.length ? 
                          currentNodeValue[resultIndex + this.nextSearchTerm.length] : null;
                          
          const nonWordChars = /[\s.,;:!?()[\]{}|<>"'\/\\-]/;
          const prevIsBoundary = !prevChar || nonWordChars.test(prevChar);
          const nextIsBoundary = !nextChar || nonWordChars.test(nextChar);
          
          validMatch = prevIsBoundary && nextIsBoundary;
        }

        if (validMatch) {
          expectedNewResultIndex = this.processMatch(nodeIndex, resultIndex);
          
          this.nextSearchTerm = this.splittedPhrase.shift();
          if (this.nextSearchTerm == undefined) {
            break;
          }
        } else {
          // Skip this match and keep searching
          expectedNewResultIndex = resultIndex + this.nextSearchTerm.length;
        }

      } else {
        // Reset the search if we have multiple terms and there is a break between the first match and the current node
        if (matchExpected ||
            (currentNodeValue.trim() != '' &&
            this.currentNodeIterations == 0 &&
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

      this.currentNodeIterations++;
    }
  }

  getHighlightNodes(nodes, searchString, caseSensitive) {
    var allHighlightNodes = [];

    for (let i = 0; i < nodes.length; i++) {
      let currentNode = nodes[i];
      let currentNodeValue = currentNode.nodeValue.trim();

      if (!caseSensitive) {
        currentNodeValue = currentNodeValue.toLowerCase();
      }
      
      this.updateHighlightsInCurrentNode(currentNodeValue, searchString, i);

      if (this.nextSearchTerm == undefined) {
        if (this.highlightNodes.length > 0) {
          allHighlightNodes = allHighlightNodes.concat(this.highlightNodes);
        }

        this.resetPhraseSearch(searchString);
      }
    }

    return allHighlightNodes;
  }

  getHighlightedNodeValue(currentNodeValue, currentMatchList, caseSensitive, regexOptions) {
    var highlightedNodeValue = currentNodeValue;
    var extraOffset = 0;

    for (let j = 0; j < currentMatchList.matches.length; j++) {
      let currentMatch = currentMatchList.matches[j];
      let term = escapeRegExp(currentMatch.term);
      
      // Use word boundaries if this highlighter was initialized with them
      if (this.wordBoundaries) {
        term = '\\b' + term + '\\b';
      }
      
      let regexSearchString = new RegExp(term, regexOptions);
      // eslint-disable-next-line no-unused-vars
      highlightedNodeValue = highlightedNodeValue.replace(regexSearchString, (match, offset, string) => {
        let expectedOffset = currentMatch.index + extraOffset;

        if (offset >= expectedOffset && offset <= expectedOffset + 1) {          
          let isFirstTerm = false;
          if (caseSensitive) {
            isFirstTerm = (match == this.firstTerm);
          } else {
            isFirstTerm = (match.toLowerCase() == this.firstTerm.toLowerCase());
          }

          let hlText = this.highlightFunction(match, isFirstTerm);
          extraOffset += (hlText.length - match.length);
          return hlText;
        } else {
          return match;
        }
      });
    }

    return highlightedNodeValue;
  }
}

module.exports = ExactPhraseHighlighter;
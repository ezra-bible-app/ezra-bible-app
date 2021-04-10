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

class ExactPhraseHighlighter {
  constructor(highlightFunction) {
    this.highlightFunction = highlightFunction;
  }

  highlightOccurrances(nodes, searchString, caseSensitive=false, regexOptions) {
    this.resetPhraseSearch(searchString);
    var allHighlightNodes = this.getHighlightNodes(nodes, searchString, caseSensitive);

    this.splittedPhrase = this.getSplittedSearchString(searchString);
    this.nextSearchTerm = this.splittedPhrase.shift();

    for (var i = 0; i < allHighlightNodes.length; i++) {
      var currentMatchList = allHighlightNodes[i];
      var currentNode = nodes[currentMatchList.node];
      var currentNodeValue = currentNode.nodeValue;

      var highlightedNodeValue = this.getHighlightedNodeValue(currentNodeValue,
                                                              currentMatchList,
                                                              caseSensitive,
                                                              regexOptions);
      var highlightedNode = document.createElement("span");
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

  processMatch(nodeIndex, resultIndex) {
    this.foundNodeCounter += 1;
    var expectedNewResultIndex = resultIndex + this.nextSearchTerm.length;

    var matchExisting = false;

    for (var j = 0; j < this.highlightNodes.length; j++) {
      var currentMatch = this.highlightNodes[j];

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
      var match = {
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

    while (continueSearchInCurrentNode) {
      // If the characters left are less then our search term we reset the search
      if (currentNodeValue != "" && charactersLeft < this.nextSearchTerm.length) {
        this.resetPhraseSearch(searchString);
        matchExpected = false;
        break;
      } else if (this.currentNodeIterations == 0 && this.foundNodeCounter > 0 && currentNodeValue.trim().length > 0) {
        matchExpected = true;
        expectedNewResultIndex = 0;
      } else if (this.currentNodeIterations > 0 && this.foundNodeCounter > this.initialFoundNodeCounter) {
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

        expectedNewResultIndex = this.processMatch(nodeIndex, resultIndex);
        
        this.nextSearchTerm = this.splittedPhrase.shift();
        if (this.nextSearchTerm == undefined) {
          break;
        }

      } else {
        // Reset the search if we have multiple terms and there is a break between the first match and the current node
        if (matchExpected ||
            (currentNodeValue.trim() != "" &&
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

    for (var i = 0; i < nodes.length; i++) {
      var currentNode = nodes[i];
      var currentNodeValue = currentNode.nodeValue.trim();

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

    for (var j = 0; j < currentMatchList.matches.length; j++) {
      var currentMatch = currentMatchList.matches[j];
      var term = escapeRegExp(currentMatch.term);
      var regexSearchString = new RegExp(term, regexOptions);
      highlightedNodeValue = highlightedNodeValue.replace(regexSearchString, (match, offset, string) => {
        var expectedOffset = currentMatch.index + extraOffset;

        if (offset >= expectedOffset && offset <= expectedOffset + 1) {          
          var isFirstTerm = false;
          if (caseSensitive) {
            isFirstTerm = (match == this.firstTerm);
          } else {
            isFirstTerm = (match.toLowerCase() == this.firstTerm.toLowerCase());
          }

          var hlText = this.highlightFunction(match, isFirstTerm);
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
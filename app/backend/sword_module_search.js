/* This file is part of ezra-bible-app.

   Copyright (C) 2019 - 2025 Tobias Klein <contact@tklein.info>

   ezra-bible-app is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   ezra-bible-app is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of 
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
   See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with ezra-bible-app. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const PlatformHelper = require('../lib/platform_helper.js');
const platformHelper = new PlatformHelper();

var DEBUG = false;
var nsi = null;

/**
 * Sets the NSI object.
 */
module.exports.setNSI = function(nsiObject) {
  nsi = nsiObject;
};

/**
 * Searches the whole Bible for a given term using the provided compressed search index file and returns the list of verses that match the term.
 *
 * @param {String} module - The module code of the SWORD module.
 * @param {String} searchType - The type of search to perform. Options: phrase, multiWord
 * @param {String} term - The term to search for.
 * @param {Boolean} caseSensitive - Whether the search is case sensitive.
 * @param {Boolean} exactWordBoundaries - Whether to use exact word boundaries.
 * @param {String} indexFilePath - The path to the compressed search index file.
 * @param {Function} progressCB - Optional callback function that provides progress information.
 * @return {VerseObject[]} An array of verse objects that match the term.
 */
module.exports.searchBibleForTerm = function(module, searchType, term, caseSensitive=false, exactWordBoundaries=true, indexFilePath=null, progressCB=undefined) {
  if (typeof term !== 'string') {
    console.error('The term parameter must be a string');
    return;
  }

  if (searchType !== 'phrase' && searchType !== 'multiWord') {
    console.error('Unsupported search type');
    return;
  }

  if (nsi === null) {
    console.error('NSI object not set');
    return;
  }

  if (DEBUG) console.log(`Searching for term: "${term}" in module: "${module}" with search type "${searchType}"`);

  nsi.disableMarkup();

  let searchIndex = null;

  // Generate the index file if indexFilePath is null
  if (indexFilePath === null) {
    let userDataPath = platformHelper.getUserDataPath();

    indexFilePath = path.join(userDataPath, 'module_search_index');

    if (DEBUG) console.log(`Index file path: ${indexFilePath}`);
    
    if (!fs.existsSync(indexFilePath)) {
      if (DEBUG) console.log('Creating index directory...');
      fs.mkdirSync(indexFilePath, { recursive: true });
    }

    indexFilePath = path.join(indexFilePath, `${module}.index.gz`);

    if (fs.existsSync(indexFilePath)) {
      if (DEBUG) console.log(`Reading search index from file: ${indexFilePath}`);
      const compressedIndex = fs.readFileSync(indexFilePath);
      searchIndex = JSON.parse(zlib.gunzipSync(compressedIndex));
    } else {
      if (DEBUG) console.log('Generating search index...');
      searchIndex = this.generateSearchIndex(module, indexFilePath);
    }
  } else {
    // Read and decompress the search index from the file
    if (DEBUG) console.log(`Reading search index from file: ${indexFilePath}`);
    const compressedIndex = fs.readFileSync(indexFilePath);
    searchIndex = JSON.parse(zlib.gunzipSync(compressedIndex));
  }

  if (DEBUG) console.log('Search index loaded.');

  let matchingReferences = [];
  let words = term.split(/\s+/);
  let lowerCaseWords = words.map((word) => word.toLowerCase());

  if (exactWordBoundaries) {
    let firstWord = lowerCaseWords[0];

    if (searchIndex[firstWord]) {
      if (DEBUG) console.log(`Found matches for word: "${firstWord}"`);
      matchingReferences = matchingReferences.concat(searchIndex[firstWord]);
    } else {
      if (DEBUG) console.log(`No matches found for word: "${firstWord}"`);
    }
  } else {
    for (const [key, references] of Object.entries(searchIndex)) {
      for (const word of lowerCaseWords) {
        if (key.includes(word)) {
          if (DEBUG) console.log(`Found partial matches for word: "${word}" in key: "${key}"`);
          matchingReferences = matchingReferences.concat(references);
          break;
        }
      }
    }
  }

  // Remove duplicates
  matchingReferences = [...new Set(matchingReferences)];

  if (DEBUG) console.log(`Total matching references found: ${matchingReferences.length}`);

  // Get matching verses
  const matchingVerses = nsi.getVersesFromReferences(module, matchingReferences);

  if (DEBUG) console.log(`Total matching verses found: ${matchingVerses.length}`);

  // Generate a list of references that contain the exact term
  const totalVerses = matchingVerses.length;
  let lastPercentage = 0;
  let exactMatchingReferences = [];

  // Iterate over the matching verses and 
  // check if the term is contained in the verse content
  matchingVerses.forEach((verse, index) => {
    if (progressCB) {
      const percentage = Math.round(((index + 1) / totalVerses) * 100);
      if (percentage % 10 === 0 && percentage !== lastPercentage) {
        progressCB({
          totalPercent: percentage,
          message: ''
        });

        lastPercentage = percentage;
        // Insert a 50ms waiting time
        const waitUntil = Date.now() + 50;
        while (Date.now() < waitUntil);
      }
    }

    const verseContent = caseSensitive ? verse.content : verse.content.toLowerCase();
    const searchTerm = caseSensitive ? term : term.toLowerCase();

    if (!caseSensitive) {
      words = lowerCaseWords;
    }

    if (searchType === 'phrase') {
      if (verseContent.includes(searchTerm)) {
        let reference = `${verse.bibleBookShortTitle}.${verse.chapter}.${verse.verseNr}`;
        exactMatchingReferences.push(reference);
      }
    } else if (searchType === 'multiWord') {
      let allWordsMatch = true;
      for (const word of words) {
        if (!verseContent.includes(word)) {
          allWordsMatch = false;
          break;
        }
      }

      if (allWordsMatch) {
        let reference = `${verse.bibleBookShortTitle}.${verse.chapter}.${verse.verseNr}`;
        exactMatchingReferences.push(reference);
      }
    }
  });

  if (DEBUG) console.log(`Total exact matching references found: ${exactMatchingReferences.length}`);

  nsi.enableMarkup();

  // Retrieve the corresponding verses based on the exact matching references
  const results = nsi.getVersesFromReferences(module, exactMatchingReferences);

  if (DEBUG) console.log(`Total results found: ${results.length}`);

  return results;
};

/**
 * Generates a search index for the entire Bible and stores it in a compressed file.
 *
 * @param {String} moduleCode - The module code of the SWORD module.
 * @return {Object} A search index object where keys are phrases and values are arrays of references.
 */
module.exports.generateSearchIndex = function(moduleCode, indexPath=null) {
  const books = nsi.getBookList(moduleCode);
  let searchIndex = {};

  for (const book of books) {
    const chapterCount = nsi.getBookChapterCount(moduleCode, book);

    for (let chapter = 1; chapter <= chapterCount; chapter++) {
      const verses = nsi.getChapterText(moduleCode, book, chapter);

      for (const verse of verses) {
        // Remove portions framed by tags
        const cleanedContent = verse.content.replace(/<[^>]*>.*?<\/[^>]*>/g, '');

        const words = cleanedContent.split(/\s+/);

        for (const word of words) {
          // Remove non-alphanumeric characters and convert to lowercase
          const cleanedWord = word.replaceAll(/[,;.:'´‘’"“”?!]/g, '').toLowerCase();

          if (!searchIndex[cleanedWord]) {
            searchIndex[cleanedWord] = [];
          }

          searchIndex[cleanedWord].push(`${book}.${chapter}.${verse.verseNr}`);
        }
      }
    }
  }

  // Compress and store the search index in a file
  if (indexPath === null) {
    indexPath = `${moduleCode}.index.gz`;
  }

  const compressedIndex = zlib.gzipSync(JSON.stringify(searchIndex));
  fs.writeFileSync(indexPath, compressedIndex);

  return searchIndex;
};

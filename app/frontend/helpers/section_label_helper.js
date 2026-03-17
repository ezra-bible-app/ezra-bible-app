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

const VerseBox = require("../ui_models/verse_box.js");
const i18nHelper = require('./i18n_helper.js');
const VerseReferenceHelper = require("./verse_reference_helper.js");
var verseReferenceHelper = null;

module.exports.initHelper = function(nsi) {
  verseReferenceHelper = new VerseReferenceHelper(nsi);
};

module.exports.getVerseDisplayText = async function(selectedBooks,
                                                    selectedVerseBoxElements,
                                                    returnAsArray=false,
                                                    useShortBookTitles=false,
                                                    referenceSeparator=undefined,
                                                    getBibleBookFunction=getBibleBookShortTitleFromVerseBox,
                                                    getVerseReferenceFunction=getVerseReference) {
  let selectedVerseContent = [];

  for (let i = 0; i < selectedBooks.length; i++) {
    let currentBookShortName = selectedBooks[i];
    let currentBookVerseReferences = this.getBookVerseReferences(currentBookShortName,
                                                                 selectedVerseBoxElements,
                                                                 getBibleBookFunction,
                                                                 getVerseReferenceFunction);
    
    let formattedVerseList = await this.formatVerseList(currentBookVerseReferences, currentBookShortName, referenceSeparator);
    let currentBookName = await (useShortBookTitles ? currentBookShortName : ipcDb.getBookTitleTranslation(currentBookShortName));

    if (currentBookShortName == 'Ps' && !useShortBookTitles) {
      currentBookName = await i18nHelper.getPsalmTranslation();
    }

    let currentBookVerseReferenceDisplay = currentBookName + ' ' + formattedVerseList;
    selectedVerseContent.push(currentBookVerseReferenceDisplay);
  }

  if (selectedVerseContent.length > 0) {
    if (!returnAsArray) {
      selectedVerseContent = selectedVerseContent.join('; ');
    }
  } else {
    selectedVerseContent = i18n.t("tags.none-selected");

    if (returnAsArray) {
      selectedVerseContent = [ selectedVerseContent ];
    }
  }

  return selectedVerseContent;
};

module.exports.getBookVerseReferences = function(book,
                                                 selectedVerseBoxElements,
                                                 getBibleBookFunction=getBibleBookShortTitleFromVerseBox,
                                                 getVerseReferenceFunction=getVerseReference) {
  let currentBookVerseReferences = [];
  
  for (let i = 0; i < selectedVerseBoxElements.length; i++) {
    let currentVerseBox = selectedVerseBoxElements[i];
    let currentVerseBibleBookShortName = getBibleBookFunction(currentVerseBox);

    if (currentVerseBibleBookShortName == book) {
      let currentVerseReference = getVerseReferenceFunction(currentVerseBox);
      currentBookVerseReferences.push(currentVerseReference);
    }
  }

  return currentBookVerseReferences;
};

function getVerseReference(verseBox) {
  let verseReference = getVerseReferenceFromAnchor($(verseBox).find('a:first').attr('name'));
  return verseReference;
}

function getVerseReferenceFromAnchor(anchorText) {
  let splittedVerseReference = anchorText.split(" ");
  let currentVerseReference = splittedVerseReference[splittedVerseReference.length - 1];
  return currentVerseReference;
}

function getBibleBookShortTitleFromVerseBox(verseBox) {
  return new VerseBox(verseBox).getBibleBookShortTitle();
}

module.exports.verseListHasGaps = function(list) {
  let hasGaps = false;

  for (let i = 1; i < list.length; i++) {
    if ((list[i] - list[i-1]) > 1) {
      hasGaps = true;
      break;
    }
  }

  return hasGaps;
};

async function formatSingleVerseBlock(list, start_index, end_index, bookId=undefined, referenceSeparator=undefined) {
  if (bookId == undefined) {
    bookId = app_controller.tab_controller.getTab().getBook();
  }

  if (start_index > (list.length - 1)) start_index = list.length - 1;
  if (end_index > (list.length - 1)) end_index = list.length - 1;

  let start_reference = list[start_index];
  let end_reference = list[end_index];

  let formatted_passage = "";

  if (start_reference != undefined && end_reference != undefined) {
    formatted_passage = await formatPassageReference(bookId,
                                                     start_reference,
                                                     end_reference,
                                                     referenceSeparator);
  }

  return formatted_passage;
}

module.exports.verseReferenceListToAbsoluteVerseNrList = async function(list, bookId=undefined) {
  if (verseReferenceHelper == null) {
    return [];
  }

  let new_list = new Array;
  let translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  
  if (bookId == undefined) {
    bookId = app_controller.tab_controller.getTab().getBook();
  }

  for (let i = 0; i < list.length; i++) {
    let absoluteVerseNr = await verseReferenceHelper.referenceStringToAbsoluteVerseNr(translationId, bookId, list[i], false, ':');
    new_list.push(Number(absoluteVerseNr));
  }

  return new_list;
};

module.exports.formatVerseList = async function(selected_verse_array, bookId=undefined, referenceSeparator=undefined) {
  const absolute_nr_list = await this.verseReferenceListToAbsoluteVerseNrList(selected_verse_array, bookId);
  let verse_list_for_view = "";

  if (selected_verse_array.length > 0) {
    if (this.verseListHasGaps(absolute_nr_list)) {
      let current_start_index = 0;

      for (let i = 0; i < absolute_nr_list.length; i++) {
        if (absolute_nr_list[i] - absolute_nr_list[i-1] > 1) {

          let current_end_index = i - 1;
          
          verse_list_for_view += await formatSingleVerseBlock(selected_verse_array,
                                                              current_start_index,
                                                              current_end_index,
                                                              bookId,
                                                              referenceSeparator);

          verse_list_for_view += "; ";

          if (i == (absolute_nr_list.length - 1)) {
            verse_list_for_view += await formatSingleVerseBlock(selected_verse_array,
                                                                i,
                                                                i,
                                                                bookId,
                                                                referenceSeparator);
          }

          current_start_index = i;
        } else {
          if (i == (absolute_nr_list.length - 1)) {
            verse_list_for_view += await formatSingleVerseBlock(selected_verse_array,
                                                                current_start_index,
                                                                i,
                                                                bookId,
                                                                referenceSeparator);
          }
        }
      }
    } else { // verse_list doesn't have gaps!
      verse_list_for_view += await formatSingleVerseBlock(selected_verse_array,
                                                          0,
                                                          selected_verse_array.length - 1,
                                                          bookId,
                                                          referenceSeparator);
    }
  }

  return verse_list_for_view;
};

async function formatPassageReference(book_short_title, start_reference, end_reference, reference_separator=undefined) {
  let bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

  if (reference_separator == null) {
    reference_separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
  }

  let start_chapter = parseInt(start_reference.split(reference_separator)[0]);
  let start_verse = parseInt(start_reference.split(reference_separator)[1]);
  let end_chapter = parseInt(end_reference.split(reference_separator)[0]);
  let end_verse = parseInt(end_reference.split(reference_separator)[1]);

  let passage = start_chapter + window.reference_separator + start_verse;
  let endChapterVerseCount = await ipcNsi.getChapterVerseCount(bibleTranslationId, book_short_title, end_chapter);

  if (book_short_title != null &&
      start_verse == 1 &&
      end_verse == endChapterVerseCount) {

    /* Whole chapter sections */
    
    if (start_chapter == end_chapter) {
      passage = 'Chap. ' + start_chapter;
    } else {
      passage = 'Chaps. ' + start_chapter + ' - ' + end_chapter;
    }

  } else {

    /* Sections don't span whole chapters */

    if (start_chapter == end_chapter) {
      if (start_verse != end_verse) {
        passage += '-' + end_verse;
      }
    } else {
      passage += ' - ' + end_chapter + window.reference_separator + end_verse;
    }
  }

  return passage;
}

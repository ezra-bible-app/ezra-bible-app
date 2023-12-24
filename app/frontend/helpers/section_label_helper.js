/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2023 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

module.exports.initHelper = function(nsi) {
  this.verseReferenceHelper = new VerseReferenceHelper(nsi);
};

module.exports.getSelectedVerseDisplayText = async function(selectedBooks, selectedVerseBoxElements) {
  let selectedVerseContent = [];

  for (let i = 0; i < selectedBooks.length; i++) {
    let currentBookShortName = selectedBooks[i];
    let currentBookVerseReferences = [];
    
    for (let j = 0; j < selectedVerseBoxElements.length; j++) {
      let currentVerseBox = selectedVerseBoxElements[j];

      let currentVerseBibleBookShortName = new VerseBox(currentVerseBox).getBibleBookShortTitle();

      if (currentVerseBibleBookShortName == currentBookShortName) {
        let currentVerseReference = this.getVerseReferenceFromAnchor($(currentVerseBox).find('a:first').attr('name'));
        currentBookVerseReferences.push(currentVerseReference);
      }
    }

    let formattedVerseList = await this.formatVerseList(currentBookVerseReferences, false, currentBookShortName);
    let currentBookName = await (currentBookShortName == 'Ps' ? i18nHelper.getPsalmTranslation() : ipcDb.getBookTitleTranslation(currentBookShortName));
    let currentBookVerseReferenceDisplay = currentBookName + ' ' + formattedVerseList;
    selectedVerseContent.push(currentBookVerseReferenceDisplay);
  }

  if (selectedVerseContent.length > 0) {
    return selectedVerseContent.join('; ');
  } else {
    return i18n.t("tags.none-selected");
  }
};

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

module.exports.formatSingleVerseBlock = async function(list, start_index, end_index, turn_into_link, bookId=undefined) {
  if (bookId == undefined) {
    bookId = app_controller.tab_controller.getTab().getBook();
  }

  if (start_index > (list.length - 1)) start_index = list.length - 1;
  if (end_index > (list.length - 1)) end_index = list.length - 1;

  let start_reference = list[start_index];
  let end_reference = list[end_index];

  let formatted_passage = "";

  if (start_reference != undefined && end_reference != undefined) {
    formatted_passage = await this.formatPassageReference(bookId,
                                                          start_reference,
                                                          end_reference,
                                                          ':');

    /*if (turn_into_link) {
      formatted_passage = "<a href=\"javascript:app_controller.jumpToReference('" + start_reference + "', true);\">" + formatted_passage + "</a>";
    }*/
  }

  return formatted_passage;
};

module.exports.verseReferenceListToAbsoluteVerseNrList = async function(list, bookId=undefined) {
  if (this.verseReferenceHelper == null) {
    return [];
  }

  let new_list = new Array;
  let translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  
  if (bookId == undefined) {
    bookId = app_controller.tab_controller.getTab().getBook();
  }

  for (let i = 0; i < list.length; i++) {
    let absoluteVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(translationId, bookId, list[i], false, ':');
    new_list.push(Number(absoluteVerseNr));
  }

  return new_list;
};

module.exports.formatVerseList = async function(selected_verse_array, link_references, bookId=undefined) {
  const absolute_nr_list = await this.verseReferenceListToAbsoluteVerseNrList(selected_verse_array, bookId);
  let verse_list_for_view = "";

  if (selected_verse_array.length > 0) {
    if (this.verseListHasGaps(absolute_nr_list)) {
      let current_start_index = 0;

      for (let i = 0; i < absolute_nr_list.length; i++) {
        if (absolute_nr_list[i] - absolute_nr_list[i-1] > 1) {

          let current_end_index = i - 1;
          
          verse_list_for_view += await this.formatSingleVerseBlock(selected_verse_array,
                                                                   current_start_index,
                                                                   current_end_index,
                                                                   link_references,
                                                                   bookId);

          verse_list_for_view += "; ";

          if (i == (absolute_nr_list.length - 1)) {
            verse_list_for_view += await this.formatSingleVerseBlock(selected_verse_array,
                                                                     i,
                                                                     i,
                                                                     link_references,
                                                                     bookId);
          }

          current_start_index = i;
        } else {
          if (i == (absolute_nr_list.length - 1)) {
            verse_list_for_view += await this.formatSingleVerseBlock(selected_verse_array,
                                                                     current_start_index,
                                                                     i,
                                                                     link_references,
                                                                     bookId);
          }
        }
      }
    } else { // verse_list doesn't have gaps!
      verse_list_for_view += await this.formatSingleVerseBlock(selected_verse_array,
                                                               0,
                                                               selected_verse_array.length - 1,
                                                               link_references,
                                                               bookId);
    }
  }

  return verse_list_for_view;
};

module.exports.formatPassageReference = async function(book_short_title, start_reference, end_reference, reference_separator=undefined) {
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
};

module.exports.getVerseReferenceFromAnchor = function(anchorText) {
  let splittedVerseReference = anchorText.split(" ");
  let currentVerseReference = splittedVerseReference[splittedVerseReference.length - 1];
  return currentVerseReference;
};

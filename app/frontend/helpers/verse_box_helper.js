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

const VerseBox = require("../ui_models/verse_box.js");

class VerseBoxHelper {
  constructor() {}

  // FIXME: Replace this with the function from VerseBox
  getVerseReferenceId(verseBox) {
    var classList = $(verseBox)[0].classList;
    var verseReferenceId = null;

    for (var i = 0; i < classList.length; i++) {
      if (classList[i].indexOf('verse-reference-id') != -1) {
        verseReferenceId = classList[i];
        break;
      }
    }

    return verseReferenceId;
  }

  getBookListFromVerseBoxes(verseBoxes) {
    var bookList = [];
    verseBoxes.forEach((verseBox) => {
      var verseBibleBook = new VerseBox(verseBox).getBibleBookShortTitle();

      if (!bookList.includes(verseBibleBook)) {
        bookList.push(verseBibleBook);
      }
    });

    return bookList;
  }

  getBibleBookShortTitleFromElement(element) {
    var bibleBookShortTitle = null;

    if (element != null) {
      if (element.classList.contains('book-notes')) {
        bibleBookShortTitle = element.getAttribute('verse-reference-id');
        bibleBookShortTitle =  bibleBookShortTitle[0].toUpperCase() + bibleBookShortTitle.substring(1);
      } else {
        bibleBookShortTitle = new VerseBox(element).getBibleBookShortTitle();
      }
    }

    return bibleBookShortTitle;
  }

  getSectionTitleFromVerseBox(verseBox) {
    var absoluteVerseNumber = parseInt(verseBox.getAttribute('abs-verse-nr'));
    var currentElement = verseBox;
    var sectionTitle = null;

    for (var i = absoluteVerseNumber; i >= 1; i--) {
      currentElement = currentElement.previousElementSibling;

      if (currentElement == null) {
        break;
      }

      if (currentElement.classList.contains('sword-section-title') && 
          currentElement.getAttribute('subtype') != 'x-Chapter' &&
          currentElement.getAttribute('type') != 'psalm' &&
          currentElement.getAttribute('type') != 'chapter' &&
          currentElement.getAttribute('type') != 'scope' &&
          currentElement.getAttribute('type') != 'acrostic'
      ) {
        sectionTitle = currentElement.innerText;
        break;
      }
    }

    return sectionTitle;
  }

  async iterateAndChangeAllDuplicateVerseBoxes(referenceVerseBoxElement, context, changeCallback) {
    if (referenceVerseBoxElement == null) {
      return;
    }

    var current_tab_index = app_controller.tab_controller.getSelectedTabIndex();
    var tab_count = app_controller.tab_controller.getTabCount();

    var bibleBook = this.getBibleBookShortTitleFromElement(referenceVerseBoxElement);
    var absoluteVerseNumber = null;
    var chapter = null;
    var verseNumber = null;
    var absoluteVerseNrs = null;

    if (referenceVerseBoxElement.classList.contains('book-notes')) {
      absoluteVerseNumber = 0;
      chapter = 0;
      verseNumber = 0;

      absoluteVerseNrs = {};
      absoluteVerseNrs['absoluteVerseNrEng'] = 0;
      absoluteVerseNrs['absoluteVerseNrHeb'] = 0;
    } else {
      var referenceVerseBox = new VerseBox(referenceVerseBoxElement);
      absoluteVerseNumber = referenceVerseBox.getAbsoluteVerseNumber();
      chapter = referenceVerseBox.getChapter();
      verseNumber = referenceVerseBox.getVerseNumber();

      absoluteVerseNrs = await ipcDb.getAbsoluteVerseNumbersFromReference(source_versification,
                                                                          bibleBook,
                                                                          absoluteVerseNumber,
                                                                          chapter,
                                                                          verseNumber);
    }


    var referenceBibleBook = await ipcDb.getBibleBook(bibleBook);

    var source_tab_translation = app_controller.tab_controller.getTab(current_tab_index).getBibleTranslationId();
    var source_versification = 'ENGLISH';
    try {
      await app_controller.translation_controller.getVersification(source_tab_translation);
    } catch (exception) {
      console.warn('Got exception when getting versification: ' + exception);
    }

    for (var i = 0; i < tab_count; i++) {
      if (i != current_tab_index) {
        var current_tab_translation = app_controller.tab_controller.getTab(i).getBibleTranslationId();
        var current_versification = await app_controller.translation_controller.getVersification(current_tab_translation);
        var current_target_verse_nr = "";

        if (current_versification == 'HEBREW') {
          current_target_verse_nr = absoluteVerseNrs.absoluteVerseNrHeb;
        } else {
          current_target_verse_nr = absoluteVerseNrs.absoluteVerseNrEng;
        }

        var target_verse_list_frame = app_controller.getCurrentVerseListFrame(i);
        var target_verse_box = target_verse_list_frame[0].querySelectorAll('.verse-nr-' + current_target_verse_nr);

        // There are potentially multiple verse boxes returned (could be the case for a tagged verse list or a search results list)
        // Therefore we have to go through all of them and check for each of them whether the book is matching our reference book
        for (var j = 0; j < target_verse_box.length; j++) {
          var specific_target_verse_box = target_verse_box[j];
          var target_verse_box_bible_book_short_title = this.getBibleBookShortTitleFromElement(specific_target_verse_box);
          var targetBibleBook = await ipcDb.getBibleBook(target_verse_box_bible_book_short_title);

          if (targetBibleBook != null && referenceBibleBook != null) {
            if (targetBibleBook.id == referenceBibleBook.id) {
              changeCallback(context, specific_target_verse_box);
            }
          }
        }
      }
    }
  }

  // FIXME: Move this to VerseBox
  async getLocalizedVerseReference(verseBoxElement) {
    var verseBox = new VerseBox(verseBoxElement);
    var currentBookCode = verseBox.getBibleBookShortTitle();
    var currentBookName = await ipcDb.getBookLongTitle(currentBookCode);
    var currentBookLocalizedName = await i18nHelper.getSwordTranslation(currentBookName);
    var verseReferenceContent = verseBoxElement.querySelector('.verse-reference-content').innerText;

    var localizedReference = currentBookLocalizedName + ' ' + verseReferenceContent;
    return localizedReference;
  }
}

module.exports = VerseBoxHelper;
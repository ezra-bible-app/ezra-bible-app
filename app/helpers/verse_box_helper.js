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


class VerseBoxHelper {
  constructor() {
    
  }

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
      var verseBibleBook = $(verseBox).find('.verse-bible-book-short').text();

      if (!bookList.includes(verseBibleBook)) {
        bookList.push(verseBibleBook);
      }
    });

    return bookList;
  }

  async iterateAndChangeAllDuplicateVerseBoxes(referenceVerseBox, context, changeCallback) {
    var current_tab_index = bible_browser_controller.tab_controller.getSelectedTabIndex();
    var tab_count = bible_browser_controller.tab_controller.getTabCount();

    var bibleBook = referenceVerseBox.find('.verse-bible-book-short').text();
    var referenceBibleBook = await models.BibleBook.findOne({ where: { shortTitle: bibleBook } });
    var absoluteVerseNr = parseInt(referenceVerseBox.find('.abs-verse-nr').text());
    var verseReferenceContent = referenceVerseBox.find('.verse-reference-content').text();
    var chapter = parseInt(verseReferenceContent.split(reference_separator)[0]);
    var verseNr = parseInt(verseReferenceContent.split(reference_separator)[1]);
    var source_tab_translation = bible_browser_controller.tab_controller.getTab(current_tab_index).getBibleTranslationId();
    var source_versification = bible_browser_controller.translation_controller.getVersification(source_tab_translation);
    var absoluteVerseNrs = models.VerseReference.getAbsoluteVerseNrs(source_versification, bibleBook, absoluteVerseNr, chapter, verseNr);

    for (var i = 0; i < tab_count; i++) {
      if (i != current_tab_index) {
        var current_tab_translation = bible_browser_controller.tab_controller.getTab(i).getBibleTranslationId();
        var current_versification = bible_browser_controller.translation_controller.getVersification(current_tab_translation);
        var current_target_verse_nr = "";

        if (current_versification == 'HEBREW') {
          current_target_verse_nr = absoluteVerseNrs.absoluteVerseNrHeb;
        } else {
          current_target_verse_nr = absoluteVerseNrs.absoluteVerseNrEng;
        }

        var target_verse_list_frame = bible_browser_controller.getCurrentVerseListFrame(i);
        var target_verse_box = target_verse_list_frame.find('.verse-nr-' + current_target_verse_nr);

        // There are potentially multiple verse boxes returned (could be the case for a tagged verse list or a search results list)
        // Therefore we have to go through all of them and check for each of them whether the book is matching our reference book
        for (var j = 0; j < target_verse_box.length; j++) {
          var specific_target_verse_box = $(target_verse_box[j]);
          var target_verse_box_bible_book_short_title = specific_target_verse_box.find('.verse-bible-book-short').text();
          var targetBibleBook = await models.BibleBook.findOne({ where: { shortTitle: target_verse_box_bible_book_short_title } });
          var target_verse_bible_book_id = targetBibleBook.id;

          if (target_verse_bible_book_id == referenceBibleBook.id) {
            changeCallback(context, specific_target_verse_box);
          }
        }
      }
    }
  }

  getLocalizedVerseReference(verseBox) {
    var currentBookCode = verseBox.find('.verse-bible-book-short').text();
    var currentBookName = models.BibleBook.getBookLongTitle(currentBookCode);
    var currentBookLocalizedName = i18nHelper.getSwordTranslation(currentBookName);
    var verseReferenceContent = verseBox.find('.verse-reference-content').text();

    var localizedReference = currentBookLocalizedName + ' ' + verseReferenceContent;
    return localizedReference;
  }
}

module.exports = VerseBoxHelper;
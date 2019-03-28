/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

class TranslationController {
  constructor() {
    this.current_bible_translation_id = '';
    this.bibleTranslationCount = 0;
    this.selectMenu = null;
  }

  init(onBibleTranslationChanged) {
    this.onBibleTranslationChanged = onBibleTranslationChanged;
  }

  updateAvailableBooks() {
    models.BibleTranslation.getBookList(this.current_bible_translation_id).then(books => {
      var book_links = $('#book-selection-menu').find('li');

      for (var i = 0; i < book_links.length; i++) {
        var current_book_link = $(book_links[i]);
        var current_link_book = current_book_link.attr('class').split(' ')[0];
        var current_book_id = current_link_book.split('-')[1];
        if (books.includes(current_book_id)) {
          current_book_link.removeClass('book-unavailable');
          current_book_link.addClass('book-available');
        } else {
          current_book_link.addClass('book-unavailable');
          current_book_link.removeClass('book-available');
        }
      }
    });
  }

  initChapterVerseCounts() {
    return models.BibleBook.getChapterVerseCounts(this.current_bible_translation_id).then(verseCountEntries => {
      var lastBook = null;

      for (var entry of verseCountEntries) {
        var currentBook = entry.shortTitle;

        if (currentBook != lastBook) {
          bible_chapter_verse_counts[currentBook] = [];
        }

        var current_chapter = entry.verseCount;
        bible_chapter_verse_counts[currentBook].push(current_chapter);

        lastBook = currentBook;
      }
    });
  }

  async loadSettings() {
    if (bible_browser_controller.settings.has('bible_translation')) {
      this.current_bible_translation_id = bible_browser_controller.settings.get('bible_translation');
    }

    var result = await models.BibleTranslation.findAndCountAll();

    if (!bible_browser_controller.settings.has('bible_translation') && result.rows.length > 0) {
      this.current_bible_translation_id = result.rows[0].id;
    }

    bible_browser_controller.translation_controller.updateAvailableBooks();
    bible_browser_controller.translation_controller.initChapterVerseCounts();
    this.bibleTranslationCount = result.count;
  }

  async initTranslationsMenu() {
    var languages = await models.BibleTranslation.getLanguages();

    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    bibleSelect.empty();

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newOptGroup = "<optgroup class='bible-select-" + currentLang + "-translations' label='" + currentLang + "'></optgroup>";
      bibleSelect.append(newOptGroup);
    }

    models.BibleTranslation.findAndCountAll().then(result => {
      console.log("Found " + result.count + " bible translations!");

      var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();

      if (result.count == 0) {
        bibleSelect.attr('disabled','disabled');
        $('.book-select-button').addClass('ui-state-disabled');
        var currentVerseList = bible_browser_controller.getCurrentVerseList();
        currentVerseList.find('.help-text').text(gettext_strings.help_text_no_translations);
      } else if (currentBook == null && bible_browser_controller.current_tag_id_list == "")  {
        $('.book-select-button').removeClass('ui-state-disabled');
        var currentVerseList = bible_browser_controller.getCurrentVerseList();
        currentVerseList.find('.help-text').text(gettext_strings.help_text_translation_available);
      }

      for (var translation of result.rows) {
        var selected = '';
        if (this.current_bible_translation_id == translation.id) {
          var selected = ' selected=\"selected\"';
        }

        var current_translation_html = "<option value='" + translation.id + "'" + selected + ">" + translation.name + "</option>"
        var optGroup = bibleSelect.find('.bible-select-' + translation.language + '-translations');
        optGroup.append(current_translation_html);
      }

      this.selectMenu = bibleSelect.selectmenu({
        change: (event) => {
          this.handleBibleTranslationChange(event);
        },
        maxHeight: 400
      });
    });
  }

  handleBibleTranslationChange(event) {
    this.current_bible_translation_id = $(this.selectMenu[0]).val();
    bible_browser_controller.settings.set('bible_translation', this.current_bible_translation_id);
    this.showBibleTranslationLoadingIndicator();
    this.updateAvailableBooks();
    this.initChapterVerseCounts();

    this.onBibleTranslationChanged();
  }

  getCurrentBibleTranslationLoadingIndicator() {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var loadingIndicator = currentVerseListMenu.find('.loader');
    return loadingIndicator;
  }

  showBibleTranslationLoadingIndicator() {
    var bibleTranslationLoadingIndicator = this.getCurrentBibleTranslationLoadingIndicator();
    bibleTranslationLoadingIndicator.show();
  }

  hideBibleTranslationLoadingIndicator() {
    var bibleTranslationLoadingIndicator = this.getCurrentBibleTranslationLoadingIndicator();
    bibleTranslationLoadingIndicator.hide();
  }
}

module.exports = TranslationController;


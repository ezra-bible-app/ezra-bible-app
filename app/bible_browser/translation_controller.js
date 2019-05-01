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

const NodeSwordInterface = require('node-sword-interface');
const ISO6391 = require('iso-639-1');

class TranslationController {
  constructor() {
    this.bibleTranslationCount = 0;
    this.nodeSwordInterface = new NodeSwordInterface();
  }

  init(onBibleTranslationChanged) {
    this.onBibleTranslationChanged = onBibleTranslationChanged;
    this.initBibleTranslationInfoButton();
  }

  updateAvailableBooks() {
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
    models.BibleTranslation.getBookList(currentBibleTranslationId).then(books => {
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
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
    return models.BibleBook.getChapterVerseCounts(currentBibleTranslationId).then(verseCountEntries => {
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
      bible_browser_controller.tab_controller.setCurrentBibleTranslationId(
        bible_browser_controller.settings.get('bible_translation')
      );
    }

    var result = await models.BibleTranslation.findAndCountAll();
    this.bibleTranslationCount = result.count;

    if (!bible_browser_controller.settings.has('bible_translation') && result.rows.length > 0) {
      bible_browser_controller.tab_controller.setCurrentBibleTranslationId(result.rows[0].id);
    }

    this.updateAvailableBooks();
    this.initChapterVerseCounts();
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
      var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList();

      if (result.count == 0) {
        bibleSelect.attr('disabled','disabled');
        $('.book-select-button').addClass('ui-state-disabled');
        var currentVerseList = bible_browser_controller.getCurrentVerseList();
        currentVerseList.find('.help-text').text(gettext_strings.help_text_no_translations);
      } else {
        $('.bible-select').removeAttr('disabled');
        $('.book-select-button').removeClass('ui-state-disabled');

        if (currentBook == null && currentTagIdList == "")  {
          var currentVerseList = bible_browser_controller.getCurrentVerseList();
          currentVerseList.find('.help-text').text(gettext_strings.help_text_translation_available);
        }
      }

      for (var translation of result.rows) {
        var selected = '';
        var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
        if (currentBibleTranslationId == translation.id) {
          var selected = ' selected=\"selected\"';
        }

        var current_translation_html = "<option value='" + translation.id + "'" + selected + ">" + translation.name + "</option>"
        var optGroup = bibleSelect.find('.bible-select-' + translation.language + '-translations');
        optGroup.append(current_translation_html);
      }

      bibleSelect.selectmenu({
        change: (event) => {
          this.handleBibleTranslationChange(event);
        },
        maxHeight: 400
      });
    });
  }

  initBibleTranslationInfoButton() {
    $('.bible-translation-info-button').unbind('click');
    $('.bible-translation-info-button').bind('click', () => {
      if (!$('.bible-translation-info-button').hasClass('ui-state-disabled')) {
        this.showBibleTranslationInfo();
      }
    });
  }

  async showBibleTranslationInfo() {
    var bibleTranslationInfo = "No info available!";

    try {
      var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
      var bibleTranslationModule = this.nodeSwordInterface.getLocalModule(currentBibleTranslationId);
      var bibleTranslationInfo = "<b>About</b><br><br>";
      bibleTranslationInfo += bibleTranslationModule.about.replace(/\\par/g, "<br>");
      var moduleSize = parseInt(bibleTranslationModule.size / 1024) + " KB";

      bibleTranslationInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey;'>";
      bibleTranslationInfo += "<b>Sword module info</b><br><br>";
      bibleTranslationInfo += "Name: " + bibleTranslationModule.name + "<br>";
      bibleTranslationInfo += "Version: " + bibleTranslationModule.version + "<br>";
      bibleTranslationInfo += "Language: " + ISO6391.getName(bibleTranslationModule.language) + "<br>";
      bibleTranslationInfo += "Strong's numbers: " + (bibleTranslationModule.hasStrongs ? "Yes" : "No") + "<br>";
      bibleTranslationInfo += "Size: " + moduleSize;
      bibleTranslationInfo += "</p>";
    } catch (ex) {
      console.error("Got exception while trying to get bible translation info: " + ex);
    }

    var currentBibleTranslationName = await bible_browser_controller.tab_controller.getCurrentBibleTranslationName();
    var offsetLeft = $(window).width() - 900;
    $('#bible-translation-info-box').dialog({
      title: currentBibleTranslationName,
      position: [offsetLeft,120]
    });
    $('#bible-translation-info-box-content').empty();
    $('#bible-translation-info-box-content').html(bibleTranslationInfo);
    $('#bible-translation-info-box').dialog("open");
  }

  async handleBibleTranslationChange(event) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    bible_browser_controller.tab_controller.setCurrentBibleTranslationId(bibleSelect[0].value);
    bible_browser_controller.settings.set('bible_translation', bibleSelect[0].value);
    
    if (!bible_browser_controller.tab_controller.isCurrentTabEmpty()) {
      this.showBibleTranslationLoadingIndicator();
    }

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


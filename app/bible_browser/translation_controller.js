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

class TranslationController {
  constructor() {
    this.bibleTranslationCount = 0;
    this.nodeSwordInterface = new NodeSwordInterface();
    this.languageMapper = new LanguageMapper();
  }


  sleep(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }

  init(onBibleTranslationChanged) {
    this.onBibleTranslationChanged = onBibleTranslationChanged;
    this.initBibleTranslationInfoButton();
  }

  updateAvailableBooks(tabIndex=undefined) {
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tabIndex);
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
    this.updateAvailableBooks();
    this.initChapterVerseCounts();
  }

  getBibleSelect(tabIndex) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    return bibleSelect;
  }

  async addLanguageGroupsToBibleSelectMenu(tabIndex) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var languages = await models.BibleTranslation.getLanguages();

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newOptGroup = "<optgroup class='bible-select-" + currentLang.languageCode + "-translations' label='" + currentLang.languageName + "'></optgroup>";
      bibleSelect.append(newOptGroup);
    }
  }

  updateUiBasedOnNumberOfTranslations(tabIndex, count) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook(tabIndex);
    var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList(tabIndex);

    if (count == 0) {
      bibleSelect.attr('disabled','disabled');
      $('.book-select-button').addClass('ui-state-disabled');
      var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
      currentVerseList.find('.help-text').text(gettext_strings.help_text_no_translations);
    } else {
      $('.bible-select').removeAttr('disabled');
      $('.book-select-button').removeClass('ui-state-disabled');

      if (currentBook == null && currentTagIdList == "")  {
        var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
        currentVerseList.find('.help-text').text(gettext_strings.help_text_translation_available);
      }
    }
  }

  addTranslationsToBibleSelectMenu(tabIndex, dbResult) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tabIndex);

    for (var translation of dbResult.rows) {
      var selected = '';
      if (currentBibleTranslationId == translation.id) {
        var selected = ' selected=\"selected\"';
      }

      var current_translation_html = "<option value='" + translation.id + "'" + selected + ">" + translation.name + "</option>"
      var optGroup = bibleSelect.find('.bible-select-' + translation.languageCode + '-translations');
      optGroup.append(current_translation_html);
    }
  }

  async initTranslationsMenu(tabIndex=undefined) {
    if (tabIndex === undefined) {
      var tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }
    //console.log("initTranslationsMenu " + tabIndex);

    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    bibleSelect.empty();

    var result = await models.BibleTranslation.findAndCountAll();
    //console.log("Adding " + result.rows.length + " translations to menu");

    await this.addLanguageGroupsToBibleSelectMenu(tabIndex);
    this.updateUiBasedOnNumberOfTranslations(tabIndex, result.count);
    this.addTranslationsToBibleSelectMenu(tabIndex, result);

    bibleSelect.selectmenu({
      change: (event) => {
        this.handleBibleTranslationChange(event);
      }
    });
  }

  initBibleTranslationInfoButton() {
    $('.bible-translation-info-button').unbind('click');
    $('.bible-translation-info-button').bind('click', async () => {
      if (!$(this).hasClass('ui-state-disabled')) {
        await this.showBibleTranslationInfo();
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
      var moduleSize = Math.round(bibleTranslationModule.size / 1024) + " KB";

      bibleTranslationInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>Sword module info</p>";
      bibleTranslationInfo += "<table>";
      bibleTranslationInfo += "<tr><td style='width: 9em;'>Name:</td><td>" + bibleTranslationModule.name + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Version:</td><td>" + bibleTranslationModule.version + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Language:</td><td>" + this.languageMapper.getLanguageName(bibleTranslationModule.language) + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Strong's:</td><td>" + (bibleTranslationModule.hasStrongs ? "Yes" : "No") + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Headings:</td><td>" + (bibleTranslationModule.hasHeadings ? "Yes" : "No") + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Footnotes:</td><td>" + (bibleTranslationModule.hasFootnotes ? "Yes" : "No") + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Cross references:</td><td>" + (bibleTranslationModule.hasCrossReferences ? "Yes" : "No") + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Red letter words:</td><td>" + (bibleTranslationModule.hasRedLetterWords ? "Yes" : "No") + "</td></tr>";
      bibleTranslationInfo += "<tr><td>Size:</td><td>" + moduleSize + "</td></tr>";
      bibleTranslationInfo += "</table>";
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

  async getLocalModulesNotYetAvailableInDb() {
    var localSwordModules = this.nodeSwordInterface.getAllLocalModules();
    var dbModules = await models.BibleTranslation.findAndCountAll();
    var modulesNotInDb = [];

    for (var i = 0; i < localSwordModules.length; i++) {
      var localSwordModuleName = localSwordModules[i].name;
      var localModuleFound = false;

      for (var dbTranslation of dbModules.rows) {
        if (localSwordModuleName == dbTranslation.id) {
          localModuleFound = true;
          break;
        }
      }

      if (!localModuleFound) {
        modulesNotInDb.push(localSwordModuleName);
        //console.log("The local module " + localSwordModuleName + " is not in the DB yet!");
      }
    }

    return modulesNotInDb;
  }

  async syncSwordModules(htmlElementForMessages) {
    var modulesNotInDb = await this.getLocalModulesNotYetAvailableInDb();

    var initialMessage = "<p style='margin-bottom: 2em'>Synchronizing " + modulesNotInDb.length + "   Sword modules with Ezra Project database!</p>";
    htmlElementForMessages.append(initialMessage);

    htmlElementForMessages.dialog("open");
    await this.sleep(200);

    for (var i = 0; i < modulesNotInDb.length; i++) {
      var moduleDescription = this.nodeSwordInterface.getModuleDescription(modulesNotInDb[i]);
      
      var message = "<span>Synchronizing <i>" + moduleDescription + "</i> ...</span>";
      htmlElementForMessages.append(message);
      htmlElementForMessages.scrollTop(htmlElementForMessages.prop("scrollHeight"));

      await this.sleep(200);
      await models.BibleTranslation.importSwordTranslation(modulesNotInDb[i]);
      var doneMessage = "<span> done.</span><br/>";
      htmlElementForMessages.append(doneMessage);
      if (i < modulesNotInDb.length) await this.sleep(500);
    }

    var completeMessage = "<p style='margin-top: 2em;'>Synchronization completed!</p>";
    htmlElementForMessages.append(completeMessage);
    htmlElementForMessages.scrollTop(htmlElementForMessages.prop("scrollHeight"));

    await this.sleep(2000);
    htmlElementForMessages.dialog("close");
    bible_browser_controller.updateUiAfterBibleTranslationAvailable(modulesNotInDb[0]);
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

  enableCurrentTranslationInfoButton(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var translationInfoButton = currentVerseListMenu.find('.bible-translation-info-button');
    translationInfoButton.removeClass('ui-state-disabled');
  }

  disableCurrentTranslationInfoButton() {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var translationInfoButton = currentVerseListMenu.find('.bible-translation-info-button');
    translationInfoButton.addClass('ui-state-disabled');
  }
}

module.exports = TranslationController;


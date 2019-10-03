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
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
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
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
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
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentBook = currentTab.getBook();
    var currentTagIdList = currentTab.getTagIdList();

    if (count == 0) {
      bibleSelect.attr('disabled','disabled');
      $('.book-select-button').addClass('ui-state-disabled');
      var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
      currentVerseList.find('.help-text').text(i18n.t("help.help-text-no-translations", { 'interpolation': {'escapeValue': false} }));
    } else {
      $('.bible-select').removeAttr('disabled');
      $('.book-select-button').removeClass('ui-state-disabled');

      if (currentBook == null && currentTagIdList == "")  {
        var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
        currentVerseList.find('.help-text').text(i18n.t("help.help-text-translation-available"));
      }
    }
  }

  addTranslationsToBibleSelectMenu(tabIndex, dbResult) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();

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

  getBibleTranslationInfo(translationId, isRemote=false) {
    var bibleTranslationInfo = "No info available!";

    try {
      var bibleTranslationModule = null;

      if (isRemote) {
        bibleTranslationModule = this.nodeSwordInterface.getRepoModule(translationId);
      } else {
        bibleTranslationModule = this.nodeSwordInterface.getLocalModule(translationId);
      }
      
      var bibleTranslationInfo = "";
      
      if (isRemote) {
        bibleTranslationInfo += "<b>" + bibleTranslationModule.description + "</b><br><br>";
      } else {
        bibleTranslationInfo += "<b>" + i18n.t("general.module-about") + "</b><br><br>";
      }

      bibleTranslationInfo += bibleTranslationModule.about.replace(/\\par/g, "<br>");
      var moduleSize = Math.round(bibleTranslationModule.size / 1024) + " KB";

      var yes = i18n.t("general.yes");
      var no = i18n.t("general.no");

      bibleTranslationInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>" + i18n.t("general.sword-module-info") + "</p>";
      bibleTranslationInfo += "<table>";
      bibleTranslationInfo += "<tr><td style='width: 9em;'>" + i18n.t("general.module-name") + ":</td><td>" + bibleTranslationModule.name + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-version") + ":</td><td>" + bibleTranslationModule.version + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-language") + ":</td><td>" + this.languageMapper.getLanguageName(bibleTranslationModule.language) + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-strongs") + ":</td><td>" + (bibleTranslationModule.hasStrongs ? yes : no) + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-headings") + ":</td><td>" + (bibleTranslationModule.hasHeadings ? yes : no) + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-footnotes") + ":</td><td>" + (bibleTranslationModule.hasFootnotes ? yes : no) + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-xrefs") + ":</td><td>" + (bibleTranslationModule.hasCrossReferences ? yes : no) + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-redletter") + ":</td><td>" + (bibleTranslationModule.hasRedLetterWords ? yes : no) + "</td></tr>";
      bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-size") + ":</td><td>" + moduleSize + "</td></tr>";
      if (!isRemote) {
        bibleTranslationInfo += "<tr><td>" + i18n.t("general.module-location") + ":</td><td>" + bibleTranslationModule.location + "</td></tr>";
      }

      bibleTranslationInfo += "</table>";

      bibleTranslationInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>" + i18n.t("general.sword-library-info") + "</p>";
      bibleTranslationInfo += "<p>" + i18n.t("general.using-sword-version") + " <b>" + this.nodeSwordInterface.getSwordVersion() + "</b>.</p>";
    } catch (ex) {
      console.error("Got exception while trying to get bible translation info: " + ex);
    }

    return bibleTranslationInfo;
  }

  async showBibleTranslationInfo() {
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
    var bibleTranslationInfo = this.getBibleTranslationInfo(currentBibleTranslationId);

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
    
    if (!bible_browser_controller.tab_controller.isCurrentTabEmpty() && bible_browser_controller.tab_controller.getTab().getTextType() != 'search_results') {
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
        modulesNotInDb.push(localSwordModules[i]);
        //console.log("The local module " + localSwordModuleName + " is not in the DB yet!");
      }
    }

    return modulesNotInDb;
  }

  async getDbModulesNotYetInstalled() {
    var localSwordModules = this.nodeSwordInterface.getAllLocalModules();
    var dbModules = await models.BibleTranslation.findAndCountAll();
    var modulesNotInstalled = [];

    for (var dbTranslation of dbModules.rows) {
      var dbModuleName = dbTranslation.id;
      var dbModuleFound = false;

      if (!dbTranslation.isFree) {
        continue;
      }

      for (var i = 0; i < localSwordModules.length; i++) {
        var localSwordModuleName = localSwordModules[i].name;

        if (dbModuleName == localSwordModuleName) {
          dbModuleFound = true;
          break;
        }
      }

      if (!dbModuleFound) {
        modulesNotInstalled.push(dbModuleName);
        //console.log("The local module " + localSwordModuleName + " is not in the DB yet!");
      }
    }

    return modulesNotInstalled;
  }

  async syncDbWithSwordModules(htmlElementForMessages) {
    var modulesNotInDb = await this.getLocalModulesNotYetAvailableInDb();

    var initialMessage = "<p style='margin-bottom: 2em'>" + i18n.t("module-sync.synchronizing") 
                          + " " + modulesNotInDb.length + " " + i18n.t("module-sync.modules-with-db") + "</p>";

    htmlElementForMessages.append(initialMessage);

    for (var i = 0; i < modulesNotInDb.length; i++) {     
      var message = "<span>" + i18n.t("module-sync.synchronizing") + " <i>" + modulesNotInDb[i].description + "</i> ...</span>";
      htmlElementForMessages.append(message);
      htmlElementForMessages.scrollTop(htmlElementForMessages.prop("scrollHeight"));

      await this.sleep(200);
      await models.BibleTranslation.importSwordTranslation(modulesNotInDb[i].name);
      var doneMessage = "<span> " + i18n.t("general.done") + ".</span><br/>";
      htmlElementForMessages.append(doneMessage);
      if (i < modulesNotInDb.length) await this.sleep(500);
    }

    var completeMessage = "<p style='margin-top: 2em;'>" + i18n.t("module-sync.sync-completed") + "</p>";
    htmlElementForMessages.append(completeMessage);
    htmlElementForMessages.scrollTop(htmlElementForMessages.prop("scrollHeight"));

    await this.sleep(2000);
    htmlElementForMessages.dialog("close");

    if (modulesNotInDb.length > 0) {
      bible_browser_controller.updateUiAfterBibleTranslationAvailable(modulesNotInDb[0].name);
    }
  }

  async getNotInstalledButAvailableModules() {
    var modulesNotInstalled = await this.getDbModulesNotYetInstalled();
    var modulesAvailable = [];

    if (modulesNotInstalled.length > 0) {
      for (var i = 0; i < modulesNotInstalled.length; i++) {
        if (this.nodeSwordInterface.isModuleAvailableInRepo(modulesNotInstalled[i])) {
          modulesAvailable.push(modulesNotInstalled[i]);
        } else {
          console.log("Module " + modulesNotInstalled[i] + " is not available from any repository!");
        }
      }
    }

    return modulesAvailable;
  }

  async syncSwordInstallationWithDb(htmlElementForMessages) {
    var modulesAvailable = await this.getNotInstalledButAvailableModules();

    var initialMessage = "<p style='margin-bottom: 2em'>" + i18n.t("module-sync.installing") 
    + " " + modulesAvailable.length + " " + i18n.t("module-sync.existing-db-modules") + "</p>";
    htmlElementForMessages.append(initialMessage);

    for (var i = 0; i < modulesAvailable.length; i++) {     
      var moduleInfo = this.nodeSwordInterface.getRepoModule(modulesAvailable[i]);
      var message = "<span>" + i18n.t("module-sync.installing") + " <i>" + moduleInfo.description + "</i> ...</span>";
      htmlElementForMessages.append(message);
      htmlElementForMessages.scrollTop(htmlElementForMessages.prop("scrollHeight"));

      await this.sleep(200);
      await this.nodeSwordInterface.installModule(modulesAvailable[i]);

      var doneMessage = "<span> " + i18n.t("general.done") + ".</span><br/>";
      htmlElementForMessages.append(doneMessage);
      if (i < modulesAvailable.length) await this.sleep(500);
    }

    var completeMessage = "<p style='margin-top: 2em;'>" + i18n.t("module-sync.install-completed") + "</p>";
    htmlElementForMessages.append(completeMessage);
    htmlElementForMessages.scrollTop(htmlElementForMessages.prop("scrollHeight"));
  }

  async sync_sword_modules() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    $('#bible-sync-box').dialog({
      position: [verse_list_position.left + 50, verse_list_position.top + 30]
    });

    if (!this.nodeSwordInterface.repositoryConfigExisting()) {
      $('#bible-sync-box').dialog("open");
      $('#bible-sync-box').append('<p>' + i18n.t('translation-wizard.updating-repository-data') + '</p>');

      await this.nodeSwordInterface.updateRepositoryConfig();
    }

    //console.log("Getting local modules not yet available in db ...");
    var modulesNotInDb = await this.getLocalModulesNotYetAvailableInDb();
    //console.log("Finding not installed, but available modules ...");
    var notInstalledButAvailableModules = await this.getNotInstalledButAvailableModules();

    if (modulesNotInDb.length > 0 || notInstalledButAvailableModules.length > 0) {
      $('#bible-sync-box').dialog("open");
      await this.sleep(200);
    }

    if (modulesNotInDb.length > 0) {
      await this.syncDbWithSwordModules($('#bible-sync-box'));
    }

    if (notInstalledButAvailableModules.length > 0) {
      await this.syncSwordInstallationWithDb($('#bible-sync-box'));
    }

    if (modulesNotInDb.length > 0 || notInstalledButAvailableModules.length > 0) {
      await this.sleep(2000);
    }

    $('#bible-sync-box').dialog("close");
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
    configure_button_styles('#verse-list-tabs');
  }

  disableCurrentTranslationInfoButton() {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var translationInfoButton = currentVerseListMenu.find('.bible-translation-info-button');
    translationInfoButton.addClass('ui-state-disabled');
  }
}

module.exports = TranslationController;


/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

/**
 * The TranslationController is used to handle the bible translation menu and to
 * access and generate various information about installed bible translations.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.translation_controller`.
 * 
 * @category Controller
 */
class TranslationController {
  constructor() {
    this.languageMapper = null;
    this.translationCount = null;
    this.initBibleSyncBoxDone = false;
  }

  getLanguageMapper() {
    if (this.languageMapper == null) {
      const LanguageMapper = require('../../lib/language_mapper.js');
      this.languageMapper = new LanguageMapper();
    }

    return this.languageMapper;
  }

  getTranslationCount() {
    return this.translationCount;
  }

  init(onBibleTranslationChanged) {
    this.onBibleTranslationChanged = onBibleTranslationChanged;
  }

  initBibleSyncBox() {
    if (this.initBibleSyncBoxDone) {
      return;
    }

    this.initBibleSyncBoxDone = true;

    $('#bible-sync-box').dialog({
      width: 600,
      height: 300,
      autoOpen: false,
      modal: true,
      title: i18n.t("module-sync.module-sync-header"),
      dialogClass: 'bible-sync-dialog'
    });
  }

  initVerseSelection() {
    app_controller.verse_selection.initHelper(ipcNsi);
  }

  async loadSettings() {
    await app_controller.book_selection_menu.updateAvailableBooks();
    this.initVerseSelection();
  }

  getBibleSelect(tabIndex) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    return bibleSelect;
  }

  async addLanguageGroupsToBibleSelectMenu(tabIndex) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var languages = await this.getLanguages();

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newOptGroup = "<optgroup class='bible-select-" + currentLang.languageCode + "-translations' label='" + currentLang.languageName + "'></optgroup>";
      bibleSelect.append(newOptGroup);
    }
  }

  updateUiBasedOnNumberOfTranslations(tabIndex, count) {
    var bibleSelect = this.getBibleSelect(tabIndex);

    if (count == 0) {
      bibleSelect.attr('disabled','disabled');
      $('.book-select-button').addClass('ui-state-disabled');
      $('.tag-select-button').addClass('ui-state-disabled');
      $('.module-search-button').addClass('ui-state-disabled');

      var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
      // FIXME: This needs to be adjusted based on the new menu
      currentVerseList.find('.help-text').html(i18n.t("help.help-text-no-translations", { interpolation: {escapeValue: false} }));
    } else {
      $('.bible-select').removeAttr('disabled');
      $('.book-select-button').removeClass('ui-state-disabled');
      $('.module-search-button').removeClass('ui-state-disabled');

      var currentBook = null;
      var currentTagIdList = "";
      var currentSearchTerm = null;

      var currentTab = app_controller.tab_controller.getTab(tabIndex);
      if (currentTab != null) {
        currentBook = currentTab.getBook();
        currentTagIdList = currentTab.getTagIdList();
        currentSearchTerm = currentTab.getSearchTerm();
      }

      if (currentBook == null && currentTagIdList == "" && currentSearchTerm == null)  {
        var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
        currentVerseList.find('.help-text').text(i18n.t("help.help-text-translation-available"));
      }
    }
  }

  addTranslationsToBibleSelectMenu(tabIndex, translations) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var currentBibleTranslationId = app_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();

    for (var translation of translations) {
      var selected = '';
      if (currentBibleTranslationId == translation.name) {
        var selected = ' selected=\"selected\"';
      }

      var current_translation_html = "<option value='" + translation.name + "'" + selected + ">" + translation.description + "</option>"
      var optGroup = bibleSelect.find('.bible-select-' + translation.language + '-translations');
      optGroup.append(current_translation_html);
    }
  }

  async initTranslationsMenu(previousTabIndex=-1, tabIndex=undefined) {
    if (tabIndex === undefined) {
      var tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    }
    //console.log("initTranslationsMenu " + tabIndex);

    var previousVerseListMenu = null;
    if (previousTabIndex != -1) {
      previousVerseListMenu = app_controller.getCurrentVerseListMenu(previousTabIndex);
    }

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var bibleSelect = null;

    if (previousVerseListMenu != null && previousVerseListMenu.length > 0) {
      
      var previousBibleSelect = previousVerseListMenu.find('select.bible-select').clone();
      var currentBibleSelect = currentVerseListMenu.find('select.bible-select');
      currentBibleSelect.replaceWith(previousBibleSelect);
      bibleSelect = currentVerseListMenu.find('select.bible-select');

    } else {

      bibleSelect = currentVerseListMenu.find('select.bible-select');
      bibleSelect.empty();

      await this.addLanguageGroupsToBibleSelectMenu(tabIndex);

      var translations = await ipcNsi.getAllLocalModules();

      if (translations == null) translations = [];

      // FIXME: Should be in function
      translations.sort((a, b) => {
        var aDescription = a.description;
        var bDescription = b.description;

        if (aDescription < bDescription) {
          return -1;
        } else if (aDescription > bDescription) {
          return 1;
        } else {
          return 0;
        }
      });

      this.previousTranslationCount = this.translationCount;
      this.translationCount = translations.length;

      if (this.translationCount != this.previousTranslationCount) {
        this.updateUiBasedOnNumberOfTranslations(tabIndex, translations.length);
      }
      
      this.addTranslationsToBibleSelectMenu(tabIndex, translations);
    }

    bibleSelect.selectmenu({
      change: () => {
        if (!app_controller.tab_controller.isCurrentTabEmpty() && app_controller.tab_controller.getTab().getTextType() != 'search_results') {
          this.showTextLoadingIndicator();
        }

        var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
        var bibleSelect = currentVerseListMenu.find('select.bible-select');

        var oldBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
        var newBibleTranslationId = bibleSelect[0].value;

        ipcSettings.set('bibleTranslation', newBibleTranslationId);
        app_controller.tab_controller.setCurrentBibleTranslationId(newBibleTranslationId);
        app_controller.tab_controller.refreshBibleTranslationInTabTitle(newBibleTranslationId);

        setTimeout(() => {
          this.handleBibleTranslationChange(oldBibleTranslationId, newBibleTranslationId)
        }, 50);
      }
    });

    $('.bible-select-block').find('.ui-selectmenu').bind('click', () => {
      app_controller.hideAllMenus();
    });
  }

  async getModuleDescription(moduleId, isRemote=false) {
    var moduleInfo = "No info available!";

    try {
      var swordModule = null;

      if (isRemote) {
        swordModule = await ipcNsi.getRepoModule(moduleId);
      } else {
        swordModule = await ipcNsi.getLocalModule(moduleId);
      }
      
      var moduleInfo = "";
      
      if (isRemote) {
        moduleInfo += "<b>" + swordModule.description + "</b><br><br>";
      }

      moduleInfo += "<p class='external'>";
      var about = swordModule.about.replace(/\\pard/g, "").replace(/\\par/g, "<br>");
      moduleInfo += about;
      moduleInfo += "</p>";

    } catch (ex) {
      console.error("Got exception while trying to get module description: " + ex);
    }

    return moduleInfo;
  }

  async getModuleInfo(moduleId, isRemote=false, includeModuleDescription=true) {
    var moduleInfo = "No info available!";

    try {
      var swordModule = null;

      if (isRemote) {
        swordModule = await ipcNsi.getRepoModule(moduleId);
      } else {
        swordModule = await ipcNsi.getLocalModule(moduleId);
      }
      
      var moduleInfo = "";

      if (includeModuleDescription) {
        if (isRemote) {
          moduleInfo += "<b>" + swordModule.description + "</b><br><br>";
        }

        moduleInfo += "<p class='external'>";
        var about = swordModule.about.replace(/\\pard/g, "").replace(/\\par/g, "<br>");
        moduleInfo += about;
        moduleInfo += "</p>";
      }
      
      var moduleSize = Math.round(swordModule.size / 1024) + " KB";

      var yes = i18n.t("general.yes");
      var no = i18n.t("general.no");

      if (includeModuleDescription) {
        moduleInfo += `<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>${i18n.t("general.sword-module-info")}</p>`;
      }

      moduleInfo += "<table>";
      moduleInfo += "<tr><td style='width: 11em;'>" + i18n.t("general.module-name") + ":</td><td>" + swordModule.name + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-version") + ":</td><td>" + swordModule.version + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-language") + ":</td><td>" + this.getLanguageMapper().getLanguageName(swordModule.language) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-license") + ":</td><td>" + swordModule.distributionLicense + "</td></tr>";

      if (swordModule.type == 'Biblical Texts') {
        moduleInfo += "<tr><td>" + i18n.t("general.module-strongs") + ":</td><td>" + (swordModule.hasStrongs ? yes : no) + "</td></tr>";
        moduleInfo += "<tr><td>" + i18n.t("general.module-headings") + ":</td><td>" + (swordModule.hasHeadings ? yes : no) + "</td></tr>";
        moduleInfo += "<tr><td>" + i18n.t("general.module-footnotes") + ":</td><td>" + (swordModule.hasFootnotes ? yes : no) + "</td></tr>";
        moduleInfo += "<tr><td>" + i18n.t("general.module-xrefs") + ":</td><td>" + (swordModule.hasCrossReferences ? yes : no) + "</td></tr>";
        moduleInfo += "<tr><td>" + i18n.t("general.module-redletter") + ":</td><td>" + (swordModule.hasRedLetterWords ? yes : no) + "</td></tr>";
      }

      moduleInfo += "<tr><td>" + i18n.t("general.module-size") + ":</td><td>" + moduleSize + "</td></tr>";
      if (!isRemote) {
        moduleInfo += "<tr><td>" + i18n.t("general.module-location") + ":</td><td>" + swordModule.location + "</td></tr>";
      }

      moduleInfo += "</table>";

      if (isRemote && swordModule.locked && swordModule.unlockInfo != "") {
        moduleInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>" + i18n.t("general.sword-unlock-info") + "</p>";
        moduleInfo += "<p class='external'>" + swordModule.unlockInfo + "</p>";
      }
    } catch (ex) {
      console.error("Got exception while trying to get module info: " + ex);
    }

    return moduleInfo;
  }

  async getBibleTranslationModule(translationId) {
    if (translationId == null) {
      return null;
    }

    var bibleTranslation = null;

    try {
      bibleTranslation = await ipcNsi.getLocalModule(translationId);
    } catch (e) {
      console.log("Could not get local sword module for " + translationId);
    }

    return bibleTranslation;
  }

  async hasBibleTranslationStrongs(translationId) {
    var bibleTranslation = await this.getBibleTranslationModule(translationId);

    if (bibleTranslation != null) {
      return bibleTranslation.hasStrongs;
    } else {
      return false;
    }
  }

  async hasBibleTranslationHeaders(translationId) {
    var bibleTranslation = await this.getBibleTranslationModule(translationId);

    if (bibleTranslation != null) {
      return bibleTranslation.hasHeadings;
    } else {
      return false;
    }
  }

  hasCurrentTranslationHeaderElements(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex)[0];
    var query = '.sword-section-title:not([type="chapter"]):not([type="psalm"]):not([type="scope"]):not([type="acrostic"])';
    var allSectionTitles = currentVerseList.querySelectorAll(query);

    return allSectionTitles.length > 0;
  }

  async handleBibleTranslationChange(oldBibleTranslationId, newBibleTranslationId) {
    await app_controller.book_selection_menu.updateAvailableBooks();
    this.onBibleTranslationChanged(oldBibleTranslationId, newBibleTranslationId);
  }

  async isStrongsTranslationAvailable() {
    var allTranslations = await ipcNsi.getAllLocalModules();

    if (allTranslations == null) {
      return false;
    }

    for (var dbTranslation of allTranslations) {
      if (dbTranslation.hasStrongs) {
        return true;
      }
    }

    return false;
  }

  async installStrongs(htmlElementForMessages) {
    var message = "<span>" + i18n.t("general.installing-strongs") + " ...</span>";
    htmlElementForMessages.append(message);

    try {
      await ipcNsi.installModule("StrongsHebrew");
      await ipcNsi.installModule("StrongsGreek");
      app_controller.dictionary_controller.runAvailabilityCheck();
      var doneMessage = "<span> " + i18n.t("general.done") + ".</span><br/>";
      htmlElementForMessages.append(doneMessage);
    } catch(e) {
      var errorMessage = "<span> " + i18n.t("general.module-install-failed") + ".</span><br/>";
      htmlElementForMessages.append(errorMessage);
    }
  }

  async installStrongsIfNeeded() {
    //console.time("get sync infos");   
    var strongsAvailable = await ipcNsi.strongsAvailable();
    var strongsInstallNeeded = await this.isStrongsTranslationAvailable() && !strongsAvailable;
    //console.timeEnd("get sync infos");

    if (strongsInstallNeeded) {
      var currentVerseList = app_controller.getCurrentVerseList();
      var verse_list_position = currentVerseList.offset();

      this.initBibleSyncBox();

      $('#bible-sync-box').dialog({
        position: [verse_list_position.left + 50, verse_list_position.top + 30]
      });

      $('#bible-sync-box').dialog("open");
      await sleep(100);
    }

    if (strongsInstallNeeded) {
      await this.installStrongs($('#bible-sync-box'));
    }

    if (strongsInstallNeeded) {
      await sleep(2000);
    }

    $('#bible-sync-box').dialog("close");
  }

  getCurrentTextLoadingIndicator() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var loadingIndicator = currentVerseListMenu.find('.loader');
    return loadingIndicator;
  }

  showTextLoadingIndicator() {
    var textLoadingIndicator = this.getCurrentTextLoadingIndicator();
    textLoadingIndicator.show();
  }

  hideTextLoadingIndicator() {
    var textLoadingIndicator = this.getCurrentTextLoadingIndicator();
    textLoadingIndicator.hide();
  }

  async getLanguages(moduleType='BIBLE') {
    var localModules = await ipcNsi.getAllLocalModules(moduleType);

    if (localModules == null) {
      return [];
    }
    
    var languages = [];
    var languageCodes = [];

    for (var i = 0; i < localModules.length; i++) {
      var module = localModules[i];
      var languageName = this.getLanguageMapper().getLanguageName(module.language);

      if (!languageCodes.includes(module.language)) {
        languages.push({
          'languageName': languageName,
          'languageCode': module.language
        });
        languageCodes.push(module.language);
      }
    }

    return languages;
  }

  async getInstalledModules(moduleType='BIBLE') {
    var localModules = await ipcNsi.getAllLocalModules(moduleType);
    // FIXME: Should be in function
    localModules.sort((a, b) => {
      var aDescription = a.description;
      var bDescription = b.description;

      if (aDescription < bDescription) {
        return -1;
      } else if (aDescription > bDescription) {
        return 1;
      } else {
        return 0;
      }
    });

    var translations = [];

    for (var i = 0; i < localModules.length; i++) {
      translations.push(localModules[i].name);
    }

    return translations;
  }

  async getVersification(translationCode) {
    if (translationCode == null) {
      return null;
    }

    var versification = null;
    var psalm3Verses = [];
    var revelation12Verses = [];

    try {
      psalm3Verses = await ipcNsi.getChapterText(translationCode, 'Psa', 3);
    } catch (e) {
      console.log("TranslationController.getVersification: Could not retrieve chapter text for Psalm 3 of " + translationCode);
    }

    try {
      revelation12Verses = await ipcNsi.getChapterText(translationCode, 'Rev', 12);
    } catch (e) {
      console.log("TranslationController.getVersification: Could not retrieve chapter text for Revelation 12 of " + translationCode);
    }

    if (psalm3Verses.length == 8 || revelation12Verses.length == 17) { // ENGLISH versification
      versification = "ENGLISH";

    } else if (psalm3Verses.length == 9 || revelation12Verses.length == 18) { // HEBREW versification
      versification = "HEBREW";

    } else { // Unknown versification

      versification = "UNKNOWN"

      /*console.log("Unknown versification!");
      console.log("Psalm 3 has " + psalm3Verses.length + " verses.");
      console.log("Revelation 12 has " + revelation12Verses.length + " verses.");*/
    }

    return versification;
  }
}

module.exports = TranslationController;


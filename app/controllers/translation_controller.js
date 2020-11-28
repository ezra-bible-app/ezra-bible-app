/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const LanguageMapper = require('../helpers/language_mapper.js');

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
    this.languageMapper = new LanguageMapper();
    this.translationCount = null;
  }

  getTranslationCount() {
    return this.translationCount;
  }

  init(onBibleTranslationChanged) {
    this.onBibleTranslationChanged = onBibleTranslationChanged;
    this.initBibleTranslationInfoButton();
    this.initBibleSyncBox();
    this.initBibleTranslationInfoBox();
  }

  initBibleSyncBox() {
    $('#bible-sync-box').dialog({
      width: 600,
      height: 300,
      autoOpen: false,
      modal: true,
      title: i18n.t("module-sync.module-sync-header"),
      dialogClass: 'bible-sync-dialog'
    });
  }

  initBibleTranslationInfoBox() {
    $('#bible-translation-info-box').dialog({
      width: 700,
      height: 500,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  }

  initVerseSelection() {
    var currentTab = app_controller.tab_controller.getTab();

    if (currentTab != null) {
      var currentBibleTranslationId = currentTab.getBibleTranslationId();

      if (currentBibleTranslationId != null) {
        app_controller.verse_selection.initHelper(reference_separator, nsi);
      }
    }
  }

  loadSettings() {
    app_controller.book_selection_menu.updateAvailableBooks();
    this.initVerseSelection();
  }

  getBibleSelect(tabIndex) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var bibleSelect = currentVerseListMenu.find('select.bible-select');
    return bibleSelect;
  }

  addLanguageGroupsToBibleSelectMenu(tabIndex) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var languages = this.getLanguages();

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
    var currentBibleTranslationId = app_controller.tab_controller.getTab(tabIndex)?.getBibleTranslationId();

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

  initTranslationsMenu(previousTabIndex=-1, tabIndex=undefined) {
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

      this.addLanguageGroupsToBibleSelectMenu(tabIndex);

      var translations = nsi.getAllLocalModules();
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
          this.showBibleTranslationLoadingIndicator();
        }

        var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
        var bibleSelect = currentVerseListMenu.find('select.bible-select');

        var oldBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
        var newBibleTranslationId = bibleSelect[0].value;

        app_controller.tab_controller.setCurrentBibleTranslationId(newBibleTranslationId);
        app_controller.settings.set('bible_translation', newBibleTranslationId);
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

  initBibleTranslationInfoButton() {
    $('.bible-translation-info-button').unbind('click');
    $('.bible-translation-info-button').bind('click', async () => {
      if (!$(this).hasClass('ui-state-disabled')) {
        app_controller.hideAllMenus();
        this.showBibleTranslationInfo();
      }
    });
  }

  getModuleInfo(moduleId, isRemote=false) {
    var moduleInfo = "No info available!";

    try {
      var swordModule = null;

      if (isRemote) {
        swordModule = nsi.getRepoModule(moduleId);
      } else {
        swordModule = nsi.getLocalModule(moduleId);
      }
      
      var moduleInfo = "";
      
      if (isRemote) {
        moduleInfo += "<b>" + swordModule.description + "</b><br><br>";
      }

      moduleInfo += "<p class='external'>";
      var about = swordModule.about.replace(/\\pard/g, "").replace(/\\par/g, "<br>");
      moduleInfo += about;
      moduleInfo += "</p>";

      var moduleSize = Math.round(swordModule.size / 1024) + " KB";

      var yes = i18n.t("general.yes");
      var no = i18n.t("general.no");

      moduleInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>" + i18n.t("general.sword-module-info") + "</p>";
      moduleInfo += "<table>";
      moduleInfo += "<tr><td style='width: 11em;'>" + i18n.t("general.module-name") + ":</td><td>" + swordModule.name + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-version") + ":</td><td>" + swordModule.version + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-language") + ":</td><td>" + this.languageMapper.getLanguageName(swordModule.language) + "</td></tr>";
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

      moduleInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>" + i18n.t("general.sword-library-info") + "</p>";
      moduleInfo += "<p>" + i18n.t("general.using-sword-version") + " <b>" + nsi.getSwordVersion() + "</b>.</p>";
    } catch (ex) {
      console.error("Got exception while trying to get module info: " + ex);
    }

    return moduleInfo;
  }

  showBibleTranslationInfo() {
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var moduleInfo = this.getModuleInfo(currentBibleTranslationId);

    var currentBibleTranslationName = app_controller.tab_controller.getCurrentBibleTranslationName();
    var offsetLeft = $(window).width() - 900;
    $('#bible-translation-info-box').dialog({
      title: currentBibleTranslationName,
      position: [offsetLeft,120]
    });
    $('#bible-translation-info-box-content').empty();
    $('#bible-translation-info-box-content').html(moduleInfo);
    $('#bible-translation-info-box').dialog("open");
  }

  hasBibleTranslationStrongs(translationId) {
    if (translationId == null) {
      return false;
    }

    var bibleTranslation = null;

    try {
      bibleTranslation = nsi.getLocalModule(translationId);
    } catch (e) {
      console.log("Could not get local sword module for " + translationId);
      return false;
    }

    if (bibleTranslation != null) {
      return bibleTranslation.hasStrongs;
    } else {
      return false;
    }
  }

  async handleBibleTranslationChange(oldBibleTranslationId, newBibleTranslationId) {
    app_controller.book_selection_menu.updateAvailableBooks();
    this.onBibleTranslationChanged(oldBibleTranslationId, newBibleTranslationId);
  }

  isStrongsTranslationInDb() {
    var allTranslations = nsi.getAllLocalModules();

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
      await nsi.installModule("StrongsHebrew");
      await nsi.installModule("StrongsGreek");
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
    var strongsInstallNeeded = this.isStrongsTranslationInDb() && !nsi.strongsAvailable();
    //console.timeEnd("get sync infos");

    if (strongsInstallNeeded) {
      var currentVerseList = app_controller.getCurrentVerseList();
      var verse_list_position = currentVerseList.offset();
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

  getCurrentBibleTranslationLoadingIndicator() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
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
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var translationInfoButton = currentVerseListMenu.find('.bible-translation-info-button');
    translationInfoButton.removeClass('ui-state-disabled');

    var tabId = app_controller.tab_controller.getSelectedTabId(tabIndex);
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }
  }

  disableCurrentTranslationInfoButton() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var translationInfoButton = currentVerseListMenu.find('.bible-translation-info-button');
    translationInfoButton.addClass('ui-state-disabled');
  }

  getLanguages(moduleType='BIBLE') {
    var localModules = nsi.getAllLocalModules(moduleType);
    
    var languages = [];
    var languageCodes = [];

    var languageMapper = new LanguageMapper();

    for (var i = 0; i < localModules.length; i++) {
      var module = localModules[i];
      var languageName = languageMapper.getLanguageName(module.language);

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

  getInstalledModules(moduleType='BIBLE') {
    var localModules = nsi.getAllLocalModules(moduleType);
    var translations = [];

    for (var i = 0; i < localModules.length; i++) {
      translations.push(localModules[i].name);
    }

    return translations;
  }

  getVersification(translationCode) {
    var versification = null;

    var psalm3Verses = nsi.getChapterText(translationCode, 'Psa', 3);
    var revelation12Verses = nsi.getChapterText(translationCode, 'Rev', 12);

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


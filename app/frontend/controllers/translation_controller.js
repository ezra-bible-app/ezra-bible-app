/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const eventController = require('../controllers/event_controller.js');
const { sleep } = require('../helpers/ezra_helper.js');
const verseListController = require('../controllers/verse_list_controller.js');
const moduleSelectHelper = require('../helpers/module_select_helper.js');
const swordModuleHelper = require('../helpers/sword_module_helper.js');

const INSTANT_LOADING_CHAPTER_LIMIT = 15;

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
    this.translationCount = null;
    this.initBibleSyncBoxDone = false;

    eventController.subscribe('on-bible-text-loaded', async (tabIndex) => {
      if (app_controller.isStartupCompleted()) {
        await this.toggleTranslationsBasedOnCurrentBook(tabIndex);
      }
    });

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      await this.initTranslationsMenu(-1, tabIndex);
    });

    eventController.subscribe('on-translation-added', async (newTranslation) => {
      await app_controller.tab_controller.refreshBibleTranslations();
    });

    eventController.subscribe('on-translation-removed', async () => {
      $("select#bible-select").empty();
      await app_controller.tab_controller.refreshBibleTranslations();
    });
  }

  getTranslationCount() {
    return this.translationCount;
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

  getBibleSelect(tabIndex) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);

    if (currentVerseListMenu != null) {
      var bibleSelect = currentVerseListMenu.find('select.bible-select');
      return bibleSelect;
    } else {
      return null;
    }
  }

  getBibleSelectBlock(tabIndex) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);

    if (currentVerseListMenu != null) {
      var bibleSelectBlock = currentVerseListMenu.find('.bible-select-block');
      return bibleSelectBlock;
    } else {
      return null;
    }
  }

  updateUiBasedOnNumberOfTranslations(tabIndex, count) {
    var bibleSelect = this.getBibleSelect(tabIndex);
    var bibleSelectBlock = this.getBibleSelectBlock(tabIndex);

    if (bibleSelect == null || bibleSelectBlock == null) {
      return;
    }

    if (count == 0) {
      if (platformHelper.isMobile()) {
        bibleSelectBlock.addClass('hidden');
      } else {
        bibleSelect.attr('disabled','disabled');
      }

      $('.book-select-button').addClass('ui-state-disabled');
      $('.tag-select-button').addClass('ui-state-disabled');
      $('.module-search-button').addClass('ui-state-disabled');

      let currentVerseList = verseListController.getCurrentVerseList(tabIndex);
      // FIXME: This needs to be adjusted based on the new menu
      currentVerseList.find('.help-text').html(i18n.t("help.help-text-no-translations", { interpolation: {escapeValue: false} }));
    } else {
      if (platformHelper.isMobile()) {
        bibleSelectBlock.removeClass('hidden');
      } else {
        $('.bible-select').removeAttr('disabled');
      }

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
        let currentVerseList = verseListController.getCurrentVerseList(tabIndex);
        currentVerseList.find('.help-text').text(i18n.t("help.help-text-translation-available"));
      }
    }
  }

  async initBibleSelect(bibleSelect, modules, isSecondBible=false, tabIndex=undefined) {
    bibleSelect.empty();

    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    let currentModuleId = undefined;

    if (currentTab != null) {
      if (isSecondBible) {
        currentModuleId = currentTab.getSecondBibleTranslationId();
      } else {
        currentModuleId = currentTab.getBibleTranslationId();
      }
    }

    await moduleSelectHelper.addLanguageGroupsToModuleSelectMenu(bibleSelect, modules);
    moduleSelectHelper.addModulesToModuleSelectMenu(undefined, bibleSelect[0], modules, currentModuleId);

    bibleSelect.selectmenu({
      width: platformHelper.isMobile() ? 90 : undefined,
      change: () => {
        if (!app_controller.tab_controller.isCurrentTabEmpty() && 
            app_controller.tab_controller.getTab().getTextType() != 'search_results') {
          uiHelper.showTextLoadingIndicator();
        }

        var oldBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
        var newBibleTranslationId = bibleSelect[0].value;

        if (!isSecondBible) {
          ipcSettings.set('bibleTranslation', newBibleTranslationId);
        }

        let changeEvent = isSecondBible ? 'on-translation2-changed' : 'on-translation1-changed';

        setTimeout(() => {
          eventController.publish(changeEvent, {from: oldBibleTranslationId, to: newBibleTranslationId});
        }, 50);
      }
    });
  }

  async initTranslationsMenu(previousTabIndex=-1, tabIndex=undefined, force=false) {
    if (tabIndex === undefined) {
      tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    }

    const tabElementId = app_controller.tab_controller.getTab(tabIndex).elementId;
    const tabElement = document.getElementById(tabElementId); 
    const isInitialized = tabElement.classList.contains('translations-menu-initialized');

    // Check if the translations menu for this tab has already been initialized
    if (!force && isInitialized) {
      return; // Skip initialization if already done
    }

    // Mark this tab as initialized
    if (!isInitialized) {
      tabElement.classList.add('translations-menu-initialized');
    }

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var bibleSelect1 = currentVerseListMenu.find('#bible-select1');
    var bibleSelect2 = currentVerseListMenu.find('#bible-select2');

    var modules = await ipcNsi.getAllLocalModules('BIBLE');
    modules.sort(swordModuleHelper.sortModules);

    if (modules == null) modules = [];

    this.previousTranslationCount = this.translationCount;
    this.translationCount = modules.length;

    if (this.translationCount != this.previousTranslationCount) {
      this.updateUiBasedOnNumberOfTranslations(tabIndex, modules.length);
    }

    // Initialize both Bible select menus - only first one triggers changes
    await this.initBibleSelect(bibleSelect1, modules, false, tabIndex);
    await this.initBibleSelect(bibleSelect2, modules, true, tabIndex);

    this.toggleTranslationsBasedOnCurrentBook(tabIndex);

    if (!force) {
      // Toggle parallel bible based on saved tab properties
      const currentTab = app_controller.tab_controller.getTab(tabIndex);
      if (currentTab && currentTab.getSecondBibleTranslationId() != null) {
        this.toggleParallelBible(tabIndex);
      }

      // Register event handlers
      currentVerseListMenu[0].querySelector('.parallel-bible-button').addEventListener('click', () => {
        this.toggleParallelBible(tabIndex);
      });

      currentVerseListMenu[0].querySelector('.bible-select-block').querySelector('.ui-selectmenu').addEventListener('click', () => {
        app_controller.hideAllMenus();
      });

      // Subscribe to locale changes for both menus
      eventController.subscribe('on-locale-changed', locale => {
        moduleSelectHelper.updateModuleSelectLanguages(locale, bibleSelect1);
        moduleSelectHelper.updateModuleSelectLanguages(locale, bibleSelect2);
      });
    }
  }

  toggleParallelBible(tabIndex=undefined) {
    const currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);

    const secondBibleBlock = currentVerseListMenu[0].querySelector('.bible-select-block.second-bible');
    const parallelButton = currentVerseListMenu[0].querySelector('.parallel-bible-button');
    const buttonIcon = parallelButton.querySelector('i');
    
    if (secondBibleBlock.style.display === 'none' || !secondBibleBlock.style.display) {
      secondBibleBlock.style.display = 'block';
      buttonIcon.className = 'fas fa-minus';
      parallelButton.setAttribute('i18n', '[title]menu.remove-parallel-bible');
    } else {
      secondBibleBlock.style.display = 'none';
      buttonIcon.className = 'fas fa-plus';
      parallelButton.setAttribute('i18n', '[title]menu.add-parallel-bible');
      
      // Set the second Bible translation of the tab to null
      app_controller.tab_controller.setSecondBibleTranslationId(null);
    }

    // Update i18n after changing the attribute
    $(parallelButton).localize();
  }

  hasCurrentTranslationHeaderElements(tabIndex=undefined) {
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex)[0];
    var query = '.sword-section-title:not([type="chapter"]):not([type="psalm"]):not([type="scope"]):not([type="acrostic"])';
    var allSectionTitles = currentVerseList.querySelectorAll(query);

    return allSectionTitles.length > 0;
  }

  async installStrongs(htmlElementForMessages) {
    var message = "<span>" + i18n.t("general.installing-strongs") + " ...</span>";
    htmlElementForMessages.append(message);

    try {
      await ipcNsi.installModule("StrongsHebrew");
      await ipcNsi.installModule("StrongsGreek");
      app_controller.word_study_controller.runAvailabilityCheck();
      var doneMessage = "<span> " + i18n.t("general.done") + ".</span><br/>";
      htmlElementForMessages.append(doneMessage);
    } catch(e) {
      var errorMessage = "<span> " + i18n.t("general.module-install-failed") + ".</span><br/>";
      htmlElementForMessages.append(errorMessage);
    }
  }

  // Currently not used!! (see startup.js)
  async installStrongsIfNeeded() {
    //console.time("get sync infos");   
    var strongsAvailable = await ipcNsi.strongsAvailable();
    var strongsInstallNeeded = await swordModuleHelper.isStrongsTranslationAvailable() && !strongsAvailable;
    //console.timeEnd("get sync infos");

    if (strongsInstallNeeded) {
      var currentVerseList = verseListController.getCurrentVerseList();
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

  async getInstalledModules(moduleType='BIBLE') {
    var translations = [];
    var localModules = await ipcNsi.getAllLocalModules(moduleType);

    if (localModules != null) {
      localModules.sort(swordModuleHelper.sortModules);

      for (var i = 0; i < localModules.length; i++) {
        translations.push(localModules[i].name);
      }
    }

    return translations;
  }

  async toggleTranslationsBasedOnCurrentBook(tabIndex=undefined) {
    const bibleSelect = this.getBibleSelect(tabIndex);
    const currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      let currentBook = currentTab.getBook();
      let previousBook = currentTab.getPreviousBook();

      if (currentBook == null || currentBook == previousBook) {
        return;
      }

      let moduleBookStatus = {};

      if (currentBook != null) {
        moduleBookStatus = await ipcNsi.getModuleBookStatus(currentBook);
      }

      let selectOptions = bibleSelect[0].querySelectorAll('option');

      for (let i = 0; i < selectOptions.length; i++) {
        let currentOption = selectOptions[i];
        let currentTextType = currentTab.getTextType();

        if (currentTextType == 'book' && 
            moduleBookStatus != null &&
            currentOption.value in moduleBookStatus &&
            !moduleBookStatus[currentOption.value]) {

          currentOption.disabled = true;
        } else {
          currentOption.disabled = false;
        }
      }

      // Refresh the selectmenu widget
      bibleSelect.selectmenu();
    }
  }

  async isInstantLoadingBook(bibleTranslationId, bookCode) {
    if (bibleTranslationId == null || bookCode == null) {
      return false;
    }

    var instantLoad = false;
    const bookChapterCount = await ipcNsi.getBookChapterCount(bibleTranslationId, bookCode);
    const bookLoadingModeOption = app_controller.optionsMenu._bookLoadingModeOption;

    switch (bookLoadingModeOption.value) {
      case 'open-complete-book':
        instantLoad = true;
        break;

      case 'open-chapters-large-books':
        if (bookChapterCount <= INSTANT_LOADING_CHAPTER_LIMIT) {
          instantLoad = true;
        }
        break;
    }

    return instantLoad;
  }
}

module.exports = TranslationController;

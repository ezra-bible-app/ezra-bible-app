/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const PlatformHelper = require('../../../lib/platform_helper.js');
const { waitUntilIdle } = require('../../helpers/ezra_helper.js');
const i18nController = require('../../controllers/i18n_controller.js');
const eventController = require('../../controllers/event_controller.js');
const referenceVerseController = require('../../controllers/reference_verse_controller.js');
const verseListController = require('../../controllers/verse_list_controller.js');

/**
 * The OptionsMenu component handles all event handling related to the options menu.
 * 
 * To add a new option, perform the following steps:
 * - Add the html element for the new option in `/html/display_options_menu.html`
 * - Add the locales for the new option in /locales/en/translation.json and copy the string to all other languages
 * - Add a function `showOrHide<Option>BasedOnOption()` that responds to changes
 * - Add the initialization for the new option in the `init()` function
 * - Add a call to `showOrHide<Option>BasedOnOption()` in `refreshViewBasedOnOptions()`
 * 
 * @category Component
 */
class OptionsMenu {
  constructor() {
    this.menuIsOpened = false;
    this.platformHelper = new PlatformHelper();

    if (this.platformHelper.isCordova()) {
      var CordovaPlatform = require('../../platform/cordova_platform.js');
      this.cordovaPlatform = new CordovaPlatform();
    }
  }

  async init() {
    $('#show-translation-settings-button').bind('click', function() {
      app_controller.openModuleSettingsAssistant('BIBLE'); 
    });
  
    $('#show-dict-settings-button').bind('click', function() {
      app_controller.openModuleSettingsAssistant('DICT'); 
    });

    $('#displayOptionsBackButton').bind('click', () => {
      this.hideDisplayMenu();
    });

    var openVerseListsInNewTabByDefault = false;
    var bookChapterNavDefault = true;
    var userDataIndicatorDefault = true;

    if (this.platformHelper.isCordova()) {
      openVerseListsInNewTabByDefault = true;
    }

    if (this.platformHelper.isMobile()) {
      bookChapterNavDefault = false;
      userDataIndicatorDefault = false;
    }

    this._bookIntroOption = this.initConfigOption('showBookIntroOption', () => { this.showOrHideBookIntroductionBasedOnOption(); });
    this._sectionTitleOption = this.initConfigOption('showSectionTitleOption', () => { this.showOrHideSectionTitlesBasedOnOption(); });
    this._xrefsOption = this.initConfigOption('showXrefsOption', () => { this.showOrHideXrefsBasedOnOption(); });
    this._footnotesOption = this.initConfigOption('showFootnotesOption', () => { this.showOrHideFootnotesBasedOnOption(); });
    this._bookChapterNavOption = this.initConfigOption('showBookChapterNavigationOption', () => { this.showOrHideBookChapterNavigationBasedOnOption(); }, bookChapterNavDefault);
    this._headerNavOption = this.initConfigOption('showHeaderNavigationOption', () => { this.showOrHideHeaderNavigationBasedOnOption(); });
    this._tabSearchOption = this.initConfigOption('showTabSearchOption', () => { this.showOrHideTabSearchFormBasedOnOption(undefined, true); });
    this._verseListNewTabOption = this.initConfigOption('openVerseListsInNewTabOption', () => {}, openVerseListsInNewTabByDefault);
    this._userDataIndicatorOption = this.initConfigOption('showUserDataIndicatorOption', () => { this.showOrHideUserDataIndicatorsBasedOnOption(); }, userDataIndicatorDefault);
    this._tagsOption = this.initConfigOption('showTagsOption', () => { this.showOrHideVerseTagsBasedOnOption(); });
    this._tagGroupFilterOption = this.initConfigOption('useTagGroupFilterOption', () => { this.applyTagGroupFilterBasedOnOption(); });
    this._tagsColumnOption = this.initConfigOption('useTagsColumnOption', () => { this.changeTagsLayoutBasedOnOption(); });
    this._verseNotesOption = this.initConfigOption('showNotesOption', () => { this.showOrHideVerseNotesBasedOnOption(); });
    this._verseNotesFixedHeightOption = this.initConfigOption('fixNotesHeightOption', () => { this.fixNotesHeightBasedOnOption(); });
    this._keepScreenAwakeOption = this.initConfigOption('keepScreenAwakeOption', () => { this.keepScreenAwakeBasedOnOption(); });
    this._textSizeAdjustTagsNotesOption = this.initConfigOption('adjustTagsNotesTextSizeOption', () => { app_controller.textSizeSettings.updateTagsNotes(this._textSizeAdjustTagsNotesOption.isChecked); }, true);
    this._selectChapterBeforeLoadingOption = this.initConfigOption('selectChapterBeforeLoadingOption', () => {});
    this._bookLoadingModeOption = this.initConfigOption('bookLoadingModeOption', async () => {});

    this.initLocaleSwitchOption();
    await this.initNightModeOption();

    await this.adjustOptionsMenuForPlatform();
    this.refreshViewBasedOnOptions();

    eventController.subscribe('on-bible-text-loaded', async (tabIndex) => {
      this.showOrHideSectionTitlesBasedOnOption(tabIndex);
    });

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      await this.refreshViewBasedOnOptions(tabIndex);
    });

    eventController.subscribe('on-tab-added', async (tabIndex) => {
      await this.refreshViewBasedOnOptions(tabIndex);

      this.initCurrentOptionsMenu(tabIndex);
    });
  }

  async initNightModeOption() {
    this._nightModeOption = this.initConfigOption('useNightModeOption', async () => {
      this.hideDisplayMenu();
      uiHelper.showGlobalLoadingIndicator();
      theme_controller.useNightModeBasedOnOption();

      if (this.platformHelper.isCordova()) {
        // On Cordova we persist a basic night mode style in a CSS file 
        // which is then loaded on startup again
        await ipcSettings.storeNightModeCss();
      }

      await waitUntilIdle();
      uiHelper.hideGlobalLoadingIndicator();
    });

    this._nightModeOption.checked = await theme_controller.isNightModeUsed();

    var isMojaveOrLater = await this.platformHelper.isMacOsMojaveOrLater();
    if (isMojaveOrLater) {
      // On macOS Mojave and later we do not give the user the option to switch night mode within the app, since it is controlled via system settings.
      $(this._nightModeOption).hide();
    }
  }

  initLocaleSwitchOption() {
    this._localeSwitchOption = document.querySelector('#localeSwitchOption');

    this._localeSwitchOption.addEventListener('localeChanged', async (e) => {
      this.slowlyHideDisplayMenu();
      await i18nController.changeLocale(e.detail.locale);
    });

    this._localeSwitchOption.addEventListener('localeDetectClicked', async () => {
      this.slowlyHideDisplayMenu();
      await i18nController.detectLocale();
    });
  }

  async adjustOptionsMenuForPlatform() {
    if (!this.platformHelper.isCordova()) {
      // On the desktop (Electron) we do not need the screen-awake option!
      $(this._keepScreenAwakeOption).hide();
    }

    if (this.platformHelper.isCordova()) {
      var bookLoadingModeOptionPersisted = await this._bookLoadingModeOption.persisted;
      if (!bookLoadingModeOptionPersisted) {
        this._bookLoadingModeOption.selectedValue = 'open-chapters-all-books';
      }
    }
  }

  initCurrentOptionsMenu(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.display-options-button').bind('click', (event) => { this.handleMenuClick(event); });
  }

  initConfigOption(configOptionId, eventHandler, checkedByDefault=false) {
    var option = document.getElementById(configOptionId);
    option.checkedByDefault = checkedByDefault;

    option.addEventListener("optionChanged", async () => {
      await eventHandler();
      this.slowlyHideDisplayMenu();
    });

    return option;
  }

  slowlyHideDisplayMenu() {
    setTimeout(() => {
      this.hideDisplayMenu();
    }, 300);
  }

  hideDisplayMenu() {
    if (this.menuIsOpened) {
      document.getElementById('app-container').classList.remove('fullscreen-menu');

      $('#app-container').find('#display-options-menu').hide();
      this.menuIsOpened = false;

      var display_button = $('#app-container').find('.display-options-button');
      display_button.removeClass('ui-state-active');
    }
  }

  handleMenuClick(event) {
    if (this.menuIsOpened) {
      app_controller.handleBodyClick();
    } else {
      app_controller.hideAllMenus();

      var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
      var display_options_button = currentVerseListMenu.find('.display-options-button');
      var menu = $('#app-container').find('#display-options-menu');

      document.getElementById('app-container').classList.add('fullscreen-menu');
      
      uiHelper.showButtonMenu(display_options_button, menu);

      this.menuIsOpened = true;
      event.stopPropagation();
    }
  }

  showOrHideBookIntroductionBasedOnOption(tabIndex=undefined) {
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      var bookIntro = currentVerseList.find('.book-intro');
      var paragraphElements = bookIntro.find("div[type='paragraph']");

      if (paragraphElements.length > 1) {
        for (var i = 0; i < paragraphElements.length; i++) {
          var currentParagraph = $(paragraphElements[i]);

          if (!currentParagraph.hasClass('processed') && currentParagraph[0].hasAttribute('eid')) {
            currentParagraph.addClass('processed');
            currentParagraph.append('<br/>');
          }
        }
      }

      if (this._bookIntroOption.isChecked) {
        bookIntro.show();
      } else {
        bookIntro.hide();
      }
    }
  }

  async showOrHideSectionTitlesBasedOnOption(tabIndex=undefined) {
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex)[0];
    var tabId = app_controller.tab_controller.getSelectedTabId(tabIndex);
    var all_section_titles = [];

    if (currentVerseList != null && currentVerseList != undefined) {

      // The following code moves the sword-section-title elements before the verse-boxes
      all_section_titles = currentVerseList.querySelectorAll('.sword-section-title');

      for (var i = 0; i < all_section_titles.length; i++) {
        var currentSectionTitle = all_section_titles[i];
        var currentParent = currentSectionTitle.parentNode;
        var parentClassList = currentParent.classList;

        // We verify that the section title is part of the verse text
        // (and not part of a chapter introduction or something similar).
        if (parentClassList.contains('verse-text')) {
          // Generate anchor for section headers
          var sectionHeaderAnchor = document.createElement('a');
          var chapter = currentSectionTitle.getAttribute('chapter');
          var sectionTitleContent = currentSectionTitle.textContent;
          var unixSectionHeaderId = app_controller.navigation_pane.getUnixSectionHeaderId(tabId, chapter, sectionTitleContent);
          sectionHeaderAnchor.setAttribute('name', unixSectionHeaderId);

          var verseBox = currentSectionTitle.closest('.verse-box');
          verseBox.before(sectionHeaderAnchor);
          verseBox.before(currentSectionTitle);
        }
      }

      if (this._sectionTitleOption.isChecked) {
        currentVerseList.classList.add('verse-list-with-section-titles');
      } else {
        currentVerseList.classList.remove('verse-list-with-section-titles');
      }
    }
  }

  showOrHideXrefsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._xrefsOption.isChecked) {
        currentReferenceVerse.removeClass('verse-list-without-xrefs');
        currentVerseList.removeClass('verse-list-without-xrefs');
        tagBoxVerseList.removeClass('verse-list-without-xrefs');
      } else {
        currentReferenceVerse.addClass('verse-list-without-xrefs');
        currentVerseList.addClass('verse-list-without-xrefs');
        tagBoxVerseList.addClass('verse-list-without-xrefs');
      }
    }
  }

  showOrHideFootnotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._footnotesOption.isChecked) {
        currentReferenceVerse.removeClass('verse-list-without-footnotes');
        currentVerseList.removeClass('verse-list-without-footnotes');
        tagBoxVerseList.removeClass('verse-list-without-footnotes');
      } else {
        currentReferenceVerse.addClass('verse-list-without-footnotes');
        currentVerseList.addClass('verse-list-without-footnotes');
        tagBoxVerseList.addClass('verse-list-without-footnotes');
      }
    }
  }

  showOrHideBookChapterNavigationBasedOnOption(tabIndex=undefined) {
    if (this._bookChapterNavOption.isChecked) {
      app_controller.navigation_pane.show(tabIndex);
    } else {
      app_controller.navigation_pane.hide(tabIndex);
    }
  }

  showOrHideHeaderNavigationBasedOnOption(tabIndex=undefined) {
    if (this._headerNavOption.isChecked &&
        app_controller.translation_controller.hasCurrentTranslationHeaderElements(tabIndex)) {

      app_controller.navigation_pane.enableHeaderNavigation(tabIndex);
    } else {
      app_controller.navigation_pane.disableHeaderNavigation();
    }
  }

  showOrHideTabSearchFormBasedOnOption(tabIndex=undefined, focus=false) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null && currentTab.tab_search != null) {
      if (this._tabSearchOption.isChecked) {
        currentTab.tab_search.show();
        if (focus) currentTab.tab_search.focus();
      } else {
        currentTab.tab_search.resetSearch();
      }
    }
  }

  showOrHideUserDataIndicatorsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var currentNavigationPane = app_controller.navigation_pane.getCurrentNavigationPane(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._userDataIndicatorOption.isChecked) {
        currentReferenceVerse.removeClass('verse-list-without-user-data-indicators');
        currentVerseList.removeClass('verse-list-without-user-data-indicators');
        currentNavigationPane.addClass('with-tag-indicators');
      } else {
        currentReferenceVerse.addClass('verse-list-without-user-data-indicators');
        currentVerseList.addClass('verse-list-without-user-data-indicators');
        currentNavigationPane.removeClass('with-tag-indicators');
      }
    }
  }

  showOrHideVerseTagsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._tagsOption.isChecked) {
        currentReferenceVerse.removeClass('verse-list-without-tags');
        currentVerseList.removeClass('verse-list-without-tags');
      } else {
        currentReferenceVerse.addClass('verse-list-without-tags');
        currentVerseList.addClass('verse-list-without-tags');
      }
    }
  }

  applyTagGroupFilterBasedOnOption() {
    if (this._tagGroupFilterOption.isChecked) {
      eventController.publishAsync('on-tag-group-filter-enabled');
    } else {
      eventController.publishAsync('on-tag-group-filter-disabled');
    }
  }

  showOrHideVerseNotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._verseNotesOption.isChecked) {
        currentReferenceVerse.addClass('verse-list-with-notes');
        currentVerseList.addClass('verse-list-with-notes');
      } else {
        app_controller.notes_controller.restoreCurrentlyEditedNotes();
        currentReferenceVerse.removeClass('verse-list-with-notes');
        currentVerseList.removeClass('verse-list-with-notes');
      }
    }
  }

  fixNotesHeightBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._verseNotesFixedHeightOption.isChecked) {
        currentReferenceVerse.addClass('verse-list-scroll-notes');
        currentVerseList.addClass('verse-list-scroll-notes');
      } else {
        currentReferenceVerse.removeClass('verse-list-scroll-notes');
        currentVerseList.removeClass('verse-list-scroll-notes');
      }
    }
  }

  keepScreenAwakeBasedOnOption() {
    if (!this.platformHelper.isCordova()) {
      return;
    } 

    if (this._keepScreenAwakeOption.isChecked) {
      this.cordovaPlatform.keepScreenAwake();
    } else {
      this.cordovaPlatform.allowScreenToSleep();
    }
  }

  changeTagsLayoutBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._tagsColumnOption.isChecked) {
        currentReferenceVerse.addClass('verse-list-tags-column');
        currentVerseList.addClass('verse-list-tags-column');
      } else {
        currentReferenceVerse.removeClass('verse-list-tags-column');
        currentVerseList.removeClass('verse-list-tags-column');
      }
    }
  }

  async refreshViewBasedOnOptions(tabIndex=undefined) {
    this.showOrHideBookIntroductionBasedOnOption(tabIndex);
    this.showOrHideSectionTitlesBasedOnOption(tabIndex);
    this.showOrHideBookChapterNavigationBasedOnOption(tabIndex);
    this.showOrHideTabSearchFormBasedOnOption(tabIndex);
    this.showOrHideXrefsBasedOnOption(tabIndex);
    this.showOrHideFootnotesBasedOnOption(tabIndex);
    this.showOrHideUserDataIndicatorsBasedOnOption(tabIndex);
    this.showOrHideVerseTagsBasedOnOption(tabIndex);
    this.applyTagGroupFilterBasedOnOption();
    this.changeTagsLayoutBasedOnOption(tabIndex);
    this.showOrHideVerseNotesBasedOnOption(tabIndex);
    this.fixNotesHeightBasedOnOption(tabIndex);
    this.showOrHideHeaderNavigationBasedOnOption(tabIndex);
    this.keepScreenAwakeBasedOnOption();
    theme_controller.useNightModeBasedOnOption();
  }
}

module.exports = OptionsMenu;

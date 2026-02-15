/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const dbSyncController = require('../../controllers/db_sync_controller.js');
const dropboxZipInstallController = require('../../controllers/dropbox_zip_install_controller.js');
const moduleUpdateController = require('../../controllers/module_update_controller.js');
const typeFaceSettings = require('../type_face_settings.js');

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

    this.MINIMUM_REFRESH_DISTANCE = 2000;
    this.lastRefreshViewTime = Date.now() - this.MINIMUM_REFRESH_DISTANCE - 1;
  }

  async init() {
    $('#show-translation-settings-button').bind('click', function() {
      app_controller.openModuleSettingsAssistant('BIBLE'); 
    });
  
    $('#show-dict-settings-button').bind('click', function() {
      app_controller.openModuleSettingsAssistant('DICT'); 
    });

    $('#show-commentary-settings-button').bind('click', function() {
      app_controller.openModuleSettingsAssistant('COMMENTARY'); 
    });

    $('#show-typeface-settings-button').bind('click', () => {
      this.hideDisplayMenu();
      typeFaceSettings.showTypeFaceSettingsDialog();
    });

    $('#show-module-update-button').bind('click', async () => {
      this.hideDisplayMenu();
      await moduleUpdateController.showModuleUpdateDialog();
    });

    $('#setup-db-sync-button').bind('click', async () => {
      this.hideDisplayMenu();
      await dbSyncController.showDbSyncConfigDialog();
    });

    $('#install-dropbox-zip-button').bind('click', async () => {
      this.hideDisplayMenu();
      await dropboxZipInstallController.showDropboxZipInstallDialog();
    });

    $('#displayOptionsBackButton').bind('click', () => {
      setTimeout(() => { this.hideDisplayMenu(); }, 100);
    });

    var openVerseListsInNewTabByDefault = false;
    var showSearchResultsInPopupByDefault = false;
    var bookChapterNavDefault = true;
    var userDataIndicatorDefault = true;
    var selectChapterBeforeLoadingDefault = false;

    if (this.platformHelper.isCordova() && !this.platformHelper.isMobile()) {
      openVerseListsInNewTabByDefault = true;
    }

    if (this.platformHelper.isMobile()) {
      openVerseListsInNewTabByDefault = true;
      showSearchResultsInPopupByDefault = false;
      bookChapterNavDefault = false;
      userDataIndicatorDefault = false;
      selectChapterBeforeLoadingDefault = true;
    }

    this._bookIntroOption = this.initConfigOption('showBookIntroOption', () => { this.showOrHideBookIntroductionBasedOnOption(); });
    this._sectionTitleOption = this.initConfigOption('showSectionTitleOption', () => { this.showOrHideSectionTitlesBasedOnOption(); });
    this._xrefsOption = this.initConfigOption('showXrefsOption', () => { this.showOrHideXrefsBasedOnOption(); });
    this._footnotesOption = this.initConfigOption('showFootnotesOption', () => { this.showOrHideFootnotesBasedOnOption(); });
    this._strongsOption = this.initConfigOption('showStrongsInlineOption', () => { this.showOrHideStrongsBasedOnOption(); });
    this._paragraphsOption = this.initConfigOption('showParagraphsOption', () => { this.showOrHideParagraphsBasedOnOption(); });
    this._redLetterOption = this.initConfigOption('redLetterOption', () => { this.renderRedLettersBasedOnOption(); });
    this._chapterHeadersOption = this.initConfigOption('showChapterHeadersOption', () => { this.showOrHideChapterHeadersBasedOnOption(); }, true);
    this._bookChapterNavOption = this.initConfigOption('showBookChapterNavigationOption', () => { this.showOrHideBookChapterNavigationBasedOnOption(); }, bookChapterNavDefault);
    this._headerNavOption = this.initConfigOption('showHeaderNavigationOption', () => { this.showOrHideHeaderNavigationBasedOnOption(); });
    this._tabSearchOption = this.initConfigOption('showTabSearchOption', () => { this.showOrHideTabSearchFormBasedOnOption(undefined, true); });
    this._verseListNewTabOption = this.initConfigOption('openVerseListsInNewTabOption', () => {}, openVerseListsInNewTabByDefault);
    this._showSearchResultsInPopupOption = this.initConfigOption('showSearchResultsInPopupOption', () => {}, showSearchResultsInPopupByDefault);
    this._userDataIndicatorOption = this.initConfigOption('showUserDataIndicatorOption', () => { this.showOrHideUserDataIndicatorsBasedOnOption(); }, userDataIndicatorDefault);
    this._tagsOption = this.initConfigOption('showTagsOption', () => { this.showOrHideVerseTagsBasedOnOption(); });
    this._tagGroupFilterOption = this.initConfigOption('useTagGroupFilterOption', () => { this.applyTagGroupFilterBasedOnOption(); });
    this._tagsColumnOption = this.initConfigOption('useTagsColumnOption', () => { this.changeTagsLayoutBasedOnOption(); });
    this._verseNotesOption = this.initConfigOption('showNotesOption', () => { this.showOrHideVerseNotesBasedOnOption(); });
    this._verseNotesFixedHeightOption = this.initConfigOption('fixNotesHeightOption', () => { this.fixNotesHeightBasedOnOption(); });
    this._keepScreenAwakeOption = this.initConfigOption('keepScreenAwakeOption', () => { this.keepScreenAwakeBasedOnOption(); });
    this._textSizeAdjustTagsNotesOption = this.initConfigOption('adjustTagsNotesTextSizeOption', () => { app_controller.textSizeSettings.updateTagsNotes(this._textSizeAdjustTagsNotesOption.isChecked); }, true);
    this._adjustSidePanelTextSizeOption = this.initConfigOption('adjustSidePanelTextSizeOption', () => { app_controller.textSizeSettings.updateSidePanel(this._adjustSidePanelTextSizeOption.isChecked); });
    this._selectChapterBeforeLoadingOption = this.initConfigOption('selectChapterBeforeLoadingOption', () => {}, selectChapterBeforeLoadingDefault);
    this._bookLoadingModeOption = this.initConfigOption('bookLoadingModeOption', async () => {});
    this._checkNewReleasesOption = this.initConfigOption('checkNewReleasesOption', async() => {});
    this._sendCrashReportsOption = this.initConfigOption('sendCrashReportsOption', async() => { this.toggleCrashReportsBasedOnOption(); });
    this._copyVerseReferenceBeforeTextOption = this.initConfigOption('copyVerseReferenceBeforeTextOption', () => {});
    this._limitTextWidthOption = this.initConfigOption('limitTextWidthOption', () => { this.toggleTextWidthBasedOnOption(); }, true);
    this._notesColumnOption = this.initConfigOption('useNotesColumnOption', () => { this.changeNotesLayoutBasedOnOption(); }, true);
    this._hideEmptyNotesOption = this.initConfigOption('hideEmptyNotesOption', () => { this.hideEmptyNotesBasedOnOption(); });

    this.initLocaleSwitchOption();
    await this.initNightModeOption();

    await this.adjustOptionsMenuForPlatform();
    this.refreshViewBasedOnOptions();

    eventController.subscribe('on-bible-text-loaded', async (context) => {
      this.showOrHideSectionTitlesBasedOnOption(context.tabIndex);
      this.showOrHideStrongsBasedOnOption(context.tabIndex);
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
    let handleThemeChange = async (systemTheme=false) => {
      this.hideDisplayMenu();
      uiHelper.showGlobalLoadingIndicator();

      if (systemTheme) {
        theme_controller.initMacOsEventHandler();
        theme_controller.toggleDarkModeIfNeeded();
      } else {
        theme_controller.useNightModeBasedOnOption();
      }

      const isMojaveOrLater = this.platformHelper.isMacOsMojaveOrLater();
      const useSystemTheme = await ipcSettings.get('useSystemTheme', false);

      if (isMojaveOrLater) {
        if (useSystemTheme) {
          // On macOS Mojave and later we can use the system theme if that's what the user wants.
          $(this._nightModeOption).hide();
        } else {
          $(this._nightModeOption).show();
        }
      }

      await waitUntilIdle();
      uiHelper.hideGlobalLoadingIndicator();
    };

    this._nightModeOption = this.initConfigOption('useNightModeOption', () => {
      handleThemeChange();
    });

    this._systemThemeOption = this.initConfigOption('useSystemTheme', () => {
      handleThemeChange(true);
    });

    this._nightModeOption.checked = await theme_controller.isNightModeUsed();

    const isMojaveOrLater = this.platformHelper.isMacOsMojaveOrLater();
    const useSystemTheme = await ipcSettings.get('useSystemTheme', false);

    if (isMojaveOrLater) {
      if (useSystemTheme) {
        // On macOS Mojave and later we can use the system theme if that's what the user wants.
        $(this._nightModeOption).hide();
      } else {
        $(this._nightModeOption).show();
      }
    } else {
      // Hide system theme option on all systems except macOS Mojave+
      $(this._systemThemeOption).hide();
    }
  }

  initLocaleSwitchOption() {
    this._localeSwitchOption = document.querySelector('#localeSwitchOption');

    this._localeSwitchOption.addEventListener('localeChanged', async (e) => {
      this.hideDisplayMenu();
      await waitUntilIdle();
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
    currentVerseListMenu.find('.display-options-button').unbind('click').bind('click', (event) => { this.handleMenuClick(event); });
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

      document.getElementById('display-options-menu').style.display = 'none';
      document.getElementById('display-options-menu').classList.remove('visible');
      this.menuIsOpened = false;

      var display_button = $('#app-container').find('.display-options-button');
      display_button.removeClass('ui-state-active');
    }
  }

  async updateDropboxZipButtonState() {
    const button = document.getElementById('install-dropbox-zip-button');
    if (button) {
      const isLinked = await dbSyncController.isDropboxLinked();
      button.disabled = !isLinked;
      if (!isLinked) {
        button.classList.add('ui-state-disabled');
      } else {
        button.classList.remove('ui-state-disabled');
      }
    }
  }

  async handleMenuClick(event) {
    if (this.menuIsOpened) {
      app_controller.handleBodyClick();
    } else {
      app_controller.hideAllMenus();

      // Update the Install modules from Dropbox button state
      await this.updateDropboxZipButtonState();

      var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
      var display_options_button = currentVerseListMenu.find('.display-options-button');
      var menu = $('#app-container').find('#display-options-menu');
      menu.addClass('visible');

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

  showOrHideChapterHeadersBasedOnOption(tabIndex=undefined) {
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      var chapterHeaders = currentVerseList.find('.chapter-header');

      if (this._chapterHeadersOption.isChecked) {
        chapterHeaders.show();
      } else {
        chapterHeaders.hide();
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
        var textClass = parentClassList.contains('first-bible-text') ? 'first-bible-text' : 'second-bible-text';

        // We verify that the section title is part of the verse text
        // (and not part of a chapter introduction or something similar).
        if (parentClassList.contains('verse-text')) {
          // Generate anchor for section headers
          var sectionHeaderAnchor = document.createElement('a');
          var chapter = currentSectionTitle.getAttribute('chapter');
          var sectionTitleContent = currentSectionTitle.textContent;
          var unixSectionHeaderId = app_controller.navigation_pane.getUnixSectionHeaderId(tabId, chapter, sectionTitleContent);
          sectionHeaderAnchor.setAttribute('name', unixSectionHeaderId);

          sectionHeaderAnchor.setAttribute('class', textClass);
          currentSectionTitle.classList.add(textClass);

          // Move the section title before the verse-box
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

  toggleCssClassBasedOnOption(elementList, option, cssClassDisplayNone, addClassWhenOptionChecked=false) {
    if (elementList == null || elementList.length == 0 || option == null || cssClassDisplayNone == null) {
      return;
    }

    elementList.forEach(element => {
      if (element != null) {
        if (addClassWhenOptionChecked) {
          if (option.isChecked) {
            element.classList.add(cssClassDisplayNone);
          } else {
            element.classList.remove(cssClassDisplayNone);
          }
        } else {
          if (option.isChecked) {
            element.classList.remove(cssClassDisplayNone);
          } else {
            element.classList.add(cssClassDisplayNone);
          }
        }
      }
    });
  }

  showOrHideXrefsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0], tagBoxVerseList[0]],
                                     this._xrefsOption,
                                     'verse-list-without-xrefs');
  }

  showOrHideFootnotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0], tagBoxVerseList[0]],
                                     this._footnotesOption,
                                     'verse-list-without-footnotes');
  }

  showOrHideStrongsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0], tagBoxVerseList[0]],
                                     this._strongsOption,
                                     'verse-list-without-strongs');
  }

  showOrHideParagraphsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0], tagBoxVerseList[0]],
                                     this._paragraphsOption,
                                     'verse-list-with-paragraphs',
                                     true);
  }

  renderRedLettersBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');
    var comparePanel = $('#compare-panel');

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0], tagBoxVerseList[0], comparePanel[0]],
                                     this._redLetterOption,
                                     'verse-list-with-red-letters',
                                     true);
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

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0], currentNavigationPane[0]],
                                     this._userDataIndicatorOption,
                                     'verse-list-without-user-data-indicators');
  }

  showOrHideVerseTagsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0]],
                                     this._tagsOption,
                                     'verse-list-without-tags');
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

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0]],
                                     this._verseNotesOption,
                                     'verse-list-with-notes',
                                     true);
  }

  fixNotesHeightBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0]],
                                     this._verseNotesFixedHeightOption,
                                     'verse-list-scroll-notes',
                                     true);
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

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0]],
                                     this._tagsColumnOption,
                                     'verse-list-tags-column',
                                     true);
  }

  changeNotesLayoutBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0]],
                                     this._notesColumnOption,
                                     'verse-list-notes-column',
                                     true);
  }

  hideEmptyNotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0]],
                                     this._hideEmptyNotesOption,
                                     'verse-list-hide-empty-notes',
                                     true);
  }

  async toggleCrashReportsBasedOnOption() {
    window.sendCrashReports = this._sendCrashReportsOption.isChecked;
    await ipcGeneral.setSendCrashReports(window.sendCrashReports);
  }

  toggleTextWidthBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);

    this.toggleCssClassBasedOnOption([currentReferenceVerse[0], currentVerseList[0]],
                                     this._limitTextWidthOption,
                                     'limit-width',
                                     true);
  }

  async refreshViewBasedOnOptions(tabIndex=undefined) {
    const now = Date.now();
    let timeSinceLastRefresh = 0;
    
    if (this.lastRefreshViewTime != 0) {
      timeSinceLastRefresh = now - this.lastRefreshViewTime;
    }

    if (timeSinceLastRefresh < this.MINIMUM_REFRESH_DISTANCE) {
      return;
    }

    this.lastRefreshViewTime = now;

    this.showOrHideBookIntroductionBasedOnOption(tabIndex);
    this.showOrHideChapterHeadersBasedOnOption(tabIndex);
    this.showOrHideSectionTitlesBasedOnOption(tabIndex);
    this.showOrHideBookChapterNavigationBasedOnOption(tabIndex);
    this.showOrHideTabSearchFormBasedOnOption(tabIndex);
    this.showOrHideXrefsBasedOnOption(tabIndex);
    this.showOrHideFootnotesBasedOnOption(tabIndex);
    this.showOrHideStrongsBasedOnOption(tabIndex);
    this.showOrHideParagraphsBasedOnOption(tabIndex);
    this.renderRedLettersBasedOnOption(tabIndex);
    this.showOrHideUserDataIndicatorsBasedOnOption(tabIndex);
    this.showOrHideVerseTagsBasedOnOption(tabIndex);
    this.applyTagGroupFilterBasedOnOption();
    this.changeTagsLayoutBasedOnOption(tabIndex);
    this.changeNotesLayoutBasedOnOption(tabIndex);
    this.hideEmptyNotesBasedOnOption(tabIndex);
    this.showOrHideVerseNotesBasedOnOption(tabIndex);
    this.fixNotesHeightBasedOnOption(tabIndex);
    this.showOrHideHeaderNavigationBasedOnOption(tabIndex);
    this.keepScreenAwakeBasedOnOption();
    theme_controller.useNightModeBasedOnOption();
    this.toggleTextWidthBasedOnOption(tabIndex);
  }
}

module.exports = OptionsMenu;

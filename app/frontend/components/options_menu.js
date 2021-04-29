/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const PlatformHelper = require('../../lib/platform_helper.js');
const DisplayOption = require('../ui_models/display_option.js');

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
      var CordovaPlatform = require('../platform/cordova_platform.js');
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

    var toolBarEnabledByDefault = true;
    var openVerseListsInNewTabByDefault = false;

    if (this.platformHelper.isCordova()) {
      toolBarEnabledByDefault = false;
      openVerseListsInNewTabByDefault = true;
    }

    this._toolBarOption = await this.initDisplayOption('tool-bar-switch', 'showToolBar', () => { this.showOrHideToolBarBasedOnOption(); }, toolBarEnabledByDefault);
    this._bookIntroOption = await this.initDisplayOption('book-intro-switch', 'showBookIntro', () => { this.showOrHideBookIntroductionBasedOnOption(); });
    this._sectionTitleOption = await this.initDisplayOption('section-title-switch', 'showSectionTitles', () => { this.showOrHideSectionTitlesBasedOnOption(); }, true);
    this._xrefsOption = await this.initDisplayOption('xrefs-switch', 'showXrefs', () => { this.showOrHideXrefsBasedOnOption(); });
    this._footnotesOption = await this.initDisplayOption('footnotes-switch', 'showFootnotes', () => { this.showOrHideFootnotesBasedOnOption(); });
    this._dictionaryOption = await this.initDisplayOption('strongs-switch', 'showStrongs', () => { this.showOrHideStrongsBasedOnOption(); });
    this._bookChapterNavOption = await this.initDisplayOption('nav-switch', 'showBookChapterNavigation', () => { this.showOrHideBookChapterNavigationBasedOnOption(); }, true);
    this._headerNavOption = await this.initDisplayOption('header-nav-switch', 'showHeaderNavigation', () => { this.showOrHideHeaderNavigationBasedOnOption(); });
    this._verseListNewTabOption = await this.initDisplayOption('verse-lists-new-tab-switch', 'openVerseListsInNewTab', () => {}, openVerseListsInNewTabByDefault);
    this._userDataIndicatorsOption = await this.initDisplayOption('user-data-indicators-switch', 'showUserDataIndicators', () => { this.showOrHideUserDataIndicatorsBasedOnOption(); }, true);
    this._tagsOption = await this.initDisplayOption('tags-switch', 'showTags', () => { this.showOrHideVerseTagsBasedOnOption(); }, true);
    this._tagsColumnOption = await this.initDisplayOption('tags-column-switch', 'useTagsColumn', () => { this.changeTagsLayoutBasedOnOption(); });
    this._verseNotesOption = await this.initDisplayOption('verse-notes-switch', 'showNotes', () => { this.showOrHideVerseNotesBasedOnOption(); });
    this._verseNotesFixedHeightOption = await this.initDisplayOption('verse-notes-fixed-height-switch', 'fixNotesHeight', () => { this.fixNotesHeightBasedOnOption(); });
    this._textSizeAdjustTagsNotesOption = await this.initDisplayOption('tags-notes-text-size-switch', 'adjustTagsNotesTextSize', () => { 
      app_controller.textSizeSettings.updateTagsNotes(this._textSizeAdjustTagsNotesOption.isChecked()); 
    }, true);

    this._nightModeOption = await this.initDisplayOption('night-mode-switch', 'useNightMode', async () => {
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
    }, false, // enabledByDefault
    async () => { // customSettingsLoader
      return await theme_controller.isNightModeUsed();
    });

    var isMojaveOrLater = await this.platformHelper.isMacOsMojaveOrLater();
    if (isMojaveOrLater) {
      // On macOS Mojave and later we do not give the user the option to switch night mode within the app, since it is controlled via system settings.
      $('#night-mode-switch-box').hide();
    }

    this._keepScreenAwakeOption = await this.initDisplayOption('screen-awake-switch', 'keepScreenAwake', () => { this.keepScreenAwakeBasedOnOption(); });

    if (!this.platformHelper.isCordova()) {
      // On the desktop (Electron) we do not need the screen-awake option!
      $('#screen-awake-switch-box').hide();
    }

    if (this.platformHelper.isCordova()) {
      // On the Cordova platform we cannot make use of the dictionary panel, because
      // it heavily depends on the mouse.
      $('#strongs-switch-box').hide();
    }

    this.refreshViewBasedOnOptions();
  }

  initCurrentOptionsMenu(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.display-options-button').bind('click', (event) => { this.handleMenuClick(event); });
  }

  async initDisplayOption(switchElementId, settingsKey, eventHandler, enabledByDefault=false, customSettingsLoader=undefined) {
    var option = new DisplayOption(switchElementId,
                                   settingsKey,
                                   window.ipcSettings,
                                   eventHandler,
                                   () => { this.slowlyHideDisplayMenu(); },
                                   customSettingsLoader,
                                   enabledByDefault);

    await option.loadOptionFromSettings();

    return option;
  }

  slowlyHideDisplayMenu() {
    setTimeout(() => {
      this.hideDisplayMenu();
    }, 300);
  }

  hideDisplayMenu() {
    if (this.menuIsOpened) {
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
      display_options_button.addClass('ui-state-active');

      var display_options_button_offset = display_options_button.offset();
      var menu = $('#app-container').find('#display-options-menu');
      var top_offset = display_options_button_offset.top + display_options_button.height() + 1;
      var left_offset = display_options_button_offset.left;
      if(left_offset+menu.width() > $(window).width()) {
        left_offset = ($(window).width() - menu.width()) / 2;
      }

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#display-options-menu').show();
      this.menuIsOpened = true;
      event.stopPropagation();
    }
  }

  async showOrHideToolBarBasedOnOption(tabIndex=undefined) {
    await waitUntilIdle();

    var currentToolBar = $('#bible-browser-toolbox');
    var updated = false;

    if (this._toolBarOption.isChecked()) {
      updated = app_controller.tag_assignment_menu.moveTagAssignmentList(false);
      if (updated || currentToolBar.is(':hidden')) {
        currentToolBar.show();
        updated = true;
      }
    } else {
      updated = app_controller.tag_assignment_menu.moveTagAssignmentList(true);
      if (updated || currentToolBar.is(':visible')) {
        currentToolBar.hide();
        updated = true;
      }
    }

    if (updated) uiHelper.resizeAppContainer(undefined, true);
  }

  showOrHideBookIntroductionBasedOnOption(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

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

      if (this._bookIntroOption.isChecked()) {
        bookIntro.show();
      } else {
        bookIntro.hide();
      }
    }
  }

  showOrHideSectionTitlesBasedOnOption(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex)[0];
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

      if (this._sectionTitleOption.isChecked()) {
        currentVerseList.classList.add('verse-list-with-section-titles');
      } else {
        currentVerseList.classList.remove('verse-list-with-section-titles');
      }
    }
  }

  showOrHideXrefsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._xrefsOption.isChecked()) {
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
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._footnotesOption.isChecked()) {
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

  showOrHideStrongsBasedOnOption(tabIndex=undefined) {
    var updated = false;

    if (!this._dictionaryOption.isChecked()) { 
      updated = app_controller.dictionary_controller.hideInfoBox();
      if (updated) {
        app_controller.dictionary_controller.clearInfoBox();
      }

      app_controller.dictionary_controller.hideStrongsBox(true);
    } else {
      updated = app_controller.dictionary_controller.showInfoBox();
    }

    if (updated) {
      uiHelper.resizeAppContainer();
    }
  }

  showOrHideBookChapterNavigationBasedOnOption(tabIndex=undefined) {
    if (this._bookChapterNavOption.isChecked()) {
      app_controller.navigation_pane.show(tabIndex);
    } else {
      app_controller.navigation_pane.hide(tabIndex);
    }
  }

  showOrHideHeaderNavigationBasedOnOption(tabIndex=undefined) {
    if (this._headerNavOption.isChecked() &&
        app_controller.translation_controller.hasCurrentTranslationHeaderElements(tabIndex)) {

      app_controller.navigation_pane.enableHeaderNavigation(tabIndex);

    } else {

      app_controller.navigation_pane.disableHeaderNavigation();

    }
  }

  showOrHideUserDataIndicatorsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._userDataIndicatorsOption.isChecked()) {
        currentReferenceVerse.removeClass('verse-list-without-user-data-indicators');
        currentVerseList.removeClass('verse-list-without-user-data-indicators');
      } else {
        currentReferenceVerse.addClass('verse-list-without-user-data-indicators');
        currentVerseList.addClass('verse-list-without-user-data-indicators');
      }
    }
  }

  showOrHideVerseTagsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._tagsOption.isChecked()) {
        currentReferenceVerse.removeClass('verse-list-without-tags');
        currentVerseList.removeClass('verse-list-without-tags');
      } else {
        currentReferenceVerse.addClass('verse-list-without-tags');
        currentVerseList.addClass('verse-list-without-tags');
      }
    }
  }

  showOrHideVerseNotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._verseNotesOption.isChecked()) {
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
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._verseNotesFixedHeightOption.isChecked()) {
        currentReferenceVerse.addClass('verse-list-scroll-notes');
        currentVerseList.addClass('verse-list-scroll-notes');
      } else {
        currentReferenceVerse.removeClass('verse-list-scroll-notes');
        currentVerseList.removeClass('verse-list-scroll-notes');
      }
    }
  }

  keepScreenAwakeBasedOnOption(tabIndex=undefined) {
    if (!this.platformHelper.isCordova()) {
      return;
    } 

    if (this._keepScreenAwakeOption.isChecked()) {
      this.cordovaPlatform.keepScreenAwake();
    } else {
      this.cordovaPlatform.allowScreenToSleep();
    }
  }

  changeTagsLayoutBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (currentVerseList[0] != null && currentVerseList[0] != undefined) {
      if (this._tagsColumnOption.isChecked()) {
        currentReferenceVerse.addClass('verse-list-tags-column');
        currentVerseList.addClass('verse-list-tags-column');
      } else {
        currentReferenceVerse.removeClass('verse-list-tags-column');
        currentVerseList.removeClass('verse-list-tags-column');
      }
    }
  }

  refreshViewBasedOnOptions(tabIndex=undefined) {
    this.showOrHideToolBarBasedOnOption(tabIndex);
    this.showOrHideBookIntroductionBasedOnOption(tabIndex);
    this.showOrHideSectionTitlesBasedOnOption(tabIndex);
    this.showOrHideBookChapterNavigationBasedOnOption(tabIndex);
    this.showOrHideHeaderNavigationBasedOnOption(tabIndex);
    this.showOrHideXrefsBasedOnOption(tabIndex);
    this.showOrHideFootnotesBasedOnOption(tabIndex);
    this.showOrHideUserDataIndicatorsBasedOnOption(tabIndex);
    this.showOrHideVerseTagsBasedOnOption(tabIndex);
    this.changeTagsLayoutBasedOnOption(tabIndex);
    this.showOrHideStrongsBasedOnOption(tabIndex);
    this.showOrHideVerseNotesBasedOnOption(tabIndex);
    this.fixNotesHeightBasedOnOption(tabIndex);
    this.keepScreenAwakeBasedOnOption(tabIndex);
    theme_controller.useNightModeBasedOnOption();
  }
}

module.exports = OptionsMenu;

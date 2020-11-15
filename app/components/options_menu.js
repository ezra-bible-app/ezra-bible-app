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
  }

  init() {
    $('#show-translation-settings-button').bind('click', function() {
      app_controller.openModuleSettingsAssistant('BIBLE'); 
    });
  
    $('#show-dict-settings-button').bind('click', function() {
      app_controller.openModuleSettingsAssistant('DICT'); 
    });

    this._toolBarOption = this.initDisplayOption('tool-bar-switch', 'showToolBar', () => { this.showOrHideToolBarBasedOnOption(); }, true);
    this._bookIntroOption = this.initDisplayOption('book-intro-switch', 'showBookIntro', () => { this.showOrHideBookIntroductionBasedOnOption(); });
    this._sectionTitleOption = this.initDisplayOption('section-title-switch', 'showSectionTitles', () => { this.showOrHideSectionTitlesBasedOnOption(); }, true);
    this._xrefsOption = this.initDisplayOption('xrefs-switch', 'showXrefs', () => { this.showOrHideXrefsBasedOnOption(); });
    this._footnotesOption = this.initDisplayOption('footnotes-switch', 'showFootnotes', () => { this.showOrHideFootnotesBasedOnOption(); });
    this._dictionaryOption = this.initDisplayOption('strongs-switch', 'showStrongs', () => { this.showOrHideStrongsBasedOnOption(); });
    this._headerNavOption = this.initDisplayOption('header-nav-switch', 'showHeaderNavigation', () => { this.showOrHideHeaderNavigationBasedOnOption(); });
    this._tagsOption = this.initDisplayOption('tags-switch', 'showTags', () => { this.showOrHideVerseTagsBasedOnOption(); }, true);
    this._tagsColumnOption = this.initDisplayOption('tags-column-switch', 'useTagsColumn', () => { this.changeTagsLayoutBasedOnOption(); });
    this._verseNotesOption = this.initDisplayOption('verse-notes-switch', 'showNotes', () => { this.showOrHideVerseNotesBasedOnOption(); });
    this._verseNotesFixedHeightOption = this.initDisplayOption('verse-notes-fixed-height-switch', 'fixNotesHeight', () => { this.fixNotesHeightBasedOnOption(); });

    this._nightModeOption = this.initDisplayOption('night-mode-switch', 'useNightMode', async () => {
      this.hideDisplayMenu();
      showGlobalLoadingIndicator();
      theme_controller.useNightModeBasedOnOption();
      await waitUntilIdle();
      hideGlobalLoadingIndicator();
    }, () => { // customSettingsLoader
      return theme_controller.isNightModeUsed();
    });

    if (platformHelper.isMacOsMojaveOrLater()) {
      // On macOS Mojave and later we do not give the user the option to switch night mode within the app, since it is controlled via system settings.
      $('#night-mode-switch-box').hide();
    }

    this.refreshViewBasedOnOptions();
  }

  initCurrentOptionsMenu(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.display-options-button').bind('click', (event) => { this.handleMenuClick(event); });
  }

  initDisplayOption(switchElementId, settingsKey, eventHandler, enabledByDefault=false, customSettingsLoader=undefined) {
    var option = new DisplayOption(switchElementId,
                                   settingsKey,
                                   app_controller.settings,
                                   eventHandler,
                                   () => { this.slowlyHideDisplayMenu(); },
                                   customSettingsLoader,
                                   enabledByDefault);
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
      app_controller.book_selection_menu.hide_book_menu();
      app_controller.tag_selection_menu.hideTagMenu();
      app_controller.module_search.hideSearchMenu();
      app_controller.tag_assignment_menu.hideTagAssignmentMenu();
      
      var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
      var display_options_button = currentVerseListMenu.find('.display-options-button');
      display_options_button.addClass('ui-state-active');

      var display_options_button_offset = display_options_button.offset();
      var menu = $('#app-container').find('#display-options-menu');
      var top_offset = display_options_button_offset.top + display_options_button.height() + 12;
      var left_offset = display_options_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#display-options-menu').show();
      this.menuIsOpened = true;
      event.stopPropagation();
    }
  }

  showOrHideToolBarBasedOnOption(tabIndex=undefined) {
    var currentToolBar = $('#bible-browser-toolbox');

    setTimeout(() => {
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

      if (updated) uiHelper.resizeAppContainer();
    }, 400);   
  }

  showOrHideBookIntroductionBasedOnOption(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

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

  showOrHideSectionTitlesBasedOnOption(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    // The following code moves the sword-section-title elements before the verse-boxes
    var all_section_titles = currentVerseList.find('.sword-section-title');
    for (var i = 0; i < all_section_titles.length; i++) {
      var currentSectionTitle = $(all_section_titles[i]);
      var currentParent = currentSectionTitle.parent();
      var closestChapterHeader = currentSectionTitle.closest('.chapter-header');

      if (currentParent.hasClass('verse-text')) {
        var verseBox = currentSectionTitle.closest('.verse-box');
        var closestChapterHeader = verseBox.prev();

        // Check if the section title contains the text from the chapter header
        // In this case we hide the section title, because we would otherwise show redundant information
        if (closestChapterHeader.text().length > 0 &&
            currentSectionTitle.text().toUpperCase().indexOf(closestChapterHeader.text().toUpperCase()) != -1) {

          currentSectionTitle.hide();
        }

        verseBox.before(currentSectionTitle);
      }
    }

    if (this._sectionTitleOption.isChecked()) {
      currentVerseList.addClass('verse-list-with-section-titles');
    } else {
      currentVerseList.removeClass('verse-list-with-section-titles');
    }
  }

  showOrHideXrefsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

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

  showOrHideFootnotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var tagBoxVerseList = $('#verse-list-popup-verse-list');

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

  showOrHideHeaderNavigationBasedOnOption(tabIndex=undefined) {
    if (this._headerNavOption.isChecked()) {
      app_controller.navigation_pane.enableHeaderNavigation();
    } else {
      app_controller.navigation_pane.disableHeaderNavigation();
    }
  }

  showOrHideVerseTagsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (this._tagsOption.isChecked()) {
      currentReferenceVerse.removeClass('verse-list-without-tags');
      currentVerseList.removeClass('verse-list-without-tags');
    } else {
      currentReferenceVerse.addClass('verse-list-without-tags');
      currentVerseList.addClass('verse-list-without-tags');
    }
  }

  showOrHideVerseNotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (this._verseNotesOption.isChecked()) {
      currentReferenceVerse.addClass('verse-list-with-notes');
      currentVerseList.addClass('verse-list-with-notes');
    } else {
      app_controller.notes_controller.restoreCurrentlyEditedNotes();
      currentReferenceVerse.removeClass('verse-list-with-notes');
      currentVerseList.removeClass('verse-list-with-notes');
    }
  }

  fixNotesHeightBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (this._verseNotesFixedHeightOption.isChecked()) {
      currentReferenceVerse.addClass('verse-list-scroll-notes');
      currentVerseList.addClass('verse-list-scroll-notes');
    } else {
      currentReferenceVerse.removeClass('verse-list-scroll-notes');
      currentVerseList.removeClass('verse-list-scroll-notes');
    }
  }

  changeTagsLayoutBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = app_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    if (this._tagsColumnOption.isChecked()) {
      currentReferenceVerse.addClass('verse-list-tags-column');
      currentVerseList.addClass('verse-list-tags-column');
    } else {
      currentReferenceVerse.removeClass('verse-list-tags-column');
      currentVerseList.removeClass('verse-list-tags-column');
    }
  }

  refreshViewBasedOnOptions(tabIndex=undefined) {
    this.showOrHideToolBarBasedOnOption(tabIndex);
    this.showOrHideBookIntroductionBasedOnOption(tabIndex);
    this.showOrHideSectionTitlesBasedOnOption(tabIndex);
    this.showOrHideXrefsBasedOnOption(tabIndex);
    this.showOrHideFootnotesBasedOnOption(tabIndex);
    this.showOrHideVerseTagsBasedOnOption(tabIndex);
    this.changeTagsLayoutBasedOnOption(tabIndex);
    this.showOrHideStrongsBasedOnOption(tabIndex);
    this.showOrHideVerseNotesBasedOnOption(tabIndex);
    this.fixNotesHeightBasedOnOption(tabIndex);
    theme_controller.useNightModeBasedOnOption();
  }
}

module.exports = OptionsMenu;

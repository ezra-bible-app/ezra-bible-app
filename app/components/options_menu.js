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

const Darkmode = require('darkmode-js');
const DisplayOption = require('./display_option.js');

class OptionsMenu {
  constructor() {
    this.menuIsOpened = false;
    this.darkMode = null;
  }

  toggleDarkModeIfNeeded() {
    if (platformHelper.isMacOsMojaveOrLater()) {
      const nativeTheme = require('electron').remote.nativeTheme;

      if (nativeTheme.shouldUseDarkColors) {
        this._nightModeOption.enableOption();
      } else {
        this._nightModeOption.disableOption();
      }

      this.useNightModeBasedOnOption();
    }
  }

  initDisplayOption(switchElementId, settingsKey, eventHandler, enabledByDefault=false, customSettingsLoader=undefined) {
    var option = new DisplayOption(switchElementId,
                                   settingsKey,
                                   bible_browser_controller.settings,
                                   eventHandler,
                                   () => { this.slowlyHideDisplayMenu(); },
                                   customSettingsLoader,
                                   enabledByDefault);
    return option;
  }

  initCurrentOptionsMenu(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.display-options-button').bind('click', (event) => { this.handleMenuClick(event); });
  }

  initAllDisplayOptions() {
    $('#show-translation-settings-button').bind('click', function() {
      bible_browser_controller.openModuleSettingsWizard('BIBLE'); 
    });
  
    $('#show-dict-settings-button').bind('click', function() {
      bible_browser_controller.openModuleSettingsWizard('DICT'); 
    });

    this._toolBarOption = this.initDisplayOption('tool-bar-switch', 'showToolBar', () => { this.showOrHideToolBarBasedOnOption(); }, true);
    this._bookIntroOption = this.initDisplayOption('book-intro-switch', 'showBookIntro', () => { this.showOrHideBookIntroductionBasedOnOption(); });
    this._sectionTitleOption = this.initDisplayOption('section-title-switch', 'showSectionTitles', () => { this.showOrHideSectionTitlesBasedOnOption(); }, true);
    this._xrefsOption = this.initDisplayOption('xrefs-switch', 'showXrefs', () => { this.showOrHideXrefsBasedOnOption(); });
    this._footnotesOption = this.initDisplayOption('footnotes-switch', 'showFootnotes', () => { this.showOrHideFootnotesBasedOnOption(); });
    this._dictionaryOption = this.initDisplayOption('strongs-switch', 'showStrongs', () => { this.showOrHideStrongsBasedOnOption(); });
    this._tagsOption = this.initDisplayOption('tags-switch', 'showTags', () => { this.showOrHideVerseTagsBasedOnOption(); }, true);
    this._tagsColumnOption = this.initDisplayOption('tags-column-switch', 'useTagsColumn', () => { this.changeTagsLayoutBasedOnOption(); });
    this._verseNotesOption = this.initDisplayOption('verse-notes-switch', 'showNotes', () => { this.showOrHideVerseNotesBasedOnOption(); });
    this._verseNotesFixedHeightOption = this.initDisplayOption('verse-notes-fixed-height-switch', 'fixNotesHeight', () => { this.fixNotesHeightBasedOnOption(); });

    this._nightModeOption = this.initDisplayOption('night-mode-switch', 'useNightMode', async () => {
      showGlobalLoadingIndicator();
      this.useNightModeBasedOnOption();
      await waitUntilIdle();
      hideGlobalLoadingIndicator();
    }, () => { // customSettingsLoader
      var useNightMode = false;

      if (platformHelper.isMacOsMojaveOrLater()) {
        const nativeTheme = require('electron').remote.nativeTheme;
        useNightMode = nativeTheme.shouldUseDarkColors;
      } else {
        if (bible_browser_controller.settings.has('useNightMode')) {
          useNightMode = bible_browser_controller.settings.get('useNightMode');
        }
      }

      return useNightMode;
    });

    if (platformHelper.isMacOsMojaveOrLater()) {
      // On macOS Mojave and later we do not give the user the option to switch night mode within the app, since it is controlled via system settings.
      $('#night-mode-switch-box').hide();
    }

    this.refreshViewBasedOnOptions();
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
      bible_browser_controller.handleBodyClick();
    } else {
      bible_browser_controller.book_selection_menu.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hideTagMenu();
      bible_browser_controller.module_search.hideSearchMenu();
      bible_browser_controller.tag_assignment_menu.hideTagAssignmentMenu();
      
      var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
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
        updated = bible_browser_controller.tag_assignment_menu.moveTagAssignmentList(false);
        if (updated || currentToolBar.is(':hidden')) {
          currentToolBar.show();
          updated = true;
        }
      } else {
        updated = bible_browser_controller.tag_assignment_menu.moveTagAssignmentList(true);
        if (updated || currentToolBar.is(':visible')) {
          currentToolBar.hide();
          updated = true;
        }
      }

      if (updated) uiHelper.resizeAppContainer();
    }, 400);   
  }

  showOrHideBookIntroductionBasedOnOption(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

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
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

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
    var currentReferenceVerse = bible_browser_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
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
    var currentReferenceVerse = bible_browser_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
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
      updated = bible_browser_controller.dictionary_controller.hideInfoBox();
      if (updated) {
        bible_browser_controller.dictionary_controller.clearInfoBox();
      }

      bible_browser_controller.dictionary_controller.hideStrongsBox(true);
    } else {
      updated = bible_browser_controller.dictionary_controller.showInfoBox();
    }

    if (updated) {
      uiHelper.resizeAppContainer();
    }
  }

  showOrHideVerseTagsBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = bible_browser_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    if (this._tagsOption.isChecked()) {
      currentReferenceVerse.removeClass('verse-list-without-tags');
      currentVerseList.removeClass('verse-list-without-tags');
    } else {
      currentReferenceVerse.addClass('verse-list-without-tags');
      currentVerseList.addClass('verse-list-without-tags');
    }
  }

  showOrHideVerseNotesBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = bible_browser_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    if (this._verseNotesOption.isChecked()) {
      currentReferenceVerse.addClass('verse-list-with-notes');
      currentVerseList.addClass('verse-list-with-notes');
    } else {
      bible_browser_controller.notes_controller.restoreCurrentlyEditedNotes();
      currentReferenceVerse.removeClass('verse-list-with-notes');
      currentVerseList.removeClass('verse-list-with-notes');
    }
  }

  fixNotesHeightBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = bible_browser_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    if (this._verseNotesFixedHeightOption.isChecked()) {
      currentReferenceVerse.addClass('verse-list-scroll-notes');
      currentVerseList.addClass('verse-list-scroll-notes');
    } else {
      currentReferenceVerse.removeClass('verse-list-scroll-notes');
      currentVerseList.removeClass('verse-list-scroll-notes');
    }
  }

  changeTagsLayoutBasedOnOption(tabIndex=undefined) {
    var currentReferenceVerse = bible_browser_controller.getCurrentReferenceVerse(tabIndex);
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    if (this._tagsColumnOption.isChecked()) {
      currentReferenceVerse.addClass('verse-list-tags-column');
      currentVerseList.addClass('verse-list-tags-column');
    } else {
      currentReferenceVerse.removeClass('verse-list-tags-column');
      currentVerseList.removeClass('verse-list-tags-column');
    }
  }

  useNightModeBasedOnOption(force=false) {
    if (force || this._nightModeOption.isChecked(force)) {
      switchToDarkTheme();
    } else {
      switchToRegularTheme();
    }

    if (this.darkMode == null) {
      this.darkMode = new Darkmode();
    }

    var nightModeOptionChecked = force ? true : this._nightModeOption?.isChecked();

    if (nightModeOptionChecked && !this.darkMode.isActivated() ||
        !nightModeOptionChecked && this.darkMode.isActivated()) {
          
      this.darkMode.toggle();
      // We need to repaint all charts, because the label color depends on the theme
      bible_browser_controller.module_search.repaintAllCharts();
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
    this.useNightModeBasedOnOption();
  }
}

module.exports = OptionsMenu;

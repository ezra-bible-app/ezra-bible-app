/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const Darkmode = require('darkmode-js');

class OptionsMenu {
  constructor() {
    this.menuIsOpened = false;
    this.darkMode = null;
  }

  toggleDarkModeIfNeeded() {
    if (isMac()) {
      const nativeTheme = require('electron').remote.nativeTheme;

      if (nativeTheme.shouldUseDarkColors) {
        this.enableOption('night-mode-switch');
      } else {
        this.disableOption('night-mode-switch');
      }

      this.useNightModeBasedOnOption();
    }
  }

  initCurrentOptionsMenu(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.display-options-button').bind('click', (event) => { this.handleMenuClick(event); });

    $('#show-translation-settings-button').bind('click', function() {
      bible_browser_controller.openTranslationSettingsWizard(); 
    });
    
    $('#tool-bar-switch').bind('change', () => {
      bible_browser_controller.settings.set('showToolBar', this.toolBarSwitchChecked());
      this.showOrHideToolBarBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#book-intro-switch').bind('change', () => {
      bible_browser_controller.settings.set('showBookIntro', this.bookIntroductionSwitchChecked());
      this.showOrHideBookIntroductionBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#section-title-switch').bind('change', () => {
      bible_browser_controller.settings.set('showSectionTitles', this.sectionTitleSwitchChecked());
      this.showOrHideSectionTitlesBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#strongs-switch').bind('change', () => {
      bible_browser_controller.settings.set('showStrongs', this.strongsSwitchChecked());
      this.showOrHideStrongsBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#tags-switch').bind('change', () => {
      bible_browser_controller.settings.set('showTags', this.tagsSwitchChecked());
      this.showOrHideVerseTagsBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#tags-column-switch').bind('change', () => {
      bible_browser_controller.settings.set('useTagsColumn', this.tagsColumnSwitchChecked());
      this.changeTagsLayoutBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#night-mode-switch').bind('change', () => {
      bible_browser_controller.settings.set('useNightMode', this.nightModeSwitchChecked());
      this.hideDisplayMenu();
      showGlobalLoadingIndicator();

      setTimeout(() => {
        this.useNightModeBasedOnOption();
      }, 100);
    });

    $('#verse-notes-switch').bind('change', () => {
      bible_browser_controller.settings.set('showNotes', this.verseNotesSwitchChecked());
      this.showOrHideVerseNotesBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    /*
    // Enable the cross reference display by default
    $('#x-refs-switch').attr('checked', 'checked');
    $('#x-refs-switch').removeAttr('disabled');
    $('#x-refs-switch').bind('change', function() {
      bible_browser_controller.show_or_hide_xrefs_based_on_option();
    });*/
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

  enableOption(optionId) {
    $('#' + optionId).attr('checked', 'checked');
    $('#' + optionId).removeAttr('disabled');
    $('#' + optionId + '-box').addClass('ui-state-active'); 
  }

  disableOption(optionId) {
    $('#' + optionId).removeAttr('checked');
    //$('#' + optionId).removeAttr('disabled');
    $('#' + optionId + '-box').removeClass('ui-state-active');    
  }

  loadDisplayOptions() {
    // Enable the tag list by default
    var showToolBar = true;
    if (bible_browser_controller.settings.has('showToolBar')) {
      showToolBar = bible_browser_controller.settings.get('showToolBar');
    }    

    var showBookIntro = false;
    if (bible_browser_controller.settings.has('showBookIntro')) {
      showBookIntro = bible_browser_controller.settings.get('showBookIntro');
    }

    // Enable section titles by default
    var showSectionTitles = true;
    if (bible_browser_controller.settings.has('showSectionTitles')) {
      showSectionTitles = bible_browser_controller.settings.get('showSectionTitles');
    }

    var showStrongs = false;
    if (bible_browser_controller.settings.has('showStrongs')) {
      showStrongs = bible_browser_controller.settings.get('showStrongs');
    }

    // Enable the tags display by default
    var showTags = true;
    if (bible_browser_controller.settings.has('showTags')) {
      showTags = bible_browser_controller.settings.get('showTags');
    }

    var useTagsColumn = false;
    if (bible_browser_controller.settings.has('useTagsColumn')) {
      useTagsColumn = bible_browser_controller.settings.get('useTagsColumn');
    }

    var useNightMode = false;
    if (bible_browser_controller.settings.has('useNightMode')) {
      useNightMode = bible_browser_controller.settings.get('useNightMode');
    }

    var showNotes = false;
    if (bible_browser_controller.settings.has('showNotes')) {
      showNotes = bible_browser_controller.settings.get('showNotes');
    }

    if (showToolBar) {
      this.enableOption('tool-bar-switch');
    }

    if (showBookIntro) {
      this.enableOption('book-intro-switch');
    }

    if (showSectionTitles) {
      this.enableOption('section-title-switch');
    }

    if (showStrongs) {
      this.enableOption('strongs-switch');
    }

    if (showTags) {
      this.enableOption('tags-switch');
    }

    if (showNotes) {
      this.enableOption('verse-notes-switch');
    }

    if (useTagsColumn) {
      this.enableOption('tags-column-switch');
    }

    if (useNightMode) {
      this.enableOption('night-mode-switch');
    }

    this.refreshViewBasedOnOptions();
  }

  showOrHideToolBarBasedOnOption(tabIndex=undefined) {
    var currentToolBar = $('#bible-browser-toolbox');

    setTimeout(() => {
      if (this.toolBarSwitchChecked()) {
      
        bible_browser_controller.tag_assignment_menu.moveTagAssignmentList(false);
        currentToolBar.show();
      } else {
        currentToolBar.hide();
        bible_browser_controller.tag_assignment_menu.moveTagAssignmentList(true);
      }

      uiHelper.resizeAppContainer();
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

    if (this.bookIntroductionSwitchChecked()) {
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

    if (this.sectionTitleSwitchChecked()) {
      currentVerseList.addClass('verse-list-with-section-titles');
    } else {
      currentVerseList.removeClass('verse-list-with-section-titles');
    }
  }

  showOrHideStrongsBasedOnOption(tabIndex=undefined) {
    if (!this.strongsSwitchChecked()) { 
      bible_browser_controller.strongs.dictionaryInfoBox.hide();
      bible_browser_controller.strongs.clearDictInfoBox();
      bible_browser_controller.strongs.hideStrongsBox(true);
    } else {
      bible_browser_controller.strongs.dictionaryInfoBox.show();
    }
    uiHelper.resizeAppContainer();
  }

  showOrHideVerseTagsBasedOnOption(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    if (this.tagsSwitchChecked()) {
      currentVerseList.removeClass('verse-list-without-tags');
    } else {
      currentVerseList.addClass('verse-list-without-tags');
    }
  }

  showOrHideVerseNotesBasedOnOption() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    if (this.verseNotesSwitchChecked()) {
      currentVerseList.addClass('verse-list-with-notes');
    } else {
      bible_browser_controller.notes_controller.restoreCurrentlyEditedNotes();
      currentVerseList.removeClass('verse-list-with-notes');
    }
  }

  changeTagsLayoutBasedOnOption(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    if (this.tagsColumnSwitchChecked()) {
      currentVerseList.addClass('verse-list-tags-column');
    } else {
      currentVerseList.removeClass('verse-list-tags-column');
    }
  }

  useNightModeBasedOnOption(force=false) {
    if (this.nightModeSwitchChecked(force)) {
      switchToDarkTheme();
    } else {
      switchToRegularTheme();
    }

    if (this.darkMode == null) {
      this.darkMode = new Darkmode();
    }

    if (this.nightModeSwitchChecked(force) && !this.darkMode.isActivated() ||
        !this.nightModeSwitchChecked(force) && this.darkMode.isActivated()) {
          
      this.darkMode.toggle();
      // We need to repaint all charts, because the label color depends on the theme
      bible_browser_controller.module_search.repaintAllCharts();
    }

    if (!force) {
      setTimeout(() => {
        hideGlobalLoadingIndicator();
      }, 50);
    }
  }

  refreshViewBasedOnOptions(tabIndex=undefined) {
    this.showOrHideToolBarBasedOnOption(tabIndex);
    this.showOrHideBookIntroductionBasedOnOption(tabIndex);
    this.showOrHideSectionTitlesBasedOnOption(tabIndex);
    this.showOrHideVerseTagsBasedOnOption(tabIndex);
    this.changeTagsLayoutBasedOnOption(tabIndex);
    this.showOrHideStrongsBasedOnOption(tabIndex);
    this.showOrHideVerseNotesBasedOnOption(tabIndex);
    this.useNightModeBasedOnOption();
  }

  toolBarSwitchChecked() {
    return $('#tool-bar-switch').prop('checked');    
  }

  verseNotesSwitchChecked() {
    return $('#verse-notes-switch').prop('checked');
  }

  bookIntroductionSwitchChecked() {
    return $('#book-intro-switch').prop('checked');
  }

  sectionTitleSwitchChecked() {
    return $('#section-title-switch').prop('checked');
  }

  strongsSwitchChecked() {
    return $('#strongs-switch').prop('checked');
  }

  tagsSwitchChecked() {
    return $('#tags-switch').prop('checked');
  }

  tagsColumnSwitchChecked() {
    return $('#tags-column-switch').prop('checked');
  }

  nightModeSwitchChecked(force=false) {
    if (force) {
      return true;
    } else {
      return $('#night-mode-switch').prop('checked');
    }
  }
}

module.exports = OptionsMenu;

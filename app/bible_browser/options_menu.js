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

class OptionsMenu {
  constructor() {
    this.menuIsOpened = false;
  }

  initCurrentOptionsMenu(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.display-options-button').bind('click', (event) => { this.handleMenuClick(event); });
    
    $('#section-title-switch').bind('change', () => {
      this.showOrHideSectionTitlesBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#strongs-switch').bind('change', () => {
      this.showOrHideStrongsBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#tags-switch').bind('change', () => {
      this.showOrHideVerseTagsBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    $('#tags-column-switch').bind('change', () => {
      this.changeTagsLayoutBasedOnOption();
      this.slowlyHideDisplayMenu();
    });

    /*$('#verse-notes-switch').bind('change', function() {
      bible_browser_controller.show_or_hide_verse_notes_based_on_option();
    });
    $('#verse-notes-switch').removeAttr('disabled');

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
    }, 500);
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
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.book_selection_menu.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.module_search.hide_search_menu();
      var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
      var display_options_button = currentVerseListMenu.find('.display-options-button');
      display_options_button.addClass('ui-state-active');

      var display_options_button_offset = display_options_button.offset();
      var menu = $('#app-container').find('#display-options-menu');
      var top_offset = display_options_button_offset.top + display_options_button.height() + 12;
      var left_offset = display_options_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#display-options-menu').slideDown();
      this.menuIsOpened = true;
      event.stopPropagation();
    }
  }

  loadDisplayOptions() {
    var showSectionTitles = false;
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

    if (showSectionTitles) {
      $('#section-title-switch').attr('checked', 'checked');
      $('#section-title-switch').removeAttr('disabled');
      $('#section-title-switch-box').addClass('ui-state-active');
    }

    if (showStrongs) {
      $('#strongs-switch').attr('checked', 'checked');
      $('#strongs-switch').removeAttr('disabled');
      $('#strongs-switch-box').addClass('ui-state-active');      
    }

    if (showTags) {
      $('#tags-switch').attr('checked', 'checked');
      $('#tags-switch').removeAttr('disabled');
      $('#tags-switch-box').addClass('ui-state-active');
    }

    if (useTagsColumn) {
      $('#tags-column-switch').attr('checked', 'checked');
      $('#tags-column-switch').removeAttr('disabled');
      $('#tags-column-switch-box').addClass('ui-state-active');
    }   
    
    this.showOrHideSectionTitlesBasedOnOption();
    this.showOrHideStrongsBasedOnOption();
    this.showOrHideVerseTagsBasedOnOption();
    this.changeTagsLayoutBasedOnOption();
  }

  showOrHideSectionTitlesBasedOnOption(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    bible_browser_controller.settings.set('showSectionTitles', this.sectionTitleSwitchChecked());

    // The following code moves the sword-section-title elements before the verse-boxes
    var all_section_titles = currentVerseList.find('.sword-section-title');
    for (var i = 0; i < all_section_titles.length; i++) {
      var currentSectionTitle = $(all_section_titles[i]);
      var currentParent = currentSectionTitle.parent();

      if (currentParent.hasClass('verse-text')) {
        var verseBox = currentSectionTitle.closest('.verse-box');
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
    bible_browser_controller.settings.set('showStrongs', this.strongsSwitchChecked());
    if (!this.strongsSwitchChecked()) { 
      bible_browser_controller.strongs_controller.hideStrongsBox(true);
      bible_browser_controller.strongs_controller.clearDictInfoBox();
    }
    resize_app_container();
  }

  showOrHideVerseTagsBasedOnOption(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    bible_browser_controller.settings.set('showTags', this.tagsSwitchChecked());

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
      if ($('#currently-edited-notes').length > 0) {
        // If the user wants to hide the notes the currently edited note
        // has to be restored as well
        notes_controller.restore_currently_edited_notes();
      }
      currentVerseList.removeClass('verse-list-with-notes');
    }
  }

  changeTagsLayoutBasedOnOption(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    bible_browser_controller.settings.set('useTagsColumn', this.tagsColumnSwitchChecked());

    if (this.tagsColumnSwitchChecked()) {
      currentVerseList.addClass('verse-list-tags-column');
    } else {
      currentVerseList.removeClass('verse-list-tags-column');
    }
  }

  refreshViewBasedOnOptions(tabIndex=undefined) {
    this.showOrHideSectionTitlesBasedOnOption(tabIndex);
    this.showOrHideVerseTagsBasedOnOption(tabIndex);
    this.changeTagsLayoutBasedOnOption(tabIndex);
  }

  verseNotesSwitchChecked() {
    return $('#verse-notes-switch').attr('checked');
  }

  sectionTitleSwitchChecked() {
    return $('#section-title-switch').attr('checked');
  }

  strongsSwitchChecked() {
    return $('#strongs-switch').attr('checked');
  }

  tagsSwitchChecked() {
    return $('#tags-switch').attr('checked');
  }

  tagsColumnSwitchChecked() {
    return $('#tags-column-switch').attr('checked');
  }
}

module.exports = OptionsMenu;
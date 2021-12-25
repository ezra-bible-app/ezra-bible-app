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

const TagStore = require('../components/tags/tag_store.js');
const TagListFilter = require('../components/tags/tag_list_filter.js');
const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const VerseBox = require('../ui_models/verse_box.js');
require('../components/emoji_button_trigger.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const eventController = require('./event_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');

/**
 * The TagsController handles most functionality related to tagging of verses.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.tags_controller`.
 * 
 * @category Controller
 */
class TagsController {
  constructor() {
    loadScript("app/templates/tag_list.js");

    this.tag_store = new TagStore();
    this.tag_list_filter = new TagListFilter();
    this.tag_store.onLatestUsedTagChanged = (tagId) => { app_controller.assign_last_tag_button.onLatestUsedTagChanged(tagId); };
    this.verse_box_helper = new VerseBoxHelper();
    this.tag_stats_element_cache = {};

    this.new_standard_tag_button = $('#new-standard-tag-button');
    this.verse_selection_blocked = false;
    this.verses_were_selected_before = false;

    this.assign_tag_label = i18n.t("tags.assign-tag");
    this.unassign_tag_label = i18n.t("tags.remove-tag-assignment");
  
    this.tag_to_be_deleted = null;
    this.tag_to_be_deleted_title = null;
    this.tag_to_be_deleted_is_global = false;
  
    this.remove_tag_assignment_job = null;
    this.new_tag_created = false;
    this.last_created_tag = "";
  
    this.rename_standard_tag_id = null;
  
    //this.xml_tag_statistics = null; // FIXME
    this.loading_indicator = "<img class=\"loading-indicator\" style=\"float: left; margin-left: 0.5em;\" " +
                             "width=\"16\" height=\"16\" src=\"images/loading_animation.gif\" />";
  
    this.selected_verse_references = [];
    this.selected_verse_boxes = [];

    this.initialRenderingDone = false;
    this.newTagDialogInitDone = false;
    this.deleteTagConfirmationDialogInitDone = false;
    this.removeTagAssignmentConfirmationDialogInitDone = false;
    this.renameStandardTagDialogInitDone = false;
    this.lastContentId = null;

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
      this.verses_were_selected_before = true;
      await this.updateTagsView(tabIndex);

    });

    eventController.subscribe('on-locale-changed', async () => {
      this.updateTagsView(undefined, true);
      this.refreshTagDialogs();
    });

    eventController.subscribe('on-translation-removed', async () => {
      await this.updateTagUiBasedOnTagAvailability();
    });

    eventController.subscribe('on-verses-selected', async () => {
      await this.updateTagsViewAfterVerseSelection(false);
    });
  }

  /**
   * This is used to refresh the dialogs after the locale changed
   */
  refreshTagDialogs() {
    this.initNewTagDialog(true);
    this.initRenameStandardTagDialog(true);
    this.initRemoveTagAssignmentConfirmationDialog(true);
    this.initDeleteTagConfirmationDialog(true);
  }

  initNewTagDialog(force=false) {
    if (!force && this.newTagDialogInitDone) {
      return;
    }

    this.newTagDialogInitDone = true;

    var new_standard_tag_dlg_options = {
      title: i18n.t("tags.new-tag"),
      width: 400,
      position: [60,180],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    };
  
    new_standard_tag_dlg_options.buttons = {};
    new_standard_tag_dlg_options.buttons[i18n.t("general.cancel")] = function() {
      $(this).dialog("close");
    };
    new_standard_tag_dlg_options.buttons[i18n.t("tags.create-tag")] = {
      id: 'create-tag-button',
      text: i18n.t("tags.create-tag"),
      click: function() {
        tags_controller.saveNewTag(this, "standard");
      }
    };
  
    $('#new-standard-tag-dialog').dialog(new_standard_tag_dlg_options);

    // Handle the enter key in the tag title field and create the tag when it is pressed
    $('#new-standard-tag-title-input:not(.bound)').addClass('bound').on("keypress", async (event) => {
      if (event.which == 13) {
        var tag_title = $('#new-standard-tag-title-input').val();
        var tag_existing = await this.updateButtonStateBasedOnTagTitleValidation(tag_title, 'create-tag-button');

        if (tag_existing) {
          return;
        }

        $('#new-standard-tag-dialog').dialog("close");
        tags_controller.saveNewTag(event, "standard");
      }
    // eslint-disable-next-line no-unused-vars
    }).on("keyup", async (event) => {
      var tag_title = $('#new-standard-tag-title-input').val();
      await this.updateButtonStateBasedOnTagTitleValidation(tag_title, 'create-tag-button');
    });
  }

  async updateButtonStateBasedOnTagTitleValidation(tagTitle, buttonId) {
    var tag_existing = await this.tagExists(tagTitle);
    let tagButton = document.getElementById(buttonId);

    if (tag_existing || tagTitle == "") {
      tagButton.classList.add('ui-state-disabled');
      tagButton.setAttribute('disabled', true);
    } else {
      tagButton.classList.remove('ui-state-disabled');
      tagButton.removeAttribute('disabled');
    }

    return tag_existing;
  }

  async tagExists(tagTitle) {
    return await this.tag_store.tagExists(tagTitle);
  }

  initDeleteTagConfirmationDialog(force=false) {
    if (!force && this.deleteTagConfirmationDialogInitDone) {
      return;
    }

    this.deleteTagConfirmationDialogInitDone = true;

    var delete_tag_confirmation_dlg_options = {
      title: i18n.t("tags.delete-tag"),
      width: 300,
      position: [60,180],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    };
  
    delete_tag_confirmation_dlg_options.buttons = {};
    delete_tag_confirmation_dlg_options.buttons[i18n.t("general.cancel")] = function() {
      $(this).dialog("close");
    };
    delete_tag_confirmation_dlg_options.buttons[i18n.t("tags.delete-tag")] = function() {
      tags_controller.deleteTagAfterConfirmation();
    };

    $('#delete-tag-confirmation-dialog').dialog(delete_tag_confirmation_dlg_options);
  }

  initRemoveTagAssignmentConfirmationDialog(force=false) {
    if (!force && this.removeTagAssignmentConfirmationDialogInitDone) {
      return;
    }

    this.removeTagAssignmentConfirmationDialogInitDone = true;

    var remove_tag_assignment_confirmation_dlg_options = {
      title: i18n.t("tags.remove-tag-assignment"),
      width: 360,
      position: [40,250],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    };
  
    remove_tag_assignment_confirmation_dlg_options.buttons = {};
    remove_tag_assignment_confirmation_dlg_options.buttons[i18n.t("general.cancel")] = function() {
      tags_controller.remove_tag_assignment_job.cb.attr('checked','checked');
      tags_controller.remove_tag_assignment_job = null;
  
      $(this).dialog("close");
    };

    remove_tag_assignment_confirmation_dlg_options.buttons[i18n.t("tags.remove-tag-assignment")] = function() {
      tags_controller.removeTagAssignmentAfterConfirmation();
    };

    $('#remove-tag-assignment-confirmation-dialog').dialog(remove_tag_assignment_confirmation_dlg_options);
    // eslint-disable-next-line no-unused-vars
    $('#remove-tag-assignment-confirmation-dialog').bind('dialogbeforeclose', function(event) {
      if (!tags_controller.persistence_ongoing && tags_controller.remove_tag_assignment_job != null) {
        tags_controller.remove_tag_assignment_job.cb.attr('checked','checked');
        tags_controller.remove_tag_assignment_job = null;
      }
    });
  }

  initRenameStandardTagDialog(force=false) {
    if (!force && this.renameStandardTagDialogInitDone) {
      return;
    }

    this.renameStandardTagDialogInitDone = true;

    var rename_standard_tag_dlg_options = {
      title: i18n.t("tags.rename-tag"),
      width: 400,
      position: [40,250],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    };
    rename_standard_tag_dlg_options.buttons = {};
    rename_standard_tag_dlg_options.buttons[i18n.t("general.cancel")] = function() {
      $(this).dialog("close");
    };
    rename_standard_tag_dlg_options.buttons[i18n.t("general.rename")] = {
      id: 'rename-tag-button',
      text: i18n.t("general.rename"),
      click: function() {
        tags_controller.closeDialogAndRenameTag();
      }
    };
    $('#rename-standard-tag-dialog').dialog(rename_standard_tag_dlg_options);
  
    // Handle the enter key in the tag title field and rename the tag when it is pressed
    $('#rename-standard-tag-title-input:not(.bound)').addClass('bound').on("keypress", (event) => {
      if (event.which == 13) {
        tags_controller.closeDialogAndRenameTag();
      }
    // eslint-disable-next-line no-unused-vars
    }).on("keyup", async (event) => {
      var tag_title = $('#rename-standard-tag-title-input').val();
      await this.updateButtonStateBasedOnTagTitleValidation(tag_title, 'rename-tag-button');
    });
  }

  async closeDialogAndRenameTag() {
    var new_title = $('#rename-standard-tag-title-input').val();
    var tag_existing = await this.updateButtonStateBasedOnTagTitleValidation(new_title, 'rename-tag-button');

    if (tag_existing) {
      return;
    }

    $('#rename-standard-tag-dialog').dialog('close');
    var checkbox_tag = this.getCheckboxTag(tags_controller.rename_standard_tag_id);
    var is_global = (checkbox_tag.parent().attr('id') == 'tags-content-global');
    
    tags_controller.updateTagTitlesInVerseList(tags_controller.rename_standard_tag_id, is_global, new_title);
    ipcDb.updateTag(tags_controller.rename_standard_tag_id, new_title);
    tags_controller.sortTagLists();
    
    if (tags_controller.rename_standard_tag_id == tags_controller.tag_store.latest_tag_id) {
      await tags_controller.tag_store.renameTag(tags_controller.rename_standard_tag_id, new_title);
      app_controller.assign_last_tag_button.onLatestUsedTagChanged(undefined, undefined);
    }

    await tags_controller.updateTagsViewAfterVerseSelection(true);

    app_controller.tag_selection_menu.requestTagsForMenu();
    app_controller.tab_controller.updateTabTitleAfterTagRenaming(tags_controller.rename_standard_tag_title, new_title);
  }

  renameTagInView(id, title) {
    // Rename tag in tag list on the left side
    var checkbox_tag = tags_controller.getCheckboxTag(id);
    var label = checkbox_tag.find('.cb-label');
    label.text(title);

    // Rename tag in tag selection menu above bible browser
    var tag_selection_entry = $('#tag-browser-tag-' + id).find('.tag-browser-tag-title').find('.tag-browser-tag-title-content');
    tag_selection_entry.text(title);
  }

  async saveNewTag(e, type) {
    uiHelper.showTextLoadingIndicator();
    $(e).dialog("close");

    await waitUntilIdle(); // Give the dialog some time to close

    var new_tag_title = $('#new-' + type + '-tag-title-input').val();
    tags_controller.new_tag_created = true;
    this.last_created_tag = new_tag_title;

    var new_tag = await ipcDb.createNewTag(new_tag_title);

    tags_controller.tag_store.resetBookTagStatistics();
    var tab = app_controller.tab_controller.getTab();
    await tags_controller.updateTagList(tab.getBook(), tab.getContentId(), true);
    await app_controller.tag_selection_menu.requestTagsForMenu();
    var current_timestamp = new Date(Date.now()).getTime();
    tags_controller.tag_store.updateTagTimestamp(new_tag.id, current_timestamp);
    await tags_controller.tag_store.updateLatestAndOldestTagData();
    await tags_controller.updateTagsViewAfterVerseSelection(true);

    uiHelper.hideTextLoadingIndicator();
  }

  handleNewTagButtonClick(button, type) {
    if ($(button).hasClass('ui-state-disabled')) {
      return;
    }

    tags_controller.initNewTagDialog();

    const $tagInput = $('#new-' + type + '-tag-title-input');

    $tagInput.val(''); 
    this.updateButtonStateBasedOnTagTitleValidation('', 'create-tag-button');
    $('#new-' + type + '-tag-dialog').dialog('open');
    $tagInput.focus();
  }

  handleDeleteTagButtonClick(event) {
    tags_controller.initDeleteTagConfirmationDialog();

    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    var tag_id = checkbox_tag.attr('tag-id');
    var parent_id = checkbox_tag.parent().attr('id');
    var label = checkbox_tag.find('.cb-label').html();

    tags_controller.tag_to_be_deleted_is_global = (parent_id == 'tags-content-global');
    tags_controller.tag_to_be_deleted_title = label;
    tags_controller.tag_to_be_deleted = tag_id;
    
    var number_of_tagged_verses = checkbox_tag.attr('global-assignment-count');

    $('#delete-tag-name').html(label);
    $('#delete-tag-number-of-verses').html(number_of_tagged_verses); // FIXME
    $('#delete-tag-confirmation-dialog').dialog('open');
  }

  deleteTagAfterConfirmation() {
    $('#delete-tag-confirmation-dialog').dialog('close');
   
    setTimeout(async () => {
      await ipcDb.removeTag(tags_controller.tag_to_be_deleted);

      await tags_controller.removeTagById(tags_controller.tag_to_be_deleted, tags_controller.tag_to_be_deleted_title);
      await app_controller.tag_selection_menu.requestTagsForMenu(true);
      await tags_controller.updateTagsViewAfterVerseSelection(true);
      await tags_controller.updateTagUiBasedOnTagAvailability();
      await app_controller.tag_statistics.updateBookTagStatistics();
    }, 50);
  }

  async removeTagById(tag_id, tag_title) {
    var checkbox_tag = tags_controller.getCheckboxTag(tag_id);
    checkbox_tag.detach();

    if (this.tag_store.latest_tag_id != null && this.tag_store.latest_tag_id == tag_id) {
      this.tag_store.latest_tag_id = null;
      await this.tag_store.refreshTagList();
    }

    tags_controller.updateTagCountAfterRendering();

    // eslint-disable-next-line no-unused-vars
    var tag_data_elements = $('.tag-id').filter(function(index){
      return ($(this).html() == tag_id);
    });

    var verse_list = $.create_xml_doc(
      app_controller.verse_selection.element_list_to_xml_verse_list(tag_data_elements)
    );

    tags_controller.changeVerseListTagInfo(tag_id,
                                           tag_title,
                                           verse_list,
                                           "remove");
  }

  async assignLastTag() {
    if (this.tag_store.latest_tag_id != null) {
      var checkbox_tag = this.getCheckboxTag(this.tag_store.latest_tag_id);
      await this.clickCheckBoxTag(checkbox_tag);
    }
  }

  async handleTagLabelClick(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    await this.clickCheckBoxTag(checkbox_tag);
  }

  async clickCheckBoxTag(checkboxTag) {
    var current_verse_list = app_controller.verse_selection.selected_verse_references;

    if (!tags_controller.is_blocked && current_verse_list.length > 0) {
      var checkbox = checkboxTag.find('.tag-cb');
      checkbox.prop('checked', !checkbox.prop('checked'));
      await tags_controller.handleCheckboxTagStateChange(checkboxTag);
    }
  }

  async handleTagCbClick(event) {
    await waitUntilIdle();

    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    await tags_controller.handleCheckboxTagStateChange(checkbox_tag);
  }

  async handleCheckboxTagStateChange(checkbox_tag) {
    var current_verse_list = app_controller.verse_selection.selected_verse_references;

    if (tags_controller.is_blocked || current_verse_list.length == 0) {
      return;
    }

    tags_controller.is_blocked = true;
    setTimeout(function() {
      tags_controller.is_blocked = false;
    }, 300);

    var id = parseInt(checkbox_tag.attr('tag-id'));
    var cb = checkbox_tag.find('.tag-cb')[0];
    var cb_label = checkbox_tag.find('.cb-label').html();
    var checkbox_is_checked = $(cb).is(':checked');
    cb.blur();

    var current_verse_selection = app_controller.verse_selection.current_verse_selection_as_xml(); 
    var current_verse_reference_ids = app_controller.verse_selection.current_verse_selection_as_verse_reference_ids();

    checkbox_tag.find('.cb-label').removeClass('underline');
    checkbox_tag.find('.cb-label-postfix').html('');

    var is_global = false;
    if (checkbox_tag.find('.is-global').html() == 'true') {
      is_global = true;
    }

    if (checkbox_is_checked) {
      // Update last used timestamp
      var current_timestamp = new Date(Date.now()).getTime();
      checkbox_tag.attr('last-used-timestamp', current_timestamp);

      this.tag_store.updateTagTimestamp(id, current_timestamp);
      await this.tag_store.updateLatestAndOldestTagData();

      // Drop the cached stats element, because it is outdated now
      this.dropCachedTagStats(id);

      app_controller.tag_selection_menu.updateLastUsedTimestamp(id, current_timestamp);
      app_controller.tag_selection_menu.applyCurrentFilters();

      $(cb).attr('title', i18n.t("tags.remove-tag-assignment"));

      var filteredVerseBoxes = [];
      var currentVerseList = verseListController.getCurrentVerseList();

      // Create a list of filtered ids, that only contains the verses that do not have the selected tag yet
      for (var i = 0; i < current_verse_reference_ids.length; i++) {
        var currentVerseReferenceId = current_verse_reference_ids[i];
        var currentVerseBox = currentVerseList[0].querySelector('.verse-reference-id-' + currentVerseReferenceId);

        if (currentVerseBox != null) {
          var existingTagIdElements = currentVerseBox.querySelectorAll('.tag-id');
          var existingTagIds = [];
          
          for (var j = 0; j < existingTagIdElements.length; j++) {
            var currentTagId = parseInt(existingTagIdElements[j].innerText);
            existingTagIds.push(currentTagId);
          }

          if (!existingTagIds.includes(id)) {
            filteredVerseBoxes.push(currentVerseBox);
          }
        }
      }

      ipcDb.assignTagToVerses(id, filteredVerseBoxes);

      tags_controller.changeVerseListTagInfo(id,
                                             cb_label,
                                             $.create_xml_doc(current_verse_selection),
                                             "assign");

      var currentBook = app_controller.tab_controller.getTab().getBook();

      tags_controller.updateTagCountAfterRendering(currentBook != null);
      await tags_controller.updateTagsViewAfterVerseSelection(true);
      await tags_controller.updateTagUiBasedOnTagAvailability();

      if (currentBook != null) {
        await app_controller.tag_statistics.updateBookTagStatistics();
      }


    } else {

      tags_controller.remove_tag_assignment_job = {
        'id': id,
        'is_global': is_global,
        'cb_label': cb_label,
        'checkbox_tag': checkbox_tag,
        'verse_list': current_verse_list,
        'verse_ids': current_verse_reference_ids,
        'xml_verse_selection': $.create_xml_doc(current_verse_selection),
        'cb': $(cb)
      };

      if (current_verse_list.length > 1) {
        tags_controller.initRemoveTagAssignmentConfirmationDialog();

        $('#remove-tag-assignment-name').html(cb_label);
        $('#remove-tag-assignment-confirmation-dialog').dialog('open');
      } else {
        await tags_controller.removeTagAssignmentAfterConfirmation();
        await tags_controller.updateTagsViewAfterVerseSelection(true);
      }
    }
  }
  
  getCheckboxTag(id) {
    var checkbox_tag = $('#tags-content-global').find('.checkbox-tag[tag-id="' + id + '"]');
    return checkbox_tag;
  }

  updateTagVerseCount(id, verseBoxes, to_increment) {
    var count = verseBoxes.length;
    var checkbox_tag = tags_controller.getCheckboxTag(id);
    var cb_label_element = checkbox_tag.find('.cb-label');
    var tag_title = cb_label_element.text();
    var tag_assignment_count_element = checkbox_tag.find('.cb-label-tag-assignment-count');
    var tag_assignment_count_values = tag_assignment_count_element.text().substring(
      1, tag_assignment_count_element.text().length - 1
    );

    var current_book_count = 0;
    var current_global_count = 0;
    var new_book_count = 0;
    var new_global_count = 0;

    var currentBook = app_controller.tab_controller.getTab().getBook();

    if (currentBook == null) {
      current_global_count = parseInt(tag_assignment_count_values);
    } else {
      current_book_count = parseInt(tag_assignment_count_values.split('|')[0]);
      current_global_count = parseInt(tag_assignment_count_values.split('|')[1]);
    }

    if (to_increment) {
      new_book_count = current_book_count + count;
      new_global_count = current_global_count + count;
    } else {
      new_book_count = current_book_count - count;
      new_global_count = current_global_count - count;
    }

    if (new_book_count > 0) {
      cb_label_element.addClass('cb-label-assigned');
    } else {
      cb_label_element.removeClass('cb-label-assigned');
    }

    checkbox_tag.attr('book-assignment-count', new_book_count);
    checkbox_tag.attr('global-assignment-count', new_global_count);

    var new_label = "";
    if (currentBook == null) {
      new_label = "(" + new_global_count + ")";
    } else {
      new_label = "(" + new_book_count + " | " + new_global_count + ")";
    }

    tag_assignment_count_element.text(new_label);

    // Update tag count in tag store statistics
    var bookList = this.verse_box_helper.getBookListFromVerseBoxes(verseBoxes);
    tags_controller.tag_store.updateTagCount(id, bookList, count, to_increment);

    // Update tag count in tag selection menu as well
    app_controller.tag_selection_menu.updateVerseCountInTagMenu(tag_title, new_global_count);
  }

  async removeTagAssignmentAfterConfirmation() {
    tags_controller.persistence_ongoing = true;
    $('#remove-tag-assignment-confirmation-dialog').dialog('close');

    var job = tags_controller.remove_tag_assignment_job;
    tags_controller.changeVerseListTagInfo(job.id,
                                           job.cb_label,
                                           job.xml_verse_selection,
                                           "remove");

    job.cb.attr('title', i18n.t("tags.assign-tag"));
    job.checkbox_tag.append(tags_controller.loading_indicator);

    var verse_boxes = [];

    var currentVerseList = verseListController.getCurrentVerseList();

    for (var i = 0; i < job.verse_ids.length; i++) {
      var currentVerseReferenceId = job.verse_ids[i];
      var currentVerseBox = currentVerseList[0].querySelector('.verse-reference-id-' + currentVerseReferenceId);
      verse_boxes.push(currentVerseBox);
    }

    // Drop the cached stats element, because it is outdated now
    this.dropCachedTagStats(job.id);

    await ipcDb.removeTagFromVerses(job.id, verse_boxes);
    await app_controller.assign_last_tag_button.onLatestUsedTagChanged(job.id, false);

    var currentBook = app_controller.tab_controller.getTab().getBook();
    tags_controller.updateTagCountAfterRendering(currentBook != null);
    tags_controller.updateTagUiBasedOnTagAvailability();
    await app_controller.tag_statistics.updateBookTagStatistics();

    tags_controller.remove_tag_assignment_job = null;
    tags_controller.persistence_ongoing = false;
  }

  /**
   * This function updates the tag info in existing verse lists after tags have been assigned/removed.
   * It does this for the currently opened tab and also within all other tabs where the corresponding verse is loaded.
   */
  async changeVerseListTagInfo(tag_id,
                               tag_title,
                               verse_selection,
                               action) {

    verse_selection = $(verse_selection);
    var selected_verses = verse_selection.find('verse');
    var current_verse_list_frame = verseListController.getCurrentVerseListFrame();

    for (let i = 0; i < selected_verses.length; i++) {
      let current_verse_reference_id = $(selected_verses[i]).find('verse-reference-id').text();
      let current_verse_box = current_verse_list_frame[0].querySelector('.verse-reference-id-' + current_verse_reference_id);

      let verseBoxObj = new VerseBox(current_verse_box);
      verseBoxObj.changeVerseListTagInfo(tag_id, tag_title, action);
    }

    for (let i = 0; i < selected_verses.length; i++) {
      let current_verse_reference_id = $(selected_verses[i]).find('verse-reference-id').text();
      let current_verse_box = current_verse_list_frame[0].querySelector('.verse-reference-id-' + current_verse_reference_id);

      await this.verse_box_helper.iterateAndChangeAllDuplicateVerseBoxes(current_verse_box, { tag_id: tag_id, tag_title: tag_title, action: action }, (changedValue, targetVerseBox) => {
        let verseBoxObj = new VerseBox(targetVerseBox);
        verseBoxObj.changeVerseListTagInfo(changedValue.tag_id, changedValue.tag_title, changedValue.action);
      });
    }
  }

  sortTagLists() {
    var global_tags_box = $('#tags-content-global');
    var sort_function = function(a,b) {
      return ($(a).find('.cb-label').text().toLowerCase() > $(b).find('.cb-label').text().toLowerCase()) ? 1 : -1;
    };

    global_tags_box.find('.checkbox-tag').sort_elements(sort_function);
  }

  async refreshBookTagStatistics(tag_list, tag_statistics, current_book) {
    var book_tag_statistics = [];
    
    for (var i = 0; i < tag_list.length; i++) {
      var currentTag = tag_list[i];
      var currentTagStatistics = tag_statistics[currentTag.id];

      var is_used_in_current_book = (currentTagStatistics.bookAssignmentCount > 0) ? true : false;

      if (current_book != null && is_used_in_current_book) {
        book_tag_statistics[currentTag.title] = parseInt(currentTagStatistics.bookAssignmentCount);
      }
    }

    if (current_book != null) {
      await app_controller.tag_statistics.updateBookTagStatistics(book_tag_statistics);
    }
  }

  async getTagList(forceRefresh=true) {
    var tagList = await this.tag_store.getTagList(forceRefresh);
    return tagList;
  }

  async updateTagList(currentBook, contentId=null, forceRefresh=false) {
    if (forceRefresh) {
      this.initialRenderingDone = false;
    }

    if (contentId == null) {
      contentId = currentBook;
    }

    if (contentId != this.lastContentId || forceRefresh) {
      var tagList = await this.tag_store.getTagList(forceRefresh);
      var tagStatistics = await this.tag_store.getBookTagStatistics(currentBook, forceRefresh);
      await this.renderTags(tagList, tagStatistics, currentBook != null);
      await waitUntilIdle();

      this.lastContentId = contentId;
    } else {
      app_controller.tag_statistics.highlightFrequentlyUsedTags();
    }
  }

  getNewTagStatsElement(tag_statistics, currentElementId, tagId, current_book) {
    var newElement = document.createElement('span');
    newElement.classList.add('cb-label-tag-assignment-count');
    newElement.setAttribute('id', currentElementId);

    var currentTagStatistics = tag_statistics[tagId];
    var bookCount = currentTagStatistics.bookAssignmentCount;
    var globalCount = currentTagStatistics.globalAssignmentCount;
    var newElementStats = "(";

    if (current_book != "no-book") newElementStats += bookCount + ' | ';
    newElementStats += globalCount + ')';
    newElement.innerText = newElementStats;

    return newElement;
  }

  updateStatsElements(tag_statistics) {
    var current_book = app_controller.tab_controller.getTab().getBook();
    if (current_book == null) current_book = "no-book";

    if (!(current_book in this.tag_stats_element_cache)) {
      this.tag_stats_element_cache[current_book] = {};
    }

    var global_tags_box_el = document.getElementById('tags-content-global');
    var tag_stats_elements = global_tags_box_el.querySelectorAll('.cb-label-tag-assignment-count');

    for (var i = 0; i < tag_stats_elements.length; i++) {
      var currentElement = tag_stats_elements[i];
      var currentElementId = currentElement.getAttribute('id');
      var lastHyphenIndex = currentElementId.lastIndexOf('-');

      if (lastHyphenIndex == -1) continue;

      var tagId = currentElementId.substring(lastHyphenIndex + 1);

      if (!(currentElementId in this.tag_stats_element_cache[current_book])) {
        var newElement = this.getNewTagStatsElement(tag_statistics, currentElementId, tagId, current_book);
        this.tag_stats_element_cache[current_book][currentElementId] = newElement;
      }

      var cachedElement = this.tag_stats_element_cache[current_book][currentElementId];
      var cbLabel = currentElement.parentNode.querySelector('.cb-label');

      if (current_book != "no-book") {
        var cachedElementText = cachedElement.innerText;
        var indexOfDivider = cachedElementText.indexOf('|');
        var bookCount = parseInt(cachedElementText.substring(1, indexOfDivider));        
        var cbLabelClassList = cbLabel.classList;

        if (bookCount > 0 && !cbLabelClassList.contains('cb-label-assigned')) {
          cbLabel.classList.add('cb-label-assigned');
        }

        if (bookCount == 0 && cbLabelClassList.contains('cb-label-assigned')) {
          cbLabel.classList.remove('cb-label-assigned');
        }

        var checkbox_tag = cbLabel.parentNode;
        checkbox_tag.setAttribute('book-assignment-count', bookCount);
      } else {
        cbLabel.classList.remove('cb-label-assigned');
      }

      currentElement.parentNode.replaceChild(cachedElement, currentElement);
    }
  }

  initTagStatsElementCache() {
    var current_book = app_controller.tab_controller.getTab().getBook();

    if (!(current_book in this.tag_stats_element_cache)) {
      this.tag_stats_element_cache[current_book] = {};
    }

    var global_tags_box_el = document.getElementById('tags-content-global');
    var tag_stats_elements = global_tags_box_el.querySelectorAll('.cb-label-tag-assignment-count');

    for (var i = 0; i < tag_stats_elements.length; i++) {
      var currentElement = tag_stats_elements[i];
      var currentElementId = currentElement.getAttribute('id');

      this.tag_stats_element_cache[current_book][currentElementId] = currentElement;
    }
  }

  dropCachedTagStats(tagId) {
    for (var book in this.tag_stats_element_cache) {
      var bookCache = this.tag_stats_element_cache[book];
      var elementId = 'cb-label-tag-assignment-count-' + tagId;

      if (elementId in bookCache) {
        delete bookCache[elementId];
      }
    }
  }

  async renderTags(tag_list, tag_statistics, is_book=false) {
    //console.time("renderTags");
    var current_book = app_controller.tab_controller.getTab().getBook();
    var global_tags_box_el = document.getElementById('tags-content-global');

    if (!this.initialRenderingDone) {
      // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
      this.verses_were_selected_before = true;

      // eslint-disable-next-line no-undef
      var all_tags_html = tagListTemplate({
        tags: tag_list,
        tagStatistics: tag_statistics,
        current_book: current_book,
        current_filter: $('#tags-search-input').val(),
        rename_tag_label: i18n.t("tags.rename-tag"),
        delete_tag_label: i18n.t("tags.delete-tag-permanently"),
      });

      global_tags_box_el.innerHTML = '';
      global_tags_box_el.innerHTML = all_tags_html;

      this.initTagStatsElementCache();
      this.initialRenderingDone = true;
    } else {
      this.updateStatsElements(tag_statistics);
    }

    await tags_controller.refreshBookTagStatistics(tag_list, tag_statistics, current_book);
    uiHelper.configureButtonStyles('#tags-content');

    tags_controller.updateTagsViewAfterVerseSelection(true);
    tags_controller.updateTagCountAfterRendering(is_book);
    await tags_controller.updateTagUiBasedOnTagAvailability(tag_list.length);

    var old_tags_search_input_value = $('#tags-search-input')[0].value;    
    if (this.new_tag_created && old_tags_search_input_value != "") {
      // If the newly created tag doesn't match the current search input
      // we remove the current search condition. Otherwise the new tag
      // wouldn't show up in the list as expected.
      if (!tags_controller.tag_list_filter.stringMatches(this.last_created_tag,
                                                         $('#tags-search-input')[0].value)) {
        $('#tags-search-input')[0].value = "";
        old_tags_search_input_value = "";
      }
    }    
    this.new_tag_created = false;

    tags_controller.hideTagListLoadingIndicator();
    //console.timeEnd("renderTags");
  }

  handleRenameTagClick(event) {
    tags_controller.initRenameStandardTagDialog();

    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    var cb_label = checkbox_tag.find('.cb-label').text();

    const $tagInput = $('#rename-standard-tag-title-input');
    this.updateButtonStateBasedOnTagTitleValidation('', 'rename-tag-button');
    $tagInput.val(cb_label);
    $('#rename-standard-tag-dialog').dialog('open');
    $('#rename-standard-tag-title-input').focus();

    tags_controller.rename_standard_tag_id = parseInt(checkbox_tag.attr('tag-id'));
    tags_controller.rename_standard_tag_title = cb_label;
  }

  updateTagCountAfterRendering(is_book=false) {
    var global_tag_count = $('#tags-content-global').find('.checkbox-tag').length;
    var global_used_tag_count = $('#tags-content-global').find('.cb-label-assigned').length;
    var tag_list_stats = $($('#tags-content').find('#tag-list-stats'));
    var tag_list_stats_content = "";

    if (is_book) {
      tag_list_stats_content += global_used_tag_count + ' ' + i18n.t('tags.stats-used') + ' / ';
    }

    tag_list_stats_content += global_tag_count + ' ' + i18n.t('tags.stats-total');
    tag_list_stats.html(tag_list_stats_content);
  }

  removeEventListeners(element_list, type, listener) {
    for (var i = 0; i < element_list.length; i++) {
      element_list[i].removeEventListener(type, listener);
    }
  }

  addEventListeners(element_list, type, listener) {
    for (var i = 0; i < element_list.length; i++) {
      element_list[i].addEventListener(type, listener);
    }
  }

  bindTagEvents() {
    var tags_box = document.getElementById('tags-content-global');

    tags_box.addEventListener('click', async function(event) {
      // Use event delegation, so that we do not have to add an event listener to each element.

      if (event.target.matches('.tag-delete-icon') || event.target.matches('.tag-delete-button')) {
        tags_controller.handleDeleteTagButtonClick(event);
      } else if (event.target.matches('.tag-rename-icon') || event.target.matches('.tag-rename-button')) {
        tags_controller.handleRenameTagClick(event);
      } else if (event.target.matches('.tag-cb')) {
        await tags_controller.handleTagCbClick(event);
      } else if (event.target.matches('.cb-label')) {
        await tags_controller.handleTagLabelClick(event);
      } else {
        return;
      }
    }, false);
  }

  updateTagTitlesInVerseList(tag_id, is_global, title) {
    var tag_class = is_global ? "tag-global" : "tag-book";

    // eslint-disable-next-line no-unused-vars
    var tag_data_elements = $('.tag-id').filter(function(index) {
      return (($(this).html() == tag_id) && ($(this).parent().hasClass(tag_class)));
    }).closest('.' + tag_class);

    for (var i = 0; i < tag_data_elements.length; i++) {
      var current_tag_data = $(tag_data_elements[i]);
      current_tag_data.find('.tag-title').html(title);

      var current_verse_box = new VerseBox(current_tag_data.closest('.verse-box')[0]);
      current_verse_box.updateTagTooltip();
      current_verse_box.updateVisibleTags();
    }
  }

  async updateTagsViewAfterVerseSelection(force) {
    //console.time('updateTagsViewAfterVerseSelection');
    if (tags_controller.verse_selection_blocked && force !== true) {
      return;
    }

    tags_controller.verse_selection_blocked = true;
    setTimeout(function() {
      tags_controller.verse_selection_blocked = false;
    }, 300);

    var versesSelected = app_controller.verse_selection.selected_verse_box_elements.length > 0;
    var selected_verse_tags = [];

    if (versesSelected) { // Verses are selected

      selected_verse_tags = app_controller.verse_selection.getCurrentSelectionTags();
      var checkbox_tags = document.querySelectorAll('.checkbox-tag');

      for (var i = 0; i < checkbox_tags.length; i++) {
        this.formatCheckboxElementBasedOnSelection(checkbox_tags[i], selected_verse_tags);
      }

      this.verses_were_selected_before = true;

    } else { // No verses are selected!

      if (this.verses_were_selected_before) {
        this.uncheckAllCheckboxElements();
      }

      this.verses_were_selected_before = false;
    }

    await app_controller.assign_last_tag_button.refreshLastTagButtonState(versesSelected, selected_verse_tags);
    //console.timeEnd('updateTagsViewAfterVerseSelection');
  }

  formatCheckboxElementBasedOnSelection(cb_element, selected_verse_tags) {
    var current_checkbox = cb_element.querySelector('.tag-cb');
    var current_title_element = cb_element.querySelector('.cb-label');
    var current_title = current_title_element.innerHTML;
    var current_title_element_postfix = cb_element.querySelector('.cb-label-postfix');
    var match_found = false;

    for (var j = 0; j < selected_verse_tags.length; j++) {
      var current_tag_obj = selected_verse_tags[j];

      if (current_tag_obj.title == current_title) {
        if (current_tag_obj.complete) {
          current_checkbox.setAttribute('title', this.unassign_tag_label);
          current_checkbox.checked = true;
          current_title_element_postfix.innerHTML = '';
          current_title_element.classList.remove('underline');
        } else {
          current_checkbox.setAttribute('title', this.assign_tag_label);
          current_checkbox.checked = false;
          current_title_element_postfix.innerHTML = '&nbsp;*';
          current_title_element.classList.add('underline');
        }

        match_found = true;
      }
    }

    if (!match_found) {
      current_checkbox.checked = false;
      current_checkbox.setAttribute('title', this.assign_tag_label);
      current_title_element.classList.remove('underline');
      current_title_element_postfix.innerHTML = '';
    }

    if (!this.verses_were_selected_before) {
      current_checkbox.removeAttribute('disabled');
      current_checkbox.style.opacity = '1.0';
    }
  }

  uncheckAllCheckboxElements() {
    var all_checkbox_elements = document.querySelectorAll('.checkbox-tag');

    if (all_checkbox_elements.length > 0) {
      for (var i = 0; i < all_checkbox_elements.length; i++) {
        var current_checkbox_element = all_checkbox_elements[i];

        var current_cb = current_checkbox_element.querySelector('.tag-cb');
        current_cb.checked = false;
        current_cb.setAttribute('disabled', 'disabled');
        current_cb.setAttribute('title', '');
        current_cb.style.opacity = '0.3';

        var current_title_element = current_checkbox_element.querySelector('.cb-label');
        current_title_element.classList.remove('underline');

        var current_title_element_postfix = current_checkbox_element.querySelector('.cb-label-postfix');
        current_title_element_postfix.innerHTML = '';
      }
    }
  }

  initTagsUI() {
    $('#tag-list-filter-button').bind('click', (e) => { this.tag_list_filter.handleFilterButtonClick(e); });

    $('#tags-content-global').bind('mouseover', () => { this.tag_list_filter.hideTagFilterMenuIfInToolBar(); });
    $('#tag-filter-menu').find('input').bind('click', (e) => { tags_controller.tag_list_filter.handleTagFilterTypeClick(e); });

    $('#tags-search-input').bind('keyup', (e) => { this.tag_list_filter.handleTagSearchInput(e); });
    $('#tags-search-input').bind('keydown', function(e) {
      e.stopPropagation(); 
    });

    tags_controller.bindTagEvents();
  }

  async updateTagUiBasedOnTagAvailability(tagCount=undefined) {
    var translationCount = app_controller.translation_controller.getTranslationCount();
    if (tagCount === undefined) {
      tagCount = await ipcDb.getTagCount();
    }

    var textType = app_controller.tab_controller.getTab().getTextType();

    if (tagCount == 0) {
      $('.tag-select-button').addClass('ui-state-disabled');
      $('.show-book-tag-statistics-button').addClass('ui-state-disabled');

      if (translationCount > 0) {
        $('#new-standard-tag-button').removeClass('ui-state-disabled');
        $('#tags-content-global').html(i18n.t("help.help-text-no-tags-book-opened", { interpolation: {escapeValue: false} }));
      } else {
        $('#new-standard-tag-button').addClass('ui-state-disabled');
        $('#tags-content-global').html(i18n.t("help.help-text-no-tags-no-book-opened"));
      }
    } else {
      $('.tag-select-button').removeClass('ui-state-disabled');
      $('#new-standard-tag-button').removeClass('ui-state-disabled');

      if (textType == 'book') {
        $('.show-book-tag-statistics-button').removeClass('ui-state-disabled');
      }
    }
  }

  showTagListLoadingIndicator() {
    var loadingIndicator = $('#tags-loading-indicator');
    loadingIndicator.find('.loader').show();
    loadingIndicator.show();
  }

  hideTagListLoadingIndicator() {
    var loadingIndicator = $('#tags-loading-indicator');
    loadingIndicator.hide();
  }

  async updateTagsView(tabIndex, forceRefresh = false) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab !== undefined) {
      if (currentTab.isValid()) {
        this.showTagListLoadingIndicator();
        await waitUntilIdle();

        var currentTabBook = currentTab.getBook();
        var currentTabContentId = currentTab.getContentId();
        this.updateTagList(currentTabBook, currentTabContentId, forceRefresh);
      }
    }
  }
}

module.exports = TagsController;

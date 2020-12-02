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

const TagsPersistanceController = require('./tags_persistance_controller.js');
const TagStore = require('../components/tags/tag_store.js');
const VerseBoxHelper = require('../helpers/verse_box_helper.js');

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

    this.persistance_controller = new TagsPersistanceController();
    this.tag_store = new TagStore();
    this.tag_store.onLatestUsedTagChanged = (tagId) => { this.onLatestUsedTagChanged(tagId) };
    this.verse_box_helper = new VerseBoxHelper();
    this.tag_stats_element_cache = {};

    this.new_standard_tag_button = $('#new-standard-tag-button');
    this.tag_title_changed = false;
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
    new_standard_tag_dlg_options.buttons[i18n.t("tags.create-tag")] = function() {
      tags_controller.save_new_tag(this, "standard");
    };
  
    $('#new-standard-tag-dialog').dialog(new_standard_tag_dlg_options);

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
      tags_controller.delete_tag_after_confirmation();
    };

    $('#delete-tag-confirmation-dialog').dialog(delete_tag_confirmation_dlg_options);

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
      tags_controller.remove_tag_assignment_after_confirmation();
    };

    $('#remove-tag-assignment-confirmation-dialog').dialog(remove_tag_assignment_confirmation_dlg_options);
    $('#remove-tag-assignment-confirmation-dialog').bind('dialogbeforeclose', function(event) {
      if (!tags_controller.persistence_ongoing && tags_controller.remove_tag_assignment_job != null) {
        tags_controller.remove_tag_assignment_job.cb.attr('checked','checked');
        tags_controller.remove_tag_assignment_job = null;
      }
    });

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
    rename_standard_tag_dlg_options.buttons[i18n.t("general.rename")] = function() {
      tags_controller.close_dialog_and_rename_standard_tag();
    };
    $('#rename-standard-tag-dialog').dialog(rename_standard_tag_dlg_options);
  
    // Handle the enter key in the tag title field and create the tag when it is pressed
    $('#new-standard-tag-title-input:not(.bound)').addClass('bound').on("keypress", (event) => {
      if (event.which == 13) {
        $('#new-standard-tag-dialog').dialog("close");
        tags_controller.save_new_tag(event, "standard");
      }
    });

    // Handle the enter key in the tag title field and rename the tag when it is pressed
    $('#rename-standard-tag-title-input:not(.bound)').addClass('bound').on("keypress", (event) => {
      if (event.which == 13) {
        tags_controller.close_dialog_and_rename_standard_tag();
      }
    });
  }

  async close_dialog_and_rename_standard_tag() {
    $('#rename-standard-tag-dialog').dialog('close');
    var new_title = $('#rename-standard-tag-title-input').val();
    var checkbox_tag = this.get_checkbox_tag(tags_controller.rename_standard_tag_id);
    var is_global = (checkbox_tag.parent().attr('id') == 'tags-content-global');
    
    tags_controller.update_tag_titles_in_verse_list(tags_controller.rename_standard_tag_id, is_global, new_title);
    tags_controller.persistance_controller.update_tag(tags_controller.rename_standard_tag_id, new_title);
    tags_controller.sort_tag_lists();
    
    if (tags_controller.rename_standard_tag_id == tags_controller.tag_store.latest_tag_id) {
      await tags_controller.tag_store.renameTag(tags_controller.rename_standard_tag_id, new_title);
      tags_controller.onLatestUsedTagChanged(undefined, undefined);
    }

    await tags_controller.update_tags_view_after_verse_selection(true);

    app_controller.tag_selection_menu.requestTagsForMenu();
    app_controller.tab_controller.updateTabTitleAfterTagRenaming(tags_controller.rename_standard_tag_title, new_title);
  }

  rename_tag_in_view(id, title) {
    // Rename tag in tag list on the left side
    var checkbox_tag = tags_controller.get_checkbox_tag(id);
    var label = checkbox_tag.find('.cb-label');
    label.text(title);

    // Rename tag in tag selection menu above bible browser
    var tag_selection_entry = $('#tag-browser-tag-' + id).find('.tag-browser-tag-title').find('.tag-browser-tag-title-content');
    tag_selection_entry.text(title);
  }

  save_new_tag(e, type) {
    var new_tag_title = $('#new-' + type + '-tag-title-input').val();
    tags_controller.new_tag_created = true;
    this.last_created_tag = new_tag_title;
    tags_controller.persistance_controller.create_new_tag(new_tag_title, type);
    $(e).dialog("close");
  }

  handle_new_tag_button_click(button, type) {
    if ($(button).hasClass('ui-state-disabled')) {
      return;
    }

    $('#new-' + type + '-tag-title-input').val(''); 
    $('#new-' + type + '-tag-dialog').dialog('open');
    $('#new-' + type + '-tag-title-input').focus();
  }

  handle_delete_tag_button_click(event) {
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

  delete_tag_after_confirmation() {
    $('#delete-tag-confirmation-dialog').dialog('close');
    
    setTimeout(async () => {
      await tags_controller.persistance_controller.destroy_tag(tags_controller.tag_to_be_deleted);

      await tags_controller.updateTagUiBasedOnTagAvailability();
      app_controller.tag_statistics.update_book_tag_statistics_box();
    }, 50);
  }

  async remove_tag_by_id(tag_id, tag_title) {
    var checkbox_tag = tags_controller.get_checkbox_tag(tag_id);
    checkbox_tag.detach();

    if (this.tag_store.latest_tag_id != null && this.tag_store.latest_tag_id == tag_id) {
      this.tag_store.latest_tag_id = null;
      await this.tag_store.refreshTagList();
    }

    tags_controller.update_tag_count_after_rendering();

    var tag_data_elements = $('.tag-id').filter(function(index){
      return ($(this).html() == tag_id);
    });

    var verse_list = $.create_xml_doc(
      app_controller.verse_selection.element_list_to_xml_verse_list(tag_data_elements)
    );

    tags_controller.change_verse_list_tag_info(tag_id,
                                               tag_title,
                                               verse_list,
                                               "remove");
  }

  async assign_last_tag() {
    if (this.tag_store.latest_tag_id != null) {
      var checkbox_tag = this.get_checkbox_tag(this.tag_store.latest_tag_id);
      await this.clickCheckBoxTag(checkbox_tag);
    }
  }

  async handle_tag_label_click(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    await this.clickCheckBoxTag(checkbox_tag);
  }

  async clickCheckBoxTag(checkboxTag) {
    var current_verse_list = app_controller.verse_selection.selected_verse_references;

    if (!tags_controller.is_blocked && current_verse_list.length > 0) {
      var checkbox = checkboxTag.find('.tag-cb');
      checkbox.prop('checked', !checkbox.prop('checked'));
      await tags_controller.handle_checkbox_tag_state_change(checkboxTag);
    }
  }

  // 2019-05-30
  // FIXME
  // This function is not used after we are using the label also for tag assignment
  // We may use it again to quickly mark the tagged verses
  handle_tag_label_click__by_highlighting_tagged_verses() {
    var checkbox_tag = $(this).closest('.checkbox-tag');
    var cb_label = checkbox_tag.find('.cb-label').html();
    var cb_is_global = (checkbox_tag.find('.is-global').html() == 'true');

    var matching_tag_data = $('.tag-title').filter(function(index) {
      var current_tag_is_global = $(this).parent().hasClass('tag-global');
      return (($(this).html() == cb_label) && (cb_is_global == current_tag_is_global));
    });

    app_controller.verse_selection.clear_verse_selection();

    matching_tag_data.closest('.verse-box').find('.verse-text').addClass('ui-selected');

    if (matching_tag_data.length > 0) {
      var current_verse_reference = $(matching_tag_data[0]).closest('.verse-box').find('.verse-reference-content').html();

      tags_controller.update_tags_view_after_verse_selection(true);
      app_controller.jumpToReference(current_verse_reference, false);
    }
  }

  async handle_tag_cb_click(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    await tags_controller.handle_checkbox_tag_state_change(checkbox_tag);
  }

  async handle_checkbox_tag_state_change(checkbox_tag) {
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
      var currentVerseList = app_controller.getCurrentVerseList();

      // Create a list of filtered ids, that only contains the verses that do not have the selected tag yet
      for (var i = 0; i < current_verse_reference_ids.length; i++) {
        var currentVerseReferenceId = current_verse_reference_ids[i];
        var currentVerseBox = currentVerseList[0].querySelector('.verse-reference-id-' + currentVerseReferenceId);
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

      tags_controller.persistance_controller.assign_tag_to_verses(id, filteredVerseBoxes);

      tags_controller.change_verse_list_tag_info(id,
                                                 cb_label,
                                                 $.create_xml_doc(current_verse_selection),
                                                 "assign");

      var currentBook = app_controller.tab_controller.getTab().getBook();

      tags_controller.update_tag_count_after_rendering(currentBook != null);
      await tags_controller.update_tags_view_after_verse_selection(true);
      await tags_controller.updateTagUiBasedOnTagAvailability();
      app_controller.tag_statistics.update_book_tag_statistics_box();

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
        $('#remove-tag-assignment-name').html(cb_label);
        $('#remove-tag-assignment-confirmation-dialog').dialog('open');
      } else {
        await tags_controller.remove_tag_assignment_after_confirmation();
        await tags_controller.update_tags_view_after_verse_selection(true);
      }
    }
  }
  
  get_checkbox_tag(id) {
    var checkbox_tag = $('#tags-content-global').find('.checkbox-tag[tag-id="' + id + '"]');
    return checkbox_tag;
  }

  update_tag_verse_count(id, verseBoxes, to_increment) {
    var count = verseBoxes.length;
    var checkbox_tag = tags_controller.get_checkbox_tag(id);
    var cb_label_element = checkbox_tag.find('.cb-label');
    var tag_title = cb_label_element.text();
    var tag_assignment_count_element = checkbox_tag.find('.cb-label-tag-assignment-count');
    var tag_assignment_count_values = tag_assignment_count_element.text().substring(
      1, tag_assignment_count_element.text().length - 1
    );

    var current_book_count = 0;
    var current_global_count = 0;

    var currentBook = app_controller.tab_controller.getTab().getBook();

    if (currentBook == null) {
      var current_global_count = parseInt(tag_assignment_count_values);
    } else {
      var current_book_count = parseInt(tag_assignment_count_values.split('|')[0]);
      var current_global_count = parseInt(tag_assignment_count_values.split('|')[1]);
    }

    if (to_increment) {
      var new_book_count = current_book_count + count;
      var new_global_count = current_global_count + count;
    } else {
      var new_book_count = current_book_count - count;
      var new_global_count = current_global_count - count;
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

  async remove_tag_assignment_after_confirmation() {
    tags_controller.persistence_ongoing = true;
    $('#remove-tag-assignment-confirmation-dialog').dialog('close');

    var job = tags_controller.remove_tag_assignment_job;
    tags_controller.change_verse_list_tag_info(job.id,
                                               job.cb_label,
                                               job.xml_verse_selection,
                                               "remove");

    job.cb.attr('title', i18n.t("tags.assign-tag"));
    job.checkbox_tag.append(tags_controller.loading_indicator);

    var verse_boxes = [];

    var currentVerseList = app_controller.getCurrentVerseList();

    for (var i = 0; i < job.verse_ids.length; i++) {
      var currentVerseReferenceId = job.verse_ids[i];
      var currentVerseBox = currentVerseList[0].querySelector('.verse-reference-id-' + currentVerseReferenceId);
      verse_boxes.push(currentVerseBox);
    }

    // Drop the cached stats element, because it is outdated now
    this.dropCachedTagStats(job.id);

    await tags_controller.persistance_controller.remove_tag_from_verses(job.id, verse_boxes);
    await this.onLatestUsedTagChanged(job.id, false);

    var currentBook = app_controller.tab_controller.getTab().getBook();
    tags_controller.update_tag_count_after_rendering(currentBook != null);
    tags_controller.updateTagUiBasedOnTagAvailability();
    app_controller.tag_statistics.update_book_tag_statistics_box();

    tags_controller.remove_tag_assignment_job = null;
    tags_controller.persistence_ongoing = false;
  }

  /**
   * This function updates the tag info in existing verse lists after tags have been assigned/removed.
   * It does this for the currently opened tab and also within all other tabs where the corresponding verse is loaded.
   */
  async change_verse_list_tag_info(tag_id,
                                   tag_title,
                                   verse_selection,
                                   action) {

    verse_selection = $(verse_selection);
    var selected_verses = verse_selection.find('verse');
    var current_verse_list_frame = app_controller.getCurrentVerseListFrame();

    for (var i = 0; i < selected_verses.length; i++) {
      var current_verse_reference_id = $(selected_verses[i]).find('verse-reference-id').text();
      var current_verse_box = current_verse_list_frame[0].querySelector('.verse-reference-id-' + current_verse_reference_id);
      tags_controller.change_verse_list_tag_info_for_verse_box(current_verse_box, tag_id, tag_title, action);
    }

    for (var i = 0; i < selected_verses.length; i++) {
      var current_verse_reference_id = $(selected_verses[i]).find('verse-reference-id').text();
      var current_verse_box = current_verse_list_frame[0].querySelector('.verse-reference-id-' + current_verse_reference_id);
      await this.verse_box_helper.iterateAndChangeAllDuplicateVerseBoxes(current_verse_box, { tag_id: tag_id, tag_title: tag_title, action: action }, (context, targetVerseBox) => {
        this.change_verse_list_tag_info_for_verse_box(targetVerseBox, context.tag_id, context.tag_title, context.action);
      });
    }
  }

  change_verse_list_tag_info_for_verse_box(verse_box, tag_id, tag_title, action) {
    var current_tag_info = verse_box.querySelector('.tag-info');
    var current_tag_info_title = current_tag_info.getAttribute('title');

    var new_tag_info_title_array = tags_controller.get_new_tag_info_title_array(current_tag_info_title, tag_title, action);
    var updated = tags_controller.update_tag_info_title(current_tag_info, new_tag_info_title_array, current_tag_info_title);

    if (updated) {
      tags_controller.update_tag_data_container(verse_box, tag_id, tag_title, action);
      tags_controller.update_visible_tags_of_verse_box(verse_box, new_tag_info_title_array);
    }
  }

  get_new_tag_info_title_array(tag_info_title, tag_title, action) {
    var already_there = false;
    var current_tag_info_title_array = new Array;
    if (tag_info_title != "" && tag_info_title != undefined) {
      current_tag_info_title_array = tag_info_title.split(', ');
    }

    switch (action) {
      case "assign":
        for (var j = 0; j < current_tag_info_title_array.length; j++) {
          if (current_tag_info_title_array[j] == tag_title) {
            already_there = true;
            break;
          }
        }

        if (!already_there) {
          current_tag_info_title_array.push(tag_title);
          current_tag_info_title_array.sort();
        }
        break;

      case "remove":
        for (var j = 0; j < current_tag_info_title_array.length; j++) {
          if (current_tag_info_title_array[j] == tag_title) {
            current_tag_info_title_array.splice(j, 1);
            break;
          }
        }
        
        break;
    }

    return current_tag_info_title_array;
  }

  update_tag_info_title(tag_info, new_title_array, old_title) {
    var new_tag_info_title = "";

    if (new_title_array.length > 1) {
      new_tag_info_title = new_title_array.join(', ');
    } else {
      if (new_title_array.length == 1) {
        new_tag_info_title = new_title_array[0];
      } else {
        new_tag_info_title = "";
      }
    }

    if (new_tag_info_title == old_title) {
      return false;

    } else {
      tag_info.setAttribute('title', new_tag_info_title);
      if (new_tag_info_title != "") {
        tag_info.classList.add('visible');
      } else {
        tag_info.classList.remove('visible');
      }

      return true;
    }
  }

  update_tag_data_container(verse_box, tag_id, tag_title, action) {
    var current_tag_data_container = $(verse_box.querySelector('.tag-data'));

    switch (action) {
      case "assign":
        var new_tag_data_div = tags_controller.new_tag_data_html("tag-global", tag_title, tag_id);
        current_tag_data_container.append(new_tag_data_div);
        break;

      case "remove":
        var existing_tag_data_div = current_tag_data_container.find('.tag-id').filter(function(index){
          return ($(this).html() == tag_id);
        }).parent();
        
        existing_tag_data_div.detach();
        break;
    }
  }

  update_visible_tags_of_verse_box(verse_box, tag_title_array) {
    var tag_box = $(verse_box).find('.tag-box');
    tag_box.empty();

    for (var i = 0; i < tag_title_array.length; i++) {
      var current_tag_title = tag_title_array[i];
      var tag_html = tags_controller.html_code_for_visible_tag(current_tag_title);
      tag_box.append(tag_html);
    }

    if (tag_title_array.length > 0) {
      $(verse_box).find('.tag').bind('click', (e) => {
        app_controller.verse_list_popup.openVerseListPopup(e, "TAGGED_VERSES");
      });
    }
  }

  html_code_for_visible_tag(tag_title) {
    return `<div class='tag' title='${i18n.t('bible-browser.tag-hint')}'>${tag_title}</div>`;
  }

  new_tag_data_html(tag_class, title, id) {
    var new_tag_data_div = "<div class='" + tag_class + "'>";
    new_tag_data_div += "<div class='tag-title'>" + title + "</div>";
    new_tag_data_div += "<div class='tag-id'>" + id + "</div>";
    new_tag_data_div += "</div>";

    return new_tag_data_div;
  }

  edit_tag_title(value, settings) {
    var old_value = $(this)[0].revert;
    tags_controller.tag_title_changed = (old_value != value);

    return value;
  }

  sort_tag_lists() {
    var global_tags_box = $('#tags-content-global');
    var sort_function = function(a,b) {
      return ($(a).find('.cb-label').text().toLowerCase() > $(b).find('.cb-label').text().toLowerCase()) ? 1 : -1;
    };

    global_tags_box.find('.checkbox-tag').sort_elements(sort_function);
  }

  tags_search_input_is_empty() {
    return $('#tags-search-input')[0].empty();
  }

  refresh_book_tag_statistics(tag_list, tag_statistics, current_book) {
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
      app_controller.tag_statistics.update_book_tag_statistics_box(book_tag_statistics);
    }
  }

  async get_tag_list(forceRefresh=true) {
    var tagList = await this.tag_store.getTagList(forceRefresh);
    return tagList;
  }

  async update_tag_list(currentBook, forceRefresh=false) {
    if (forceRefresh) {
      this.initialRenderingDone = false;
    }

    var tagList = await this.tag_store.getTagList(forceRefresh);
    var tagStatistics = await this.tag_store.getBookTagStatistics(currentBook, forceRefresh);
    await this.render_tags(tagList, tagStatistics, currentBook != null);
    await waitUntilIdle();
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

  update_stats_elements(tag_statistics) {
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
      } else {
        cbLabel.classList.remove('cb-label-assigned');
      }

      currentElement.parentNode.replaceChild(cachedElement, currentElement);
    }
  }

  init_tag_stats_element_cache() {
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

  async render_tags(tag_list, tag_statistics, is_book=false) {
    //console.time("render_tags");
    var current_book = app_controller.tab_controller.getTab().getBook();
    var global_tags_box_el = document.getElementById('tags-content-global');

    if (!this.initialRenderingDone) {
      // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
      this.verses_were_selected_before = true;

      var all_tags_html = tagListTemplate({
        tags: tag_list,
        tagStatistics: tag_statistics,
        current_book: current_book,
        current_filter: $('#tags-search-input').val(),
        rename_tag_label: i18n.t("general.rename"),
        delete_tag_label: i18n.t("tags.delete-tag-permanently"),
      });

      global_tags_box_el.innerHTML = '';
      global_tags_box_el.innerHTML = all_tags_html;

      this.init_tag_stats_element_cache();
      this.initialRenderingDone = true;
    } else {
      this.update_stats_elements(tag_statistics);
    }

    tags_controller.refresh_book_tag_statistics(tag_list, tag_statistics, current_book);
    uiHelper.configureButtonStyles('#tags-content');

    tags_controller.update_tags_view_after_verse_selection(true);
    tags_controller.update_tag_count_after_rendering(is_book);
    await tags_controller.updateTagUiBasedOnTagAvailability(tag_list.length);

    var old_tags_search_input_value = $('#tags-search-input')[0].value;    
    if (this.new_tag_created && old_tags_search_input_value != "") {
      // If the newly created tag doesn't match the current search input
      // we remove the current search condition. Otherwise the new tag
      // wouldn't show up in the list as expected.
      if (!tags_controller.string_matches(this.last_created_tag,
                                          $('#tags-search-input')[0].value)) {
        $('#tags-search-input')[0].value = "";
        old_tags_search_input_value = "";
      }
    }    
    this.new_tag_created = false;

    tags_controller.hideTagListLoadingIndicator();
    //console.timeEnd("render_tags");
  }

  handle_rename_tag_click__by_opening_rename_dialog(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    var cb_label = checkbox_tag.find('.cb-label').text();

    $('#rename-standard-tag-title-input').val(cb_label);
    $('#rename-standard-tag-dialog').dialog('open');
    $('#rename-standard-tag-title-input').focus();

    tags_controller.rename_standard_tag_id = parseInt(checkbox_tag.attr('tag-id'));
    tags_controller.rename_standard_tag_title = cb_label;
  }

  update_tag_count_after_rendering(is_book=false) {
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

  bind_tag_events() {
    var tags_box = document.getElementById('tags-content-global');

    tags_box.addEventListener('click', async function(event) {
      if (event.target.matches('.tag-delete-icon')) {
        tags_controller.handle_delete_tag_button_click(event);
      } else if (event.target.matches('.rename-tag-label')) {
        tags_controller.handle_rename_tag_click__by_opening_rename_dialog(event);
      } else if (event.target.matches('.tag-cb')) {
        await tags_controller.handle_tag_cb_click(event);
      } else if (event.target.matches('.cb-label')) {
        await tags_controller.handle_tag_label_click(event);
      } else {
        return;
      }
    }, false);

    tags_box.addEventListener('mouseover', function(event) {
      if (event.target.matches('.cb-label') ||
          event.target.matches('.cb-label-tag-assignment-count') ||
          event.target.matches('.checkbox-tag')) {

        var current_id = $(event.target).attr('tag-id');

        if (tags_controller.last_mouseover_id !== undefined && 
            tags_controller.last_mouseover_element !== undefined &&
            current_id != tags_controller.last_mouseover_id) {
              
          $(tags_controller.last_mouseover_element).find('.rename-tag-label').hide();
        }

        if (current_id != tags_controller.last_mouseover_id) {
          $(event.target).closest('.checkbox-tag').find('.rename-tag-label').show();
        }

        tags_controller.last_mouseover_element = $(event.target).closest('.checkbox-tag');
        tags_controller.last_mouseover_id = $(event.target).closest('.checkbox-tag').attr('tag-id');
      }
    }, false);

    tags_box.addEventListener('mouseout', function(event) {
      if (event.target.matches('.tags-content-global')) {
        if (tags_controller.last_mouseover_element !== undefined) {
          $(tags_controller.last_mouseover_element).find('.rename-tag-label').hide();
        }
      }
    }, false);
  }

  update_tag_titles_in_verse_list(tag_id, is_global, title) {
    var tag_class = is_global ? "tag-global" : "tag-book";

    var tag_data_elements = $('.tag-id').filter(function(index) {
      return (($(this).html() == tag_id) && ($(this).parent().hasClass(tag_class)));
    }).closest('.' + tag_class);

    for (var i = 0; i < tag_data_elements.length; i++) {
      var current_tag_data = $(tag_data_elements[i]);
      var current_verse_box = current_tag_data.closest('.verse-box');
      current_tag_data.find('.tag-title').html(title);
      tags_controller.update_tag_tooltip_of_verse_box(current_verse_box);

      tags_controller.update_visible_tags_of_verse_box(current_verse_box, current_verse_box.find('.tag-info').attr('title').split(', '));
    }
  }

  update_tag_tooltip_of_verse_box(verse_box) {
    var new_tooltip = tags_controller.get_tag_title_from_tag_data(verse_box);
    verse_box.find('.tag-info').attr('title', new_tooltip);
  }

  get_tag_title_from_tag_data(verse_box) {
    var tag_elements = verse_box.find('.tag-global, .tag-book');

    var tag_title_array = Array();

    for (var i = 0; i < tag_elements.length; i++) {
      var current_tag_element = $(tag_elements[i]);
      var current_title = current_tag_element.find('.tag-title').html();
      var current_tag_is_book = current_tag_element.hasClass('tag-book');
      if (current_tag_is_book) current_title = current_title + '*';

      tag_title_array.push(current_title);
    }

    tag_title_array.sort();

    return tag_title_array.join(', ');
  }

  update_tags_title(verse_box) {
    verse_box.find('.tag-info').attr('title', tags_controller.get_tag_title_from_tag_data(verse_box));
  }

  current_verse_selection_tags() {
    var verse_selection_tags = new Array;

    if (app_controller.verse_selection.selected_verse_box_elements == null) {
      return verse_selection_tags;
    }

    var selected_verse_boxes = app_controller.verse_selection.selected_verse_box_elements;

    for (var i = 0; i < selected_verse_boxes.length; i++) {
      var current_verse_box = $(selected_verse_boxes[i]);
      var current_tag_list = current_verse_box.find('.tag-data').children();

      for (var j = 0; j < current_tag_list.length; j++) {
        var current_tag = $(current_tag_list[j]);
        var current_tag_title = current_tag.find('.tag-title').html();
        var tag_obj = null;

        for (var k = 0; k < verse_selection_tags.length; k++) {
          var current_tag_obj = verse_selection_tags[k];

          if (current_tag_obj.title == current_tag_title &&
              current_tag_obj.category == current_tag.attr('class')) {

            tag_obj = current_tag_obj;
            break;
          }
        }

        if (tag_obj == null) {
          tag_obj = {
            title: current_tag_title,
            category: current_tag.attr('class'),
            count: 0
          }

          verse_selection_tags.push(tag_obj);
        }

        tag_obj.count += 1;
      }
    }

    for (var i = 0; i < verse_selection_tags.length; i++) {
      var current_tag_obj = verse_selection_tags[i];
      current_tag_obj.complete = (current_tag_obj.count == selected_verse_boxes.length);
    }

    return verse_selection_tags;
  }

  async refreshLastTagButtonState(versesSelected, selectedVerseTags) {
    if (versesSelected) {
      if (this.tag_store.latest_tag_id != null) {
        var tagFound = false;

        for (var i = 0; i < selectedVerseTags.length; i++) {
          var currentTagTitle = selectedVerseTags[i].title;
          var latestTag = await this.tag_store.getTag(this.tag_store.latest_tag_id);

          if (currentTagTitle == latestTag.title) {
            tagFound = true;
            break;
          }
        }

        if (!tagFound || selectedVerseTags.length == 0) {
          $('.assign-last-tag-button').removeClass('ui-state-disabled');
        } else {
          $('.assign-last-tag-button').addClass('ui-state-disabled');
        }

      } else {
        $('.assign-last-tag-button').addClass('ui-state-disabled');
      }
    } else {
      $('.assign-last-tag-button').addClass('ui-state-disabled');
    }
  }

  async update_tags_view_after_verse_selection(force) {
    //console.time('update_tags_view_after_verse_selection');
    if (tags_controller.verse_selection_blocked && force !== true) {
      return;
    }

    tags_controller.verse_selection_blocked = true;
    setTimeout(function() {
      tags_controller.verse_selection_blocked = false;
    }, 300);

    var app_container = document.getElementById('app-container');
    var versesSelected = app_controller.verse_selection.selected_verse_box_elements.length > 0;

    if (versesSelected) { // Verses are selected

      var selected_verse_tags = tags_controller.current_verse_selection_tags();
      var checkbox_tags = app_container.querySelectorAll('.checkbox-tag');

      for (var i = 0; i < checkbox_tags.length; i++) {
        this.format_checkbox_element_based_on_selection(checkbox_tags[i], selected_verse_tags);
      }

      this.verses_were_selected_before = true;

    } else { // No verses are selected!

      if (this.verses_were_selected_before) {
        this.uncheck_all_checkbox_elements();
      }

      this.verses_were_selected_before = false;
    }

    await this.refreshLastTagButtonState(versesSelected, selected_verse_tags);
    //console.timeEnd('update_tags_view_after_verse_selection');
  }

  format_checkbox_element_based_on_selection(cb_element, selected_verse_tags) {
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

  uncheck_all_checkbox_elements() {
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

  handle_tag_accordion_change() {
    var new_reference_link = $('#tags-content').find('.ui-state-active').find('a');
    var tags_search_input = $('#tags-search-input');
    new_reference_link.append(tags_search_input);
  }

  init_ui() {
    $('#tags-content').accordion({
      autoHeight: false,
      animated: false,
      change: tags_controller.handle_tag_accordion_change
    });

    var filter_button = $("<img id=\"filter-button\" src=\"images/filter.png\"/>");
    var filter_active_symbol = $("<span id=\"filter-button-active\">*</span>");
    var tag_list_stats = $("<span id='tag-list-stats' style='margin-left: 1em;'></span>");
    var tags_search_input = $("<input type='text' id='tags-search-input'></input>");
    var reference_link = $($('#tags-content').find('a')[0]);
    var reference_link_text = reference_link.text();
    reference_link.empty();
    reference_link.append("<span style=\"float: left;\">" + reference_link_text + "</span>");
    reference_link.append(filter_button);
    reference_link.append(filter_active_symbol);
    reference_link.append(tag_list_stats);
    reference_link.append(tags_search_input);

    reference_link.find('#filter-button').bind('click', tags_controller.handle_filter_button_click);

    $('#tags-content-global').bind('mouseover', function() {
      $('#filter-dialog').css('display', 'none');
    });
    $('#filter-dialog').find('input').bind('click', tags_controller.handle_tag_filter_type_click);

    $('#tags-search-input').bind('keyup', tags_controller.handle_tag_search_input);
    $('#tags-search-input').bind('keydown', function(e) {
      e.stopPropagation(); 
    });

    //await tags_controller.updateTagUiBasedOnTagAvailability();

    tags_controller.bind_tag_events();
  }

  async updateTagUiBasedOnTagAvailability(tagCount=undefined) {
    var translationCount = app_controller.translation_controller.getTranslationCount();
    if (tagCount === undefined) {
      tagCount = await models.Tag.getTagCount();
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

  string_matches(search_string, search_value) {
    if (search_value == "") {
      return true;
    }

    var result = eval("search_string.search(/" + search_value + "/i)");
    return result != -1;
  }

  handle_filter_button_click(e) {
    var position = $(this).offset();
    var filter_dialog = $('#filter-dialog');

    if (filter_dialog.is(':visible')) {
      filter_dialog.css('display', 'none');
    } else {
      filter_dialog.css('top', position.top + 20);
      filter_dialog.css('left', position.left);
      filter_dialog.show();
    }
  }

  handle_tag_filter_type_click(e) {
    var selected_type = $(this)[0].value;
    var tags_content_global = $('#tags-content-global');
    tags_content_global.find('.checkbox-tag').show();
    $('#filter-button-active').hide();

    switch (selected_type) {
      case "assigned":
        tags_content_global.find('.checkbox-tag[book-assignment-count="' + 0 + '"]').hide();
        $('#filter-button-active').show();
        break;

      case "unassigned":
        tags_content_global.find('.checkbox-tag[book-assignment-count!="' + 0 + '"]').hide();
        $('#filter-button-active').show();
        break;
      
      case "recently-used":
        tags_content_global.find('.checkbox-tag').filter(function() {
          return tags_controller.tag_store.filterRecentlyUsedTags(this);
        }).hide();
        $('#filter-button-active').show();
        break;

      case "all":
      default:
        break;
    }
  }

  tag_title_matches_filter(tag_title, filter) {
      return tag_title.toLowerCase().indexOf(filter.toLowerCase()) != -1;
  }

  handle_tag_search_input(e) {
    clearTimeout(tags_controller.tag_search_timeout);
    var search_value = $(this).val();

    tags_controller.tag_search_timeout = setTimeout(function filter_tag_list() {
      //console.time('filter-tag-list');
      var tags_content = document.getElementById('tags-content-global');
      var tag_labels = tags_content.querySelectorAll('.cb-label');
      $(tags_content).find('.checkbox-tag').hide();

      for (var i = 0; i < tag_labels.length; i++) {
        var current_label = $(tag_labels[i]);

        if (tags_controller.tag_title_matches_filter(current_label.text(), search_value)) {
          $(current_label.closest('.checkbox-tag')).show();
        }
      }
      //console.timeEnd('filter-tag-list');
    }, 200);
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

  async onLatestUsedTagChanged(tagId=undefined, added=true, currentDbTag=undefined) {
    if (currentDbTag != undefined) {
      tagId = currentDbTag.id;
    } else if (tagId == undefined) {
      tagId = this.tag_store.latest_tag_id;
    }

    var currentTag = null;

    if (currentDbTag != undefined) {
      currentTag = currentDbTag;
    } else {
      currentTag = await this.tag_store.getTag(tagId);
    }

    if (currentTag != null) {
      var assignLastTagButton = $('.assign-last-tag-button');
      var label = i18n.t('tags-toolbar.assign-last-tag') + ': ' + currentTag.title;
      assignLastTagButton.text(label);

      if (added) {
        assignLastTagButton.addClass('ui-state-disabled');
      } else {
        assignLastTagButton.removeClass('ui-state-disabled');
      }
    }
  }
}

module.exports = TagsController;

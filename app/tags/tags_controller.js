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

function TagsController() {
  this.communication_controller = new TagsCommunicationController;

  this.new_standard_tag_button = $('#new-standard-tag-button');
  this.new_book_tag_button = $('#new-book-tag-button');

  this.tag_title_changed = false;

  this.verse_selection_blocked = false;

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

  this.oldest_recent_timestamp = null;
  this.latest_timestamp = null;

  var new_standard_tag_dlg_options = {
    title: i18n.t("tags.new-tag"),
    width: 300,
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

  var rename_standard_tag_dlg_options = {
    title: i18n.t("tags.rename-tag"),
    width: 300,
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

  this.new_standard_tag_button.bind('click', function() {
    tags_controller.handle_new_tag_button_click($(this), "standard");
  });

  this.new_book_tag_button.bind('click', function() {
    tags_controller.handle_new_tag_button_click($(this), "book");
  });

  // Handle the enter key in the tag title field and create the tag when it is pressed
  $('#new-standard-tag-title-input:not(.bound)').addClass('bound').on("keypress", (event) => {
    if (event.which == 13) {
      $('#new-standard-tag-dialog').dialog("close");
      tags_controller.save_new_tag(event, "standard");
    }
  });

  this.close_dialog_and_rename_standard_tag = function() {
    $('#rename-standard-tag-dialog').dialog('close');
    var new_title = $('#rename-standard-tag-title-input').val();
    var checkbox_tag = $('#tags-content').find('.checkbox-tag-id').filter(function(id) {
      return ($(this).text() == tags_controller.rename_standard_tag_id);
    }).closest('.checkbox-tag');
    var is_global = (checkbox_tag.parent().attr('id') == 'tags-content-global');
    tags_controller.update_tag_titles_in_verse_list(tags_controller.rename_standard_tag_id, is_global, new_title);
    tags_controller.communication_controller.update_tag(tags_controller.rename_standard_tag_id, new_title);
    tags_controller.sort_tag_lists();
    bible_browser_controller.tag_selection_menu.requestTagsForMenu();
    bible_browser_controller.tab_controller.updateTabTitleAfterTagRenaming(tags_controller.rename_standard_tag_title, new_title);
  };

  this.rename_tag_in_view = function(id, title) {
    // Rename tag in tag list on the left side
    var checkbox_tag = tags_controller.get_checkbox_tag(id);
    var label = checkbox_tag.find('.cb-label');
    label.text(title);

    // Rename tag in tag selection menu above bible browser
    var tag_selection_entry = $('#tag-browser-tag-' + id).find('.tag-browser-tag-title').find('.tag-browser-tag-title-content');
    tag_selection_entry.text(title);
  }

  this.save_new_tag = function(e, type) {
    var new_tag_title = $('#new-' + type + '-tag-title-input').val();
    var is_book_tag = $('#new-tag-booktag-cb').is(':checked');
    this.new_tag_created = true;
    this.last_created_tag = new_tag_title;
    tags_controller.communication_controller.create_new_tag(new_tag_title, type);
    $(e).dialog("close");
  };

  this.handle_new_tag_button_click = function(button, type) {
    if ($(button).hasClass('ui-state-disabled')) {
      return;
    }

    $('#new-' + type + '-tag-title-input').val(''); 
    $('#new-' + type + '-tag-dialog').dialog('open');
    $('#new-' + type + '-tag-title-input').focus();
  };

  this.handle_delete_tag_button_click = function(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    var tag_id = checkbox_tag.find('.checkbox-tag-id:first').html();
    var parent_id = checkbox_tag.parent().attr('id');
    var label = checkbox_tag.find('.cb-label').html();

    tags_controller.tag_to_be_deleted_is_global = (parent_id == 'tags-content-global');
    tags_controller.tag_to_be_deleted_title = label;
    tags_controller.tag_to_be_deleted = tag_id;
    
    var number_of_tagged_verses = checkbox_tag.find('.global-assignment-count').text(); 

    $('#delete-tag-name').html(label);
    $('#delete-tag-number-of-verses').html(number_of_tagged_verses); // FIXME
    $('#delete-tag-confirmation-dialog').dialog('open');
  };

  this.delete_tag_after_confirmation = async function() {
    await tags_controller.communication_controller.destroy_tag(tags_controller.tag_to_be_deleted);
    await tags_controller.updateTagUiBasedOnTagAvailability();
    $('#delete-tag-confirmation-dialog').dialog('close');
  };

  this.remove_tag_by_id = function(tag_id, tag_is_global, tag_title) {
    var checkbox_tag = tags_controller.get_checkbox_tag(tag_id);
    checkbox_tag.detach();

    var tag_data_elements = $('.tag-id').filter(function(index){
      return ($(this).html() == tag_id);
    });

    var verse_list = $.create_xml_doc(tags_controller.element_list_to_xml_verse_list(tag_data_elements));

    tags_controller.change_verse_list_tag_info(tag_id,
                                               tag_title,
                                               verse_list,
                                               "remove");
  };

  this.clear_verse_selection = function() {
    tags_controller.selected_verse_references = new Array;
    tags_controller.selected_verse_boxes = new Array;
    $('.verse-text').removeClass('ui-selectee ui-selected ui-state-highlight');
    tags_controller.update_tags_view_after_verse_selection(true);
  };

  this.handle_tag_label_click = function(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    var checkbox = checkbox_tag.find('.tag-cb');

    var current_verse_list = tags_controller.selected_verse_references;

    if (!tags_controller.is_blocked && current_verse_list.length > 0) {
      checkbox.prop('checked', !checkbox.prop('checked'));
      tags_controller.handle_checkbox_tag_state_change(checkbox_tag);
    }
  };

  // 2019-05-30
  // FIXME
  // This function is not used after we are using the label also for tag assignment
  // We may use it again to quickly mark the tagged verses
  this.handle_tag_label_click__by_highlighting_tagged_verses = function() {
    var checkbox_tag = $(this).closest('.checkbox-tag');
    var cb_label = checkbox_tag.find('.cb-label').html();
    var cb_is_global = (checkbox_tag.find('.is-global').html() == 'true');

    var matching_tag_data = $('.tag-title').filter(function(index) {
      var current_tag_is_global = $(this).parent().hasClass('tag-global');
      return (($(this).html() == cb_label) && (cb_is_global == current_tag_is_global));
    });

    tags_controller.clear_verse_selection();

    matching_tag_data.closest('.verse-box').find('.verse-text')
      .addClass('ui-selected');

    if (matching_tag_data.length > 0) {
      var current_verse_reference = $(matching_tag_data[0]).closest('.verse-box')
                                        .find('.verse-reference-content').html();

      tags_controller.update_tags_view_after_verse_selection(true);
      bible_browser_controller.jump_to_reference(current_verse_reference, false);
    }
  };

  this.handle_tag_cb_click = function(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    tags_controller.handle_checkbox_tag_state_change(checkbox_tag);
  };

  this.handle_checkbox_tag_state_change = function(checkbox_tag) {
    var current_verse_list = tags_controller.selected_verse_references;

    if (tags_controller.is_blocked || current_verse_list.length == 0) {
      return;
    }

    tags_controller.is_blocked = true;
    setTimeout(function() {
      tags_controller.is_blocked = false;
    }, 300);

    var id = parseInt(checkbox_tag.find('.checkbox-tag-id:first').html());
    var cb = checkbox_tag.find('.tag-cb')[0];
    var cb_label = checkbox_tag.find('.cb-label').html();
    var checkbox_is_checked = $(cb).is(':checked');
    cb.blur();

    var current_verse_selection = tags_controller.current_verse_selection_as_xml(); 
    var current_verse_ids = tags_controller.current_verse_selection_as_verse_ids();

    checkbox_tag.find('.cb-label').removeClass('underline');
    checkbox_tag.find('.cb-label-postfix').html('');

    var is_global = false;
    if (checkbox_tag.find('.is-global').html() == 'true') {
      is_global = true;
    }

    if (checkbox_is_checked) {
      // Update last used timestamp
      var current_timestamp = new Date(Date.now()).getTime();
      checkbox_tag.find('.last-used-timestamp').text(current_timestamp);
      tags_controller.update_tag_timestamps();

      $(cb).attr('title', i18n.t("tags.remove-tag-assignment"));

      filteredVerseIds = [];

      // Create a list of filtered ids, that only contains the verses that do not have the selected tag yet
      for (var i = 0; i < current_verse_ids.length; i++) {
        var currentVerseId = current_verse_ids[i];
        var currentVerseList = bible_browser_controller.getCurrentVerseList();
        var currentVerseBox = currentVerseList.find('.verse-id-' + currentVerseId);
        var existingTagIdElements = currentVerseBox.find('.tag-id');
        var existingTagIds = [];
        
        for (var j = 0; j < existingTagIdElements.length; j++) {
          var currentTagId = parseInt($(existingTagIdElements[j]).text());
          existingTagIds.push(currentTagId);
        }

        if (!existingTagIds.includes(id)) {
          filteredVerseIds.push(currentVerseId);
        }
      }

      tags_controller.communication_controller.assign_tag_to_verses(id, filteredVerseIds);

      tags_controller.change_verse_list_tag_info(id,
                                                 cb_label,
                                                 $.create_xml_doc(current_verse_selection),
                                                 "assign");
      
      bible_browser_controller.tag_statistics.update_book_tag_statistics_box();

    } else {

      tags_controller.remove_tag_assignment_job = {
        'id': id,
        'is_global': is_global,
        'cb_label': cb_label,
        'checkbox_tag': checkbox_tag,
        'verse_list': current_verse_list,
        'verse_ids': current_verse_ids,
        'xml_verse_selection': $.create_xml_doc(current_verse_selection),
        'cb': $(cb)
      };

      if (current_verse_list.length > 1) {
        $('#remove-tag-assignment-name').html(cb_label);
        $('#remove-tag-assignment-confirmation-dialog').dialog('open');
      } else {
        tags_controller.remove_tag_assignment_after_confirmation();
      }
    }
  };
  
  this.get_checkbox_tag = function(id) {
    var checkbox_tag = $('#tags-content').find('.checkbox-tag').filter(function(element) {
      return ($(this).find('.checkbox-tag-id').text() == id);
    });

    return checkbox_tag;
  };

  this.update_tag_verse_count = function(id, count, to_increment) {
    var checkbox_tag = tags_controller.get_checkbox_tag(id);
    var cb_label_element = checkbox_tag.find('.cb-label');
    var tag_title = cb_label_element.text();
    var tag_assignment_count_element = checkbox_tag.find('.cb-label-tag-assignment-count');
    var tag_assignment_count_values = tag_assignment_count_element.text().substring(
      1, tag_assignment_count_element.text().length - 1
    );

    var current_book_count = 0;
    var current_global_count = 0;

    var currentBook = bible_browser_controller.tab_controller.getTab().getBook();

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

    checkbox_tag.find('.book-assignment-count').text(new_book_count);
    checkbox_tag.find('.global-assignment-count').text(new_global_count);

    var currentBook = bible_browser_controller.tab_controller.getTab().getBook();

    var new_label = "";
    if (currentBook == null) {
      new_label = "(" + new_global_count + ")";
    } else {
      new_label = "(" + new_book_count + " | " + new_global_count + ")";
    }

    tag_assignment_count_element.text(new_label);

    // Update tag count in tag selection menu as well
    bible_browser_controller.tag_selection_menu.updateVerseCountInTagMenu(tag_title, new_global_count);
  };

  this.remove_tag_assignment_after_confirmation = function() {
    var job = tags_controller.remove_tag_assignment_job;

    job.cb.attr('title', i18n.t("tags.assign-tag"));
    job.checkbox_tag.append(tags_controller.loading_indicator);

    tags_controller.communication_controller.remove_tag_from_verses(job.id, job.verse_ids);
    
    tags_controller.change_verse_list_tag_info(job.id,
                                               job.cb_label,
                                               job.xml_verse_selection,
                                               "remove");
    
    bible_browser_controller.tag_statistics.update_book_tag_statistics_box();

    tags_controller.remove_tag_assignment_job = null;
    $('#remove-tag-assignment-confirmation-dialog').dialog('close');
  };

  /**
   * This function updates the tag info in existing verse lists after tags have been assigned/removed.
   * It does this for the currently opened tab and also within all other tabs where the corresponding verse is loaded.
   */
  this.change_verse_list_tag_info = async function(tag_id,
                                                   tag_title,
                                                   verse_selection,
                                                   action) {

    verse_selection = $(verse_selection);
    var selected_verses = verse_selection.find('verse');
    var current_verse_list = bible_browser_controller.getCurrentVerseList();

    for (var i = 0; i < selected_verses.length; i++) {
      var current_verse_id = $(selected_verses[i]).find('verse-id').text();
      var current_verse_box = current_verse_list.find('.verse-id-' + current_verse_id);
      tags_controller.change_verse_list_tag_info_for_verse_box(current_verse_box, tag_id, tag_title, action);
    }

    for (var i = 0; i < selected_verses.length; i++) {
      var current_verse_id = $(selected_verses[i]).find('verse-id').text();
      var current_db_verse = await models.Verse.findByPk(current_verse_id);
      tags_controller.change_verse_list_tag_info_for_verse_boxes_in_other_tabs(current_db_verse, tag_id, tag_title, action);
    }
  };

  this.change_verse_list_tag_info_for_verse_boxes_in_other_tabs = async function(db_verse, tag_id, tag_title, action) {
    var current_tab_index = bible_browser_controller.tab_controller.getSelectedTabIndex();
    var tab_count = bible_browser_controller.tab_controller.getTabCount();
    var absolute_verse_nrs = await db_verse.getAbsoluteVerseNrs();

    for (var i = 0; i < tab_count; i++) {
      if (i != current_tab_index) {
        var current_tab_translation = bible_browser_controller.tab_controller.getTab(i).getBibleTranslationId();
        var current_db_bible_translation = await models.BibleTranslation.findByPk(current_tab_translation);
        var current_versification = current_db_bible_translation.versification;
        var current_target_verse_nr = "";

        if (current_versification == 'HEBREW') {
          current_target_verse_nr = absolute_verse_nrs["absoluteVerseNrHeb"];
        } else {
          current_target_verse_nr = absolute_verse_nrs["absoluteVerseNrEng"];
        }

        var target_verse_list = bible_browser_controller.getCurrentVerseList(i);
        var target_verse_box = target_verse_list.find('.verse-nr-' + current_target_verse_nr);

        // There are potentially multiple verse boxes returned (could be the case for a tagged verse list or a search results list)
        // Therefore we have to go through all of them and check for each of them whether the book is matching our reference book
        for (var j = 0; j < target_verse_box.length; j++) {
          var specific_target_verse_box = $(target_verse_box[j]);
          var target_verse_box_bible_book_id = specific_target_verse_box.find('.verse-bible-book-id').text();

          if (target_verse_box_bible_book_id == db_verse.bibleBookId) {
            tags_controller.change_verse_list_tag_info_for_verse_box(specific_target_verse_box, tag_id, tag_title, action);
          }
        }
      }
    }
  };

  this.change_verse_list_tag_info_for_verse_box = function(verse_box, tag_id, tag_title, action) {
    var current_tag_info = verse_box.find('.tag-info');
    var current_tag_info_title = current_tag_info.attr('title');

    new_tag_info_title_array = tags_controller.get_new_tag_info_title_array(current_tag_info_title, tag_title, action);
    var updated = tags_controller.update_tag_info_title(current_tag_info, new_tag_info_title_array, current_tag_info_title);

    if (updated) {
      tags_controller.update_tag_data_container(verse_box, tag_id, tag_title, action);
      tags_controller.update_visible_tags_of_verse_box(verse_box, new_tag_info_title_array);
    }
  };

  this.get_new_tag_info_title_array = function(tag_info_title, tag_title, action) {
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
  };

  this.update_tag_info_title = function(tag_info, new_title_array, old_title) {
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
      tag_info.attr('title', new_tag_info_title);
      if (new_tag_info_title != "") {
        tag_info.addClass('visible');
      } else {
        tag_info.removeClass('visible');
      }

      return true;
    }
  };

  this.update_tag_data_container = function(verse_box, tag_id, tag_title, action) {
    var current_tag_data_container = verse_box.find('.tag-data');

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

  this.update_visible_tags_of_verse_box = function(verse_box, tag_title_array) {
    var tag_box = $(verse_box).find('.tag-box');
    tag_box.empty();

    for (var i = 0; i < tag_title_array.length; i++) {
      var current_tag_title = tag_title_array[i];
      var tag_html = tags_controller.html_code_for_visible_tag(current_tag_title);
      tag_box.append(tag_html);
    }

    if (tag_title_array.length > 0) {
      tag_box.show();
      $(verse_box).find('.tag').bind('click', bible_browser_controller.handle_tag_reference_click);
    } else {
      tag_box.hide();
    }
  };

  this.html_code_for_visible_tag = function(tag_title) {
    var tag_title_with_unbreakable_spaces = tag_title.replace(/ /g, '&nbsp;') + ' ';
    return "<div class=\"tag\" title=\"" + i18n.t("bible-browser.tag-hint") + "\">" + 
           tag_title_with_unbreakable_spaces + "</div>";
  };

  this.new_tag_data_html = function(tag_class, title, id) {
    var new_tag_data_div = "<div class='" + tag_class + "'>";
    new_tag_data_div += "<div class='tag-title'>" + title + "</div>";
    new_tag_data_div += "<div class='tag-id'>" + id + "</div>";
    new_tag_data_div += "</div>";

    return new_tag_data_div;
  };

  this.edit_tag_title = function(value, settings) {
    var old_value = $(this)[0].revert;
    tags_controller.tag_title_changed = (old_value != value);

    return value;
  };

  this.sort_tag_lists = function() {
    var global_tags_box = $('#tags-content-global');
    var book_tags_box = $('#tags-content-book');
    var sort_function = function(a,b) {
      return ($(a).find('.cb-label').text().toLowerCase() > $(b).find('.cb-label').text().toLowerCase()) ? 1 : -1;
    }

    global_tags_box.find('.checkbox-tag').sort_elements(sort_function);
    book_tags_box.find('.checkbox-tag').sort_elements(sort_function);
  };

  this.tags_search_input_is_empty = function() {
    return $('#tags-search-input')[0].empty();
  };

  this.refresh_timestamps_and_book_tag_statistics = function(tag_list, current_book) {
    var book_tag_statistics = [];
    var all_timestamps = [];
    
    for (var i = 0; i < tag_list.length; i++) {
      var current_tag = tag_list[i];
      var is_used_in_current_book = (current_tag.bookAssignmentCount > 0) ? true : false;
      var last_used_timestamp = parseInt(current_tag.lastUsed);

      if (!Number.isNaN(last_used_timestamp) && !all_timestamps.includes(last_used_timestamp)) {
        all_timestamps.push(last_used_timestamp);
      }

      if (current_book != null && is_used_in_current_book) {
        book_tag_statistics[current_tag.title] = parseInt(current_tag.bookAssignmentCount);
      }
    }

    tags_controller.update_tag_timestamps_from_list(all_timestamps);
    if (current_book != null) {
      bible_browser_controller.tag_statistics.update_book_tag_statistics_box(book_tag_statistics);
    }
  };

  this.render_tags = async function(tag_list) {
    //console.time("render_tags");
    var current_book = bible_browser_controller.tab_controller.getTab().getBook();
    var global_tags_box_el = document.getElementById('tags-content-global');

    // Empty global tags element
    global_tags_box_el.innerHTML = '';

    var all_tags_html = tagListTemplate({
      tags: tag_list,
      current_book: current_book,
      current_filter: $('#tags-search-input').val(),
      rename_tag_label: i18n.t("general.rename"),
      delete_tag_label: i18n.t("tags.delete-tag-permanently"),
    });

    global_tags_box_el.innerHTML = all_tags_html;

    tags_controller.refresh_timestamps_and_book_tag_statistics(tag_list, current_book);
    configure_button_styles('#tags-content');
    //tags_controller.update_tag_count_after_rendering(); // FIXME: to be integrated!

    tags_controller.update_tags_view_after_verse_selection(true);
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
  };

  this.update_tag_timestamps = function() {
    var tags_content_global = $('#tags-content-global');
    var all_timestamp_elements = tags_content_global.find('.last-used-timestamp');
    var all_timestamps = [];

    for (var i = 0; i < all_timestamp_elements.length; i++) {
      var current_timestamp = parseInt($(all_timestamp_elements[i]).text());

      if (!all_timestamps.includes(current_timestamp) && !Number.isNaN(current_timestamp)) {
        all_timestamps.push(current_timestamp);
      }
    }

    tags_controller.update_tag_timestamps_from_list(all_timestamps);
  };

  this.update_tag_timestamps_from_list = function(all_timestamps) {
    if (all_timestamps.length > 0) {
      all_timestamps.sort();
      var recent_timestamps_range = 10;
      var last_element_index = all_timestamps.length - 1;
      var oldest_recent_element_index = last_element_index - (recent_timestamps_range - 1);
      if (oldest_recent_element_index < 0) {
        oldest_recent_element_index = 0;
      }

      tags_controller.latest_timestamp = all_timestamps[last_element_index];
      tags_controller.oldest_recent_timestamp = all_timestamps[oldest_recent_element_index];
    }
  };

  this.handle_rename_tag_click__by_opening_rename_dialog = function(event) {
    var checkbox_tag = $(event.target).closest('.checkbox-tag');
    var cb_label = checkbox_tag.find('.cb-label').text();

    $('#rename-standard-tag-title-input').val(cb_label);
    $('#rename-standard-tag-dialog').dialog('open');
    $('#rename-standard-tag-title-input').focus();

    tags_controller.rename_standard_tag_id =  checkbox_tag.find('.checkbox-tag-id').text();
    tags_controller.rename_standard_tag_title = cb_label;
  };

  this.update_tag_count_after_rendering = function() {
    // FIXME: to be integrated
    var global_tag_count = $('#tags-content-global').find('.checkbox-tag').length;
    var book_tag_count = $('#tags-content-book').find('.checkbox-tag').length;

    var global_used_tag_count = $('#tags-content-global').find('.tag-show-selected-button:not(.ui-state-disabled)').length;

    var global_header = $($('#tags-content').find('.ui-accordion-header').find('a')[0]);
    var book_header = $($('#tags-content').find('.ui-accordion-header').find('a')[1]);

    global_header.html('Universal tags (' + 
                       global_used_tag_count +
                       ' used / ' +
                       global_tag_count +
                       ' total)');

    book_header.html('Book tags (' + book_tag_count + ')');
  };

  this.removeEventListeners = function(element_list, type, listener) {
    for (var i = 0; i < element_list.length; i++) {
      element_list[i].removeEventListener(type, listener);
    }
  };

  this.addEventListeners = function(element_list, type, listener) {
    for (var i = 0; i < element_list.length; i++) {
      element_list[i].addEventListener(type, listener);
    }
  };

  this.bind_tag_events = function() {
    var tags_box = document.getElementById('tags-content-global');

    tags_box.addEventListener('click', function(event) {
      if (event.target.matches('.tag-delete-icon')) {
        tags_controller.handle_delete_tag_button_click(event);
      } else if (event.target.matches('.rename-tag-label')) {
        tags_controller.handle_rename_tag_click__by_opening_rename_dialog(event);
      } else if (event.target.matches('.tag-cb')) {
        tags_controller.handle_tag_cb_click(event);
      } else if (event.target.matches('.cb-label')) {
        tags_controller.handle_tag_label_click(event);
      } else {
        return;
      }
    }, false);

    tags_box.addEventListener('mouseover', function(event) {
      if (event.target.matches('.cb-label') ||
          event.target.matches('.cb-label-tag-assignment-count') ||
          event.target.matches('.checkbox-tag')) {

        var current_id = $(event.target).find('.checkbox-tag-id').text();

        if (tags_controller.last_mouseover_id !== undefined && 
            tags_controller.last_mouseover_element !== undefined &&
            current_id != tags_controller.last_mouseover_id) {
              
          $(tags_controller.last_mouseover_element).find('.rename-tag-label').hide();
        }

        if (current_id != tags_controller.last_mouseover_id) {
          $(event.target).closest('.checkbox-tag').find('.rename-tag-label').show();
        }

        tags_controller.last_mouseover_element = $(event.target).closest('.checkbox-tag');
        tags_controller.last_mouseover_id = $(event.target).closest('.checkbox-tag').find('.checkbox-tag-id').text();
      }
    }, false);

    tags_box.addEventListener('mouseout', function(event) {
      if (event.target.matches('.tags-content-global')) {
        if (tags_controller.last_mouseover_element !== undefined) {
          $(tags_controller.last_mouseover_element).find('.rename-tag-label').hide();
        }
      }
    }, false);
    
    tags_controller.init_verse_expand_box();
  };

  this.reference_to_absolute_verse_nr = function(bible_book, chapter, verse) {
    var verse_nr = 0;
  
    for (var i = 0; i < chapter - 1; i++) {
      if (bible_chapter_verse_counts[bible_book][i] != undefined) {
        verse_nr += bible_chapter_verse_counts[bible_book][i];
      }
    }
    
    verse_nr += Number(verse);
    return verse_nr;
  };
  
  this.reference_to_verse_nr = function(bible_book_short_title, reference, split_support) {
    if (reference == null) {
      return;
    }
  
    var split_support = false;
    if (reference.search(/b/) != -1) {
      split_support = true;
    }
    reference = reference.replace(/[a-z]/g, '');
    var ref_chapter = Number(reference.split(reference_separator)[0]);
    var ref_verse = Number(reference.split(reference_separator)[1]);
  
    verse_nr = tags_controller.reference_to_absolute_verse_nr(bible_book_short_title, ref_chapter, ref_verse);
    if (split_support) verse_nr += 0.5;
  
    return verse_nr;
  };

  this.init_verse_expand_box = async function() {
    $('.verse-reference-content').filter(":not('.tag-events-configured')").bind('mouseover', tags_controller.mouse_over_verse_reference_content);

    $("#expand-button").prop("title", i18n.t("bible-browser.load-verse-context"));

    $('#expand-button').filter(":not('.tag-events-configured')").bind('mouseover', function() {
      $(this).addClass('state-highlighted');
    });

    $('#expand-button').filter(":not('.tag-events-configured')").bind('mouseout', function() {
      $(this).removeClass('state-highlighted');
    });

    $('#expand-button').filter(":not('.tag-events-configured')").bind('click', async function() {
      var currentTabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
      var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
      var current_reference = $(tags_controller.current_mouseover_verse_reference);
      var start_verse_box = current_reference.closest('.verse-box');
      var current_bible_book_id = start_verse_box.find('.verse-bible-book-id').text();
      var current_book_title = await models.BibleBook.getShortTitleById(current_bible_book_id);
      var start_verse_nr = tags_controller.reference_to_verse_nr(current_book_title, start_verse_box.find('.verse-reference-content').html(), false);
      start_verse_nr -= 3;
      if (start_verse_nr < 1) {
        start_verse_nr = 1;
      }

      var number_of_verses = 5;

      tags_controller.context_verse = start_verse_box;

      bible_browser_controller.communication_controller.request_book_text(
        currentTabIndex,
        currentTabId,
        current_book_title,
        tags_controller.load_verse_context,
        start_verse_nr,
        number_of_verses
      );

      $('#verse-expand-box').hide();
    }).addClass('tag-events-configured');

    // The following classes are representing the elements that will cause the the verse expand box to disappear when hovering over them
    var mouseOverHideClasses = '.verse-content, .tag-info, .navigation-pane, .tag-browser-verselist-book-header, .verse-list-menu';

    $(mouseOverHideClasses).bind('mouseover', function() {
      tags_controller.hide_verse_expand_box();
    }).addClass('tag-events-configured');
  };

  this.load_verse_context = function(verse_list) {
    /* First remove existing verse boxes to avoid duplication */
    var context_verse_id = $(tags_controller.context_verse).find('.verse-id').text();

    for (var i = 0; i < $(verse_list).length; i++) {
      var current_id = $($(verse_list)[i]).find('.verse-id').text();

      if (current_id != "" && current_id != context_verse_id) {
        var existing_verse_box = $('.verse-id-' + current_id);
        existing_verse_box.remove();
      }
    }

    /* Replace the verse with its full context */
    $(tags_controller.context_verse).replaceWith(verse_list);

    /* Clear the potentially existing verse selection */
    tags_controller.clear_verse_selection();

    /* Select/highlight the tagged verse */
    var selected_verse_box = $('.verse-id-' + context_verse_id);
    tags_controller.selected_verse_boxes.push(selected_verse_box);
    selected_verse_box.find('.verse-text').addClass('ui-selected');

    /* Update the tags view after the selection */
    tags_controller.update_tags_view_after_verse_selection(true);

    bible_browser_controller.bind_events_after_bible_text_loaded();
  };

  this.hide_verse_expand_box = function() {
    $('#verse-expand-box').hide();
    tags_controller.current_mouseover_verse_reference = null;
  };

  this.mouse_over_verse_reference_content = function() {
    if ($(this)[0] != tags_controller.current_mouseover_verse_reference) {
      tags_controller.current_mouseover_verse_reference = $(this)[0];
      var verse_reference_position = $(this).offset();

      $('#verse-expand-box').css('top', verse_reference_position.top - 7);
      $('#verse-expand-box').css('left', verse_reference_position.left + 30);

      var currentTagIdList = bible_browser_controller.tab_controller.getTab().getTagIdList();
      if (currentTagIdList != null && currentTagIdList != "") {
        $('#verse-expand-box').show();
      }
    }
  }

  this.update_tag_titles_in_verse_list = function(tag_id, is_global, title) {
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
  };

  this.update_tag_tooltip_of_verse_box = function(verse_box) {
    var new_tooltip = tags_controller.get_tag_title_from_tag_data(verse_box);
    verse_box.find('.tag-info').attr('title', new_tooltip);
  };

  this.get_tag_title_from_tag_data = function(verse_box) {
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
  };

  this.update_tags_title = function(verse_box) {
    verse_box.find('.tag-info').attr('title', tags_controller.get_tag_title_from_tag_data(verse_box));
  };

  this.current_verse_selection_tags = function() {
    var verse_selection_tags = new Array;

    for (var i = 0; i < tags_controller.selected_verse_boxes.length; i++) {
      var current_verse_box = $(tags_controller.selected_verse_boxes[i]);
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
      current_tag_obj.complete = (current_tag_obj.count == tags_controller.selected_verse_boxes.length);
    }

    return verse_selection_tags;
  };

  this.element_list_to_xml_verse_list = function(element_list) {
    var xml_verse_list = "<verse-list>";

    for (var i = 0; i < element_list.length; i++) {
      var verse_box = $(element_list[i]).closest('.verse-box');
      var verse_reference = verse_box.find('.verse-reference-content').html();
      var verse_reference_id = "";
      if (verse_box.find('.verse-reference-id').length > 0) {
        verse_reference_id = verse_box.find('.verse-reference-id').html();
      }
      var verse_id = verse_box.find('.verse-id').html();
      var verse_bible_book = "";
      if (verse_box.find('.verse-bible-book').length > 0) {
        verse_bible_book = verse_box.find('.verse-bible-book').html();
      }

      var verse_part = verse_box.find('.verse-part').html();
      var abs_verse_nr = verse_box.find('.abs-verse-nr').html();

      xml_verse_list += "<verse>";
      xml_verse_list += "<verse-id>" + verse_id + "</verse-id>";
      xml_verse_list += "<verse-bible-book>" + verse_bible_book + "</verse-bible-book>";
      xml_verse_list += "<verse-reference>" + verse_reference + "</verse-reference>";
      xml_verse_list += "<verse-reference-id>" + verse_reference_id + "</verse-reference-id>";
      xml_verse_list += "<verse-part>" + verse_part + "</verse-part>";
      xml_verse_list += "<abs-verse-nr>" + abs_verse_nr + "</abs-verse-nr>";
      xml_verse_list += "</verse>";
    }

    xml_verse_list += "</verse-list>";

    return xml_verse_list;
  };

  this.current_verse_selection_as_xml = function() {
    var selected_verse_elements = tags_controller.selected_verse_boxes;

    return (tags_controller.element_list_to_xml_verse_list(selected_verse_elements));
  };

  this.get_selected_verse_text = function() {
    var verse_text = "";

    for (var i = 0; i < tags_controller.selected_verse_boxes.length; i++) {
      verse_text += $(tags_controller.selected_verse_boxes[i]).find('.verse-text').text().trim() + "\n";
    }

    return verse_text;
  };

  this.current_verse_selection_as_verse_ids = function() {
    var selected_verse_ids = new Array;
    var selected_verse_elements = tags_controller.selected_verse_boxes;
    
    for (var i = 0; i < selected_verse_elements.length; i++) {
      var verse_box = $(selected_verse_elements[i]);
      var verse_id = verse_box.find('.verse-id').html();

      selected_verse_ids.push(verse_id);
    }

    return selected_verse_ids;
  };

  this.current_verse_selection_as_verse_ids = function() {
    var selected_verse_ids = new Array;
    var selected_verse_elements = tags_controller.selected_verse_boxes;
    
    for (var i = 0; i < selected_verse_elements.length; i++) {
      var verse_box = $(selected_verse_elements[i]);
      var verse_id = verse_box.find('.verse-id').html();

      selected_verse_ids.push(verse_id);
    }

    return selected_verse_ids;
  };

  this.update_tags_view_after_verse_selection = async function(force) {
    //console.time('update_tags_view_after_verse_selection');
    if (tags_controller.verse_selection_blocked && force !== true) {
      return;
    }

    tags_controller.verse_selection_blocked = true;
    setTimeout(function() {
      tags_controller.verse_selection_blocked = false;
    }, 300);

    var selected_verse_tags = tags_controller.current_verse_selection_tags();
    var selected_verses_content = i18n.t("tags.none-selected");

    var app_container = document.getElementById('app-container');
    var assign_tag_label = i18n.t("tags.assign-tag");

    var all_tag_cbs = app_container.querySelectorAll('.tag-cb');
    if (all_tag_cbs.length > 0) {
      for (var i = 0; i < all_tag_cbs.length; i++) {
        all_tag_cbs[i].removeAttribute('checked');
        all_tag_cbs[i].setAttribute('title', assign_tag_label);
      }

      var all_cb_labels = app_container.querySelectorAll('.cb-label');
      var cb_label_postfixes = app_container.querySelectorAll('.cb-label-postfix');
      for (var i = 0; i < all_cb_labels.length; i++) {
        all_cb_labels[i].classList.remove('underline');
        cb_label_postfixes[i].innerHTML = '';
      }
    }

    if (tags_controller.selected_verse_boxes.length > 0) {
      if (all_tag_cbs.length > 0) {
        for (var i = 0; i < all_tag_cbs.length; i++) {
          all_tag_cbs[i].removeAttribute('disabled');
          all_tag_cbs[i].style.opacity = '1.0';
        }
      }

      bible_browser_controller.translationComparison.enableComparisonButton();
      
      var checkbox_tags = app_container.querySelectorAll('.checkbox-tag');

      for (var i = 0; i < checkbox_tags.length; i++) {
        var current_tag_element = checkbox_tags[i];
        var current_checkbox = current_tag_element.querySelector('.tag-cb');
        var current_title_element = current_tag_element.querySelector('.cb-label');
        var current_title = current_title_element.innerHTML;
        var current_title_element_postfix = current_tag_element.querySelector('.cb-label-postfix');
        
        for (var j = 0; j < selected_verse_tags.length; j++) {
          var current_tag_obj = selected_verse_tags[j];
          var current_tag_obj_is_global = (current_tag_obj.category == 'tag-global');

          if (current_tag_obj.title == current_title) {
            if (current_tag_obj.complete) {
              current_checkbox.setAttribute('checked', 'checked');
              current_checkbox.setAttribute('title', 'Remove tag assignment');
            } else {
              current_title_element_postfix.innerHTML = '&nbsp;*';
              current_title_element.classList.add('underline');
            }
          }
        }
      }
    } else {
      var all_tag_cbs = document.querySelectorAll('.tag-cb');
      if (all_tag_cbs.length > 0) {
        for (var i = 0; i < all_tag_cbs.length; i++) {
          all_tag_cbs[i].setAttribute('disabled', 'disabled');
          all_tag_cbs[i].setAttribute('title', '');
          all_tag_cbs[i].style.opacity = '0.3';
        }
      }

      bible_browser_controller.translationComparison.disableComparisonButton();
    }

    var selectedBooks = [];
    for (var i = 0; i < tags_controller.selected_verse_boxes.length; i++) {
      var currentVerseBox = $(tags_controller.selected_verse_boxes[i]);
      if (currentVerseBox.length > 1) {
        currentVerseBox = $(currentVerseBox[0]);
      }

      var currentBibleBookId = currentVerseBox.find('.verse-bible-book-id').text();
      var currentBookShortName = await models.BibleBook.getShortTitleById(currentBibleBookId);

      if (!selectedBooks.includes(currentBookShortName)) {
        selectedBooks.push(currentBookShortName);
      }
    }

    var selected_verses_content = [];
    for (var i = 0; i < selectedBooks.length; i++) {
      var currentBookShortName = selectedBooks[i];
      var currentBookLongTitle = models.BibleBook.getBookLongTitle(currentBookShortName);
      var currentBookName = i18nHelper.getSwordTranslation(currentBookLongTitle);

      var currentBookVerseReferences = [];
      for (var j = 0; j < tags_controller.selected_verse_boxes.length; j++) {
        var currentVerseBox = $(tags_controller.selected_verse_boxes[j]);
        if (currentVerseBox.length > 1) {
          currentVerseBox = $(currentVerseBox[0]);
        }
        
        var currentVerseBibleBookId = currentVerseBox.find('.verse-bible-book-id').text();
        var currentVerseBibleBookShortName = await models.BibleBook.getShortTitleById(currentVerseBibleBookId);

        if (currentVerseBibleBookShortName == currentBookShortName) {
          var currentVerseReference = currentVerseBox.find('a:first').attr('name');
          currentBookVerseReferences.push(currentVerseReference);
        }
      }

      var formatted_verse_list = tags_controller.format_verse_list_for_view(currentBookVerseReferences, true);
      var currentBookVerseReferenceDisplay = currentBookName + ' ' + formatted_verse_list;
      selected_verses_content.push(currentBookVerseReferenceDisplay);
    }

    $('#tags-header').find('#selected-verses').html(selected_verses_content.join('; '));
  };

  this.format_verse_list_for_view = function(selected_verse_array, link_references) {
    var absolute_nr_list = tags_controller.verse_reference_list_to_absolute_verse_nr_list(selected_verse_array);
    var verse_list_for_view = "";

    if (selected_verse_array.length > 0) {
      if (tags_controller.verse_list_has_gaps(absolute_nr_list)) {
        var current_start_index = 0;

        for (var i = 0; i < absolute_nr_list.length; i++) {
          if (absolute_nr_list[i] - absolute_nr_list[i-1] > 1) {

            var current_end_index = i - 1;
            
            verse_list_for_view += tags_controller.format_single_verse_block(selected_verse_array,
                                                                             current_start_index,
                                                                             current_end_index,
                                                                             link_references);

            verse_list_for_view += "; ";

            if (i == (absolute_nr_list.length - 1)) {
              verse_list_for_view += tags_controller.format_single_verse_block(selected_verse_array,
                                                                               i,
                                                                               i,
                                                                               link_references);
            }

            current_start_index = i;
          } else {
            if (i == (absolute_nr_list.length - 1)) {
              verse_list_for_view += tags_controller.format_single_verse_block(selected_verse_array,
                                                                               current_start_index,
                                                                               i,
                                                                               link_references)
            }
          }
        }
      } else { // verse_list doesn't have gaps!
        verse_list_for_view += tags_controller.format_single_verse_block(selected_verse_array,
                                                                         0,
                                                                         selected_verse_array.length - 1,
                                                                         link_references);
      }
    }

    return verse_list_for_view;
  };

  this.format_passage_reference_for_view = function(book_short_title, start_reference, end_reference) {
    // This first split is necessary, because there's a verse list id in the anchor that we do not
    // want to show
    start_reference = start_reference.split(" ")[1];
    end_reference = end_reference.split(" ")[1];
  
    var start_chapter = start_reference.split(reference_separator)[0];
    var start_verse = start_reference.split(reference_separator)[1];
    var end_chapter = end_reference.split(reference_separator)[0];
    var end_verse = end_reference.split(reference_separator)[1];
  
    var passage = start_chapter + reference_separator + start_verse;
  
    if (book_short_title != null &&
        start_verse == "1" &&
        end_verse == bible_chapter_verse_counts[book_short_title][end_chapter]) {
  
      /* Whole chapter sections */
      
      if (start_chapter == end_chapter) {
        passage = 'Chap. ' + start_chapter;
      } else {
        passage = 'Chaps. ' + start_chapter + ' - ' + end_chapter;
      }
  
    } else {
  
      /* Sections don't span whole chapters */
  
      if (start_chapter == end_chapter) {
        if (start_verse != end_verse) {
          passage += '-' + end_verse;
        }
      } else {
        passage += ' - ' + end_chapter + reference_separator + end_verse;
      }
    }
  
    return passage;
  };

  this.format_single_verse_block = function(list, start_index, end_index, turn_into_link) {
    if (start_index > (list.length - 1)) start_index = list.length - 1;
    if (end_index > (list.length - 1)) end_index = list.length - 1;

    var start_reference = list[start_index];
    var end_reference = list[end_index];

    var formatted_passage = "";

    if (start_reference != undefined && end_reference != undefined) {
      var currentBook = bible_browser_controller.tab_controller.getTab().getBook();
      formatted_passage = tags_controller.format_passage_reference_for_view(currentBook,
                                                                            start_reference,
                                                                            end_reference);

      if (turn_into_link) {
        formatted_passage = "<a href=\"javascript:bible_browser_controller.jump_to_reference('" + start_reference + "', true);\">" + formatted_passage + "</a>";
      }
    }

    return formatted_passage;
  };

  this.verse_reference_list_to_absolute_verse_nr_list = function(list) {
    var new_list = new Array;
    var short_book_title = bible_browser_controller.tab_controller.getTab().getBook();

    for (var i = 0; i < list.length; i++) {
      new_list.push(Number(tags_controller.reference_to_verse_nr(short_book_title, list[i])));
    }

    return new_list;
  };

  this.verse_list_has_gaps = function(list) {
    var has_gaps = false;

    for (var i = 1; i < list.length; i++) {
      if ((list[i] - list[i-1]) > 1) {
        has_gaps = true;
        break;
      }
    }

    return has_gaps;
  };

  this.handle_tag_accordion_change = function() {
    var new_reference_link = $('#tags-content').find('.ui-state-active').find('a');
    var tags_search_input = $('#tags-search-input');

    new_reference_link.append(tags_search_input);
  };

  this.init_ui = async function() {
    $('#tags-content').accordion({
      autoHeight: false,
      animated: false,
      change: tags_controller.handle_tag_accordion_change
    });

    var filter_button = $("<img id=\"filter-button\" src=\"images/filter.png\"/>");
    var filter_active_symbol = $("<span id=\"filter-button-active\">*</span>");
    var tags_search_input = $("<input type='text' id='tags-search-input'></input>");
    var reference_link = $($('#tags-content').find('a')[0]);
    var reference_link_text = reference_link.text();
    reference_link.empty();
    reference_link.append("<span style=\"float: left;\">" + reference_link_text + "</span>");
    reference_link.append(filter_button);
    reference_link.append(filter_active_symbol);
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
  };

  this.updateTagUiBasedOnTagAvailability = async function(tagCount=undefined) {
    var translationCount = bible_browser_controller.translation_controller.getTranslationCount();
    if (tagCount === undefined) {
      tagCount = await models.Tag.getTagCount();
    }

    var textType = bible_browser_controller.tab_controller.getTab().getTextType();

    if (tagCount == 0) {
      $('.tag-select-button').addClass('ui-state-disabled');
      $('#show-book-tag-statistics-button').addClass('ui-state-disabled');

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
        $('#show-book-tag-statistics-button').removeClass('ui-state-disabled');
      }
    }
  };

  this.init = function(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    if (currentVerseList.hasClass('ui-selectable')) {
      currentVerseList.selectable('destroy');
    }

    currentVerseList.selectable({
      filter: '.verse-text',
      cancel: '.verse-notes, #currently-edited-notes, .section-header-box, .verse-content-edited, .tag-box, .tag, .load-book-results',

      start: function(event, ui) {
        tags_controller.selected_verse_references = new Array;
        tags_controller.selected_verse_boxes = new Array;
        // Notes controller disabled
        //notes_controller.restore_currently_edited_notes();
      },

      stop: function(event, ui) {
        tags_controller.update_tags_view_after_verse_selection(false);
      },

      selected: function(event, ui) {
        var verse_box = $(ui.selected).closest('.verse-box');
        var verse_reference = verse_box.find('a:first').attr('name');
        var verse_reference_id = verse_box.find('.verse-reference-id').text();
        tags_controller.selected_verse_references.push(verse_reference);
        tags_controller.selected_verse_boxes.push(verse_box);
      }
    });
  };

  this.string_matches = function(search_string, search_value) {
    if (search_value == "") {
      return true;
    }

    var result = eval("search_string.search(/" + search_value + "/i)");
    return result != -1;
  };

  this.handle_filter_button_click = function(e) {
    var position = $(this).offset();
    var filter_dialog = $('#filter-dialog');

    if (filter_dialog.is(':visible')) {
      filter_dialog.css('display', 'none');
    } else {
      filter_dialog.css('top', position.top + 20);
      filter_dialog.css('left', position.left);
      filter_dialog.show();
    }
  };

  this.handle_tag_filter_type_click = function(e) {
    var selected_type = $(this)[0].value;
    var tags_content_global = $('#tags-content-global');
    tags_content_global.find('.checkbox-tag').show();
    $('#filter-button-active').hide();

    switch (selected_type) {
      case "assigned":
        tags_content_global.find('.checkbox-tag').filter(function(id) {
          return ($(this).find('.book-assignment-count').text() == '0');
        }).hide();
        $('#filter-button-active').show();
        break;

      case "unassigned":
        tags_content_global.find('.checkbox-tag').filter(function(id) {
          return ($(this).find('.book-assignment-count').text() != '0');
        }).hide();
        $('#filter-button-active').show();
        break;
      
      case "recently-used":
        tags_content_global.find('.checkbox-tag').filter(function(id) {
          var tag_timestamp = parseInt($(this).find('.last-used-timestamp').text());

          if (!Number.isNaN(tag_timestamp) &&
              !Number.isNaN(tags_controller.latest_timestamp) &&
              !Number.isNaN(tags_controller.oldest_recent_timestamp)) {
            
            var timestampInRange = (tag_timestamp >= tags_controller.oldest_recent_timestamp &&
                                    tag_timestamp <= tags_controller.latest_timestamp);

            return !timestampInRange;
          } else {
            return true;
          }
        }).hide();
        $('#filter-button-active').show();
        break;

      case "all":
      default:
        break;
    }
  };

  this.tag_title_matches_filter = function(tag_title, filter) {
      return tag_title.toLowerCase().indexOf(filter.toLowerCase()) != -1;
  };

  this.handle_tag_search_input = function(e) {
    clearTimeout(tags_controller.tag_search_timeout);
    var search_value = $(this).val();

    tags_controller.tag_search_timeout = setTimeout(function filter_tag_list() {
      //console.time('filter-tag-list');
      var tag_labels = $('#tags-content').find('.cb-label');
      $('#tags-content').find('.checkbox-tag').hide();

      for (var i = 0; i < tag_labels.length; i++) {
        var current_label = $(tag_labels[i]);

        if (tags_controller.tag_title_matches_filter(current_label.text(), search_value)) {
          current_tag_container = $(current_label.closest('.checkbox-tag')).show();
        }
      }
      //console.timeEnd('filter-tag-list');
    }, 200);
  };

  this.showTagListLoadingIndicator = function() {
    var loadingIndicator = $('#tags-loading-indicator');
    loadingIndicator.find('.loader').show();
    loadingIndicator.show();
  };

  this.hideTagListLoadingIndicator = function() {
    var loadingIndicator = $('#tags-loading-indicator');
    loadingIndicator.hide();
  };
}


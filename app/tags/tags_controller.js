/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@tklein.info>

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

  this.new_meta_tag_button = $('#new-meta-tag-button');
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
  this.rename_meta_tag_id = null;

  //this.xml_tag_statistics = null; // FIXME
  this.loading_indicator = "<img class=\"loading-indicator\" style=\"float: left; margin-left: 0.5em;\" " +
                           "width=\"16\" height=\"16\" src=\"images/loading_animation.gif\" />";

  this.meta_tag_opened = false;

  this.selected_verse_references = new Array;
  this.selected_verse_boxes = new Array;

  var new_meta_tag_dlg_options = {
    title: gettext_strings.new_meta_tag,
    width: 300,
    position: [60,180],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };

  new_meta_tag_dlg_options.buttons = {};
  new_meta_tag_dlg_options.buttons[gettext_strings.cancel] = function() {
    $(this).dialog("close");
  };
  new_meta_tag_dlg_options.buttons[gettext_strings.create_meta_tag] = function() {
    tags_controller.save_new_tag(this, "meta");
  };

  $('#new-meta-tag-dialog').dialog(new_meta_tag_dlg_options);

  var new_standard_tag_dlg_options = {
    title: gettext_strings.new_tag,
    width: 300,
    position: [60,180],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };

  new_standard_tag_dlg_options.buttons = {};
  new_standard_tag_dlg_options.buttons[gettext_strings.cancel] = function() {
    $(this).dialog("close");
  };
  new_standard_tag_dlg_options.buttons[gettext_strings.create_tag] = function() {
    tags_controller.save_new_tag(this, "standard");
  };

  $('#new-standard-tag-dialog').dialog(new_standard_tag_dlg_options);

  var new_book_tag_dlg_options = {
    title: gettext_strings.new_book_tag,
    width: 300,
    position: [60,180],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };

  new_book_tag_dlg_options.buttons = {};
  new_book_tag_dlg_options.buttons[gettext_strings.cancel] = function() {
    $(this).dialog("close");
  };
  new_book_tag_dlg_options.buttons[gettext_strings.create_book_tag] = function() {
    tags_controller.save_new_tag(this, "book");
  };

  $('#new-book-tag-dialog').dialog(new_book_tag_dlg_options);

  var delete_meta_tag_confirmation_dlg_options = {
    title: gettext_strings.delete_meta_tag,
    width: 300,
    position: [60,180],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };

  delete_meta_tag_confirmation_dlg_options.buttons = {};
  delete_meta_tag_confirmation_dlg_options.buttons[gettext_strings.cancel] = function() {
    $(this).dialog("close");
  };
  delete_meta_tag_confirmation_dlg_options.buttons[gettext_strings.delete_meta_tag] = function() {
    tags_controller.delete_meta_tag_after_confirmation();
  };

  $('#delete-meta-tag-confirmation-dialog').dialog(delete_meta_tag_confirmation_dlg_options);

  var delete_tag_confirmation_dlg_options = {
    title: gettext_strings.delete_tag,
    width: 300,
    position: [60,180],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };

  delete_tag_confirmation_dlg_options.buttons = {};
  delete_tag_confirmation_dlg_options.buttons[gettext_strings.cancel] = function() {
    $(this).dialog("close");
  };
  delete_tag_confirmation_dlg_options.buttons[gettext_strings.delete_tag] = function() {
    tags_controller.delete_tag_after_confirmation();
  };

  $('#delete-tag-confirmation-dialog').dialog(delete_tag_confirmation_dlg_options);

  var remove_tag_assignment_confirmation_dlg_options = {
    title: gettext_strings.remove_tag_assignment,
    width: 360,
    position: [40,250],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };

  remove_tag_assignment_confirmation_dlg_options.buttons = {};
  remove_tag_assignment_confirmation_dlg_options.buttons[gettext_strings.cancel] = function() {
    tags_controller.remove_tag_assignment_job.cb.attr('checked','checked');
    tags_controller.remove_tag_assignment_job = null;

    $(this).dialog("close");
  };
  remove_tag_assignment_confirmation_dlg_options.buttons[gettext_strings.remove_tag_assignment] = function() {
    tags_controller.remove_tag_assignment_after_confirmation();
  };

  $('#remove-tag-assignment-confirmation-dialog').dialog(remove_tag_assignment_confirmation_dlg_options);

  var rename_standard_tag_dlg_options = {
    title: gettext_strings.rename_tag,
    width: 300,
    position: [40,250],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };
  rename_standard_tag_dlg_options.buttons = {};
  rename_standard_tag_dlg_options.buttons[gettext_strings.cancel] = function() {
    $(this).dialog("close");
  };
  rename_standard_tag_dlg_options.buttons[gettext_strings.rename_tag] = function() {
    tags_controller.close_dialog_and_rename_standard_tag();
  };
  $('#rename-standard-tag-dialog').dialog(rename_standard_tag_dlg_options);

  var rename_meta_tag_dlg_options = {
    title: gettext_strings.rename_meta_tag,
    width: 300,
    position: [40,250],
    autoOpen: false,
    dialogClass: 'ezra-dialog'
  };
  rename_meta_tag_dlg_options.buttons = {};
  rename_meta_tag_dlg_options.buttons[gettext_strings.cancel] = function() {
    $(this).dialog("close");
  };
  rename_meta_tag_dlg_options.buttons[gettext_strings.rename_meta_tag] = function() {
    tags_controller.close_dialog_and_rename_meta_tag();
  };
  $('#rename-meta-tag-dialog').dialog(rename_meta_tag_dlg_options);

  this.new_meta_tag_button.bind('click', function() {
    tags_controller.handle_new_tag_button_click($(this), "meta");
  });

  this.new_standard_tag_button.bind('click', function() {
    tags_controller.handle_new_tag_button_click($(this), "standard");
  });

  this.new_book_tag_button.bind('click', function() {
    tags_controller.handle_new_tag_button_click($(this), "book");
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
    bible_browser_controller.communication_controller.request_tags_for_menu();
    bible_browser_controller.update_tag_title_in_selection(tags_controller.rename_standard_tag_title, new_title);
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

  this.close_dialog_and_rename_meta_tag = function() {
    $('#rename-meta-tag-dialog').dialog('close');
    var new_title = $('#rename-meta-tag-title-input').val();
    
    var checkbox_tag = $('#meta-tag-content').find('.checkbox-tag-id').filter(function(id) {
      return ($(this).text() == tags_controller.rename_meta_tag_id);
    }).closest('.checkbox-tag');

    tags_controller.communication_controller.update_meta_tag(tags_controller.rename_meta_tag_id, new_title);
  };

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

  this.handle_delete_tag_button_click = function() {
    var checkbox_tag = $(this).closest('.checkbox-tag');
    var tag_id = checkbox_tag.find('.checkbox-tag-id:first').html();
    var parent_id = checkbox_tag.parent().attr('id');

    if (parent_id == 'meta-tag-content') {
      var label = checkbox_tag.find('.meta-tag-title').html();

      tags_controller.tag_to_be_deleted_title = label;
      tags_controller.tag_to_be_deleted = tag_id;
      
      $('#delete-meta-tag-name').html(label);
      $('#delete-meta-tag-confirmation-dialog').dialog('open');

    } else {
      var label = checkbox_tag.find('.cb-label').html();

      tags_controller.tag_to_be_deleted_is_global = (parent_id == 'tags-content-global');

      tags_controller.tag_to_be_deleted_title = label;
      tags_controller.tag_to_be_deleted = tag_id;
      
      var number_of_tagged_verses = checkbox_tag.find('.global-assignment-count').text(); 

      $('#delete-tag-name').html(label);
      $('#delete-tag-number-of-verses').html(number_of_tagged_verses); // FIXME
      $('#delete-tag-confirmation-dialog').dialog('open');
    }
  };

  this.delete_meta_tag_after_confirmation = function() {
    tags_controller.communication_controller.destroy_meta_tag(tags_controller.tag_to_be_deleted);
    // FIXME
    /*tags_controller.remove_tag_by_id(tags_controller.tag_to_be_deleted,
                                     tags_controller.tag_to_be_deleted_is_global,
                                     tags_controller.tag_to_be_deleted_title);*/

    tags_controller.tag_to_be_deleted = null;
    $('#delete-meta-tag-confirmation-dialog').dialog('close');
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
                                               tag_is_global,
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

  this.handle_tag_label_click__by_highlighting_tagged_verses = function() {
    var checkbox_tag = $(this).closest('.checkbox-tag');
    var checkbox_tag_id = checkbox_tag.find('.checkbox-tag-id').html();
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
      jump_to_reference(current_verse_reference, false);
    }
  };

  this.handle_tag_cb_click = function() {
    if (tags_controller.is_blocked) {
      return;
    }

    tags_controller.is_blocked = true;
    setTimeout(function() {
      tags_controller.is_blocked = false;
    }, 300);

    var checkbox_tag = $(this).closest('.checkbox-tag');
    var id = checkbox_tag.find('.checkbox-tag-id:first').html();
    var cb = checkbox_tag.find('.tag-cb')[0];
    var cb_label = checkbox_tag.find('.cb-label').html();
    var checkbox_is_checked = $(cb).is(':checked');
    cb.blur();

    var current_verse_list = tags_controller.selected_verse_references;
    var current_verse_selection = tags_controller.current_verse_selection_as_xml(); 
    var current_verse_ids = tags_controller.current_verse_selection_as_verse_ids();

    checkbox_tag.find('.cb-label').removeClass('underline');
    checkbox_tag.find('.cb-label-postfix').html('');

    var is_global = false;
    if (checkbox_tag.find('.is-global').html() == 'true') {
    //if (checkbox_tag.parent().attr('id') == 'tags-content-global') {
      is_global = true;
    }

    if (current_verse_list.length > 0) {
      if (checkbox_is_checked) {
        //checkbox_tag.append(tags_controller.loading_indicator);

        $(cb).attr('title', gettext_strings.remove_tag_assignment);
        tags_controller.change_verse_list_tag_info(id,
                                                   is_global,
                                                   cb_label,
                                                   $.create_xml_doc(current_verse_selection),
                                                   "assign");

        tags_controller.communication_controller.assign_tag_to_verses(id, current_verse_ids);
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

    if (bible_browser_controller.current_book == null) {
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

    var new_label = "";
    if (bible_browser_controller.current_book == null) {
      new_label = "(" + new_global_count + ")";
    } else {
      new_label = "(" + new_book_count + " | " + new_global_count + ")";
    }

    tag_assignment_count_element.text(new_label);

    // Update tag count in tag selection menu as well
    bible_browser_controller.update_verse_count_in_tag_menu(tag_title, new_global_count);
  };

  this.remove_tag_assignment_after_confirmation = function() {
    var job = tags_controller.remove_tag_assignment_job;

    job.cb.attr('title', gettext_strings.assign_tag);
    job.checkbox_tag.append(tags_controller.loading_indicator);

    tags_controller.change_verse_list_tag_info(job.id,
                                               job.is_global,
                                               job.cb_label,
                                               job.xml_verse_selection,
                                               "remove");

    tags_controller.communication_controller.remove_tag_from_verses(job.id, job.verse_ids);

    tags_controller.remove_tag_assignment_job = null;
    $('#remove-tag-assignment-confirmation-dialog').dialog('close');
  };

  this.change_verse_list_tag_info = function(tag_id,
                                             tag_is_global,
                                             tag_title,
                                             verse_selection,
                                             action) {

    verse_selection = $(verse_selection);

    var tag_class = "tag-global";
    if (!tag_is_global) {
      tag_class = "tag-book";
    }

    var selected_verses = verse_selection.find('verse');

    for (var i = 0; i < selected_verses.length; i++) {
      var current_verse_id = $(selected_verses[i]).find('verse-id').text();
      var current_verse_part = $(selected_verses[i]).find('verse-part').text();

      var current_verse_box = $('.verse-id-' + current_verse_id);
      if (current_verse_box.length > 1) {
        switch(current_verse_part) {
          case "FIRST_PART":
            current_verse_box = $(current_verse_box[0]);
            break;

          case "SECOND_PART":
            current_verse_box = $(current_verse_box[1]);
            break;

          default:
            break;
        }
      }

      var current_tag_data_container = current_verse_box.find('.tag-data');
      var current_tag_info = current_verse_box.find('.tag-info');
      var current_tag_info_title = current_tag_info.attr('title');
      var current_tag_info_text = tag_title;
      if (!tag_is_global) current_tag_info_text += '*';
      var already_there = false;

      var current_tag_info_title_array = new Array;
      if (current_tag_info_title != "" && current_tag_info_title != undefined) {
        current_tag_info_title_array = current_tag_info_title.split(', ');
      }

      switch (action) {
        case "assign":
          for (var j = 0; j < current_tag_info_title_array.length; j++) {
            if (current_tag_info_title_array[j] == current_tag_info_text) {
              already_there = true;
              break;
            }
          }

          if (!already_there) {
            current_tag_info_title_array.push(current_tag_info_text);
            current_tag_info_title_array.sort();
          }
          break;

        case "remove":
          for (var j = 0; j < current_tag_info_title_array.length; j++) {
            if (current_tag_info_title_array[j] == current_tag_info_text) {
              current_tag_info_title_array.splice(j, 1);
              break;
            }
          }
          
          break;
      }

      if (current_tag_info_title_array.length > 1) {
        current_tag_info_title = current_tag_info_title_array.join(', ');
      } else {
        if (current_tag_info_title_array.length == 1) {
          current_tag_info_title = current_tag_info_title_array[0];
        } else {
          current_tag_info_title = "";
        }
      }

      if (already_there) {
        continue;
      }

      current_tag_info.attr('title', current_tag_info_title);
      if (current_tag_info_title != "") {
        current_tag_info.addClass('visible');
      } else {
        current_tag_info.removeClass('visible');
      }

      switch (action) {
        case "assign":
          var new_tag_data_div = tags_controller.new_tag_data_html(tag_class, tag_title, tag_id);
          current_tag_data_container.append(new_tag_data_div);
          break;

        case "remove":
          var existing_tag_data_div = current_tag_data_container.find('.tag-id').filter(function(index){
            return ($(this).html() == tag_id);
          }).parent();
          
          existing_tag_data_div.detach();
          break;
      }

      tags_controller.update_visible_tags_of_verse_box(current_verse_box, current_tag_info_title_array);
    }
  };

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
    return "<div class=\"tag\" title=\"" + gettext_strings.bible_browser_tag_hint + "\">" + 
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

  this.render_tags = async function(tag_list) {
    var book_content_header = $($('#tags-content').find('.ui-accordion-header')[1]);
    var global_tags_box = $('#tags-content-global');
    var book_tags_box = $('#tags-content-book');

    var update = false;
    var old_tags_search_input_value = $('#tags-search-input')[0].value;

    var global_tags_box_el = document.getElementById('tags-content-global');
    var book_tags_box_el = document.getElementById('tags-content-book');

    while (global_tags_box_el.firstChild) {
      global_tags_box_el.removeChild(global_tags_box_el.firstChild);
    }
    /* Book tags disabled for now */
    /*
    while(book_tags_box_el.firstChild) {
      book_tags_box_el.removeChild(book_tags_box_el.firstChild);
    }
    */

    var book_tags_existing = false;
    var current_filter = $('#tags-search-input').val();
    var book_tag_statistics = new Array();

    for (var i = 0; i < tag_list.length; i++) {
      var current_tag = tag_list[i];
      var current_tag_title = current_tag.title;
      var current_tag_id = current_tag.id;
      var current_tag_book_id = current_tag.bibleBookId;
      var current_tag_book_id_is_null = (current_tag_book_id == "NULL" || current_tag_book_id == null);

      var current_meta_tag_ids = Array();
      // PORTING DISABLED
      /*var current_meta_tags = current_tag.find('meta-tag');
      for (var j = 0; j < current_meta_tags.length; j++) {
        var current_meta_tag_id = $(current_meta_tags[j]).find('id').text();
        current_meta_tag_ids.push(current_meta_tag_id);
      }*/

      var current_book_tag_assignment_count = current_tag.bookAssignmentCount;
      var current_global_tag_assignment_count = current_tag.globalAssignmentCount;

      var is_used_in_current_book = (current_book_tag_assignment_count > 0) ? true : false;
      var is_meta_tag_assigned_tag = false;
      // PORTING DISABLED
      //var is_meta_tag_assigned_tag = (tags_controller.meta_tag_opened && $.inArray(tags_controller.current_meta_tag_id, current_meta_tag_ids)) ? true : false;
      var visible = tags_controller.tag_title_matches_filter(current_tag_title, current_filter);

      if (is_used_in_current_book) {
        book_tag_statistics[current_tag_title] = parseInt(current_book_tag_assignment_count);
      }

      var current_tag_html_code = 
        tags_controller.html_code_for_tag(current_tag_title,
                                          current_tag_id,
                                          current_tag_book_id_is_null,
                                          is_used_in_current_book,
                                          is_meta_tag_assigned_tag,
                                          current_meta_tag_ids,
                                          current_book_tag_assignment_count,
                                          current_global_tag_assignment_count,
                                          visible);

      if (!current_tag_book_id_is_null)  {
        book_tags_existing = true;
      }

      var current_box = current_tag_book_id_is_null ? global_tags_box : book_tags_box;
      current_box.append(current_tag_html_code);
    }

    if (book_tags_existing) {
      book_content_header.removeClass('ui-state-disabled');
    } else {
      book_content_header.addClass('ui-state-disabled');
    }

    $('#tags-content').find('.rename-tag-label').bind('click', tags_controller.handle_rename_tag_click__by_opening_rename_dialog);

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

    tags_controller.bind_tag_events();
    configure_button_styles('#tags-content');

    //tags_controller.update_tag_count_after_rendering(); // FIXME: to be integrated!
    tags_controller.update_tags_view_after_verse_selection(true);
    tags_controller.show_meta_tag_assigned_tags(tags_controller.current_meta_tag_id);

    await tags_controller.updateTagUiBasedOnTagAvailability();

    if (bible_browser_controller.current_book != null) {
      tags_controller.update_book_tag_statistics_box(book_tag_statistics);
    }
  };

  this.update_book_tag_statistics_box = function(book_tag_statistics) {
    var tags_by_verse_count = Object.keys(book_tag_statistics).sort(
      function(a,b) {
        return book_tag_statistics[b] - book_tag_statistics[a];
      }
    );

    var chapter_verse_counts = bible_chapter_verse_counts[bible_browser_controller.current_book];

    if (chapter_verse_counts != null) {
      var overall_verse_count = 0;
      for (var chapter of chapter_verse_counts) {
        if (chapter != 'nil') {
          overall_verse_count += chapter;
        }
      }

      var tag_statistics_html = "<table class='tag-statistics'>";
      tag_statistics_html += "<tr><th style='text-align: left;'>Tag</th>"
                          +  "<th style='text-align: left; width: 2em;'>#</th>"
                          +  "<th style='text-align: left; width: 2em;'>%</th></tr>";

      for (var i = 0; i < tags_by_verse_count.length; i++) {
        var tag_title = tags_by_verse_count[i];
        var tagged_verse_count = book_tag_statistics[tag_title];
        var tagged_verse_percent = Math.round((tagged_verse_count / overall_verse_count) * 100);

        var current_row_html = "<tr><td style='width: 20em;'>" + tag_title
                                          + "</td><td>" 
                                          + tagged_verse_count
                                          + "</td><td>"
                                          + tagged_verse_percent
                                          + "</td></tr>";
        tag_statistics_html += current_row_html;
      }
      tag_statistics_html += "</table>";

      $('#book-tag-statistics-box-content').empty();
      $('#book-tag-statistics-box-content').html(tag_statistics_html);
    }
  };

  this.handle_rename_tag_click__by_opening_rename_dialog = function() {
    var checkbox_tag = $(this).closest('.checkbox-tag');
    var cb_label = checkbox_tag.find('.cb-label').text();

    $('#rename-standard-tag-title-input').val(cb_label);
    $('#rename-standard-tag-dialog').dialog('open');
    $('#rename-standard-tag-title-input').focus();

    tags_controller.rename_standard_tag_id =  checkbox_tag.find('.checkbox-tag-id').text();
    tags_controller.rename_standard_tag_title = cb_label;
  };

  this.handle_rename_meta_tag_click__by_opening_rename_dialog = function() {
    var checkbox_tag = $(this).closest('.checkbox-tag');
    var cb_label = checkbox_tag.find('.meta-tag-title').text();

    $('#rename-meta-tag-title-input').val(cb_label);
    $('#rename-meta-tag-dialog').dialog('open');
    $('#rename-meta-tag-title-input').focus();

    tags_controller.rename_meta_tag_id = checkbox_tag.find('.checkbox-tag-id').text();
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

  this.bind_tag_events = function() {
    var app_container = $('#app-container');

    app_container.find('.tag-delete-button').bind('click', tags_controller.handle_delete_tag_button_click);
    app_container.find('.meta-tag-assignment-button').bind('click', tags_controller.handle_meta_tag_assignment_button_click);
    app_container.find('.tag-cb').bind('click', tags_controller.handle_tag_cb_click);
    app_container.find('.cb-label').bind('click', tags_controller.handle_tag_label_click__by_highlighting_tagged_verses);

    app_container.find('.checkbox-tag').bind('mouseover', tags_controller.handle_tag_mouseover);
    app_container.find('.checkbox-tag').bind('mouseout', tags_controller.handle_tag_mouseout);

    tags_controller.init_verse_expand_box();
  };

  this.init_verse_expand_box = function() {
    $('.verse-reference-content').filter(":not('.tag-events-configured')").bind('mouseover', tags_controller.mouse_over_verse_reference_content);

    $('.expand-button').filter(":not('.tag-events-configured')").bind('mouseover', function() {
      $(this).addClass('state-highlighted');
    });

    $('.expand-button').filter(":not('.tag-events-configured')").bind('mouseout', function() {
      $(this).removeClass('state-highlighted');
    });

    $('.expand-button').filter(":not('.tag-events-configured')").bind('click', function() {
      var current_reference = $(tags_controller.current_mouseover_verse_reference);
      var start_verse_box = current_reference.closest('.verse-box');
      var current_book_title = start_verse_box.find('.verse-bible-book-short').html();
      var start_verse_nr = reference_to_verse_nr(current_book_title, start_verse_box.find('.verse-reference-content').html(), false);
      start_verse_nr -= 3;
      if (start_verse_nr < 1) {
        start_verse_nr = 1;
      }

      var number_of_verses = 5;

      tags_controller.context_verse = start_verse_box;

      bible_browser_controller.communication_controller.request_book_text(
        current_book_title,
        tags_controller.load_verse_context,
        start_verse_nr,
        number_of_verses
      );

      /*tags_controller.communication_controller.request_verse_context(
        current_book_title,
        start_verse_nr,
        number_of_verses
      );*/

      $('#verse-expand-box').hide();
    }).addClass('tag-events-configured');

    $('.verse-content').bind('mouseover', function() {
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

      if (bible_browser_controller.current_tag_id_list != "") {
        $('#verse-expand-box').show();
      }
    }
  }

  this.handle_meta_tag_assignment_button_click = function() {
    if ($(this).hasClass('ui-state-disabled')) {
      return;
    }

    var checkbox_tag = $(this).closest('.checkbox-tag');
    var tag_id = checkbox_tag.find('.checkbox-tag-id').html();
    var parent_id = checkbox_tag.parent().attr('id');
    var add_assignment = false;

    if (parent_id == 'meta-tag-assigned-tags') { // remove meta tag assignment
      var data_list_checkbox_tag = $('#tags-content').find('.checkbox-tag').filter(function(id) {
        return ($(this).find('.checkbox-tag-id').html() == tag_id);
      });

      var meta_tag_assignment = data_list_checkbox_tag.find('.meta-tag-id').filter(function(id) {
        return ($(this).html() == tags_controller.current_meta_tag_id);
      });

      meta_tag_assignment.detach();

      tags_controller.communication_controller.remove_meta_tag_assignment(tags_controller.current_meta_tag_id,
                                                                          tag_id);

    } else { // add meta tag assignment
      $(this).addClass('ui-state-disabled');

      add_assignment = true;
      var meta_tag_list = checkbox_tag.find('.meta-tag-list');
      var new_meta_tag_id = "<div class='meta-tag-id'>" + tags_controller.current_meta_tag_id + "</div>";

      meta_tag_list.append(new_meta_tag_id);

      tags_controller.communication_controller.assign_meta_tag(tags_controller.current_meta_tag_id,
                                                               tag_id);
    }
    
    tags_controller.update_meta_tag_assigned_tag_number(tags_controller.current_meta_tag_id, add_assignment);
    tags_controller.show_meta_tag_assigned_tags(tags_controller.current_meta_tag_id);
    configure_button_styles();
  };

  this.update_meta_tag_assigned_tag_number = function(meta_tag_id, increase) {
    var meta_tag = $('#meta-tag-content').find('.checkbox-tag').filter(function(id) {
      return ($(this).find('.checkbox-tag-id').html() == meta_tag_id);
    });

    var number_of_tags_element = meta_tag.find('.meta-tag-number-of-tags');
    var number_of_tags_container = number_of_tags_element.parent();

    var current_number_of_tags = 0;
    if (number_of_tags_element.html() != "") {
      current_number_of_tags = Number(number_of_tags_element.html());
    }
    var new_number_of_tags = (increase ? (current_number_of_tags + 1) : (current_number_of_tags - 1));

    if (new_number_of_tags != 0) {
      number_of_tags_container.css('visibility', 'visible');
    } else {
      number_of_tags_container.css('visibility', 'hidden');
    }
    number_of_tags_element.html(new_number_of_tags);
  };

  this.handle_tag_mouseover = function() {
    $(this).find('.rename-tag-label, .rename-meta-tag-label').show();
  };

  this.handle_tag_mouseout = function() {
    $(this).find('.rename-tag-label, .rename-meta-tag-label').hide();
  };

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

  this.find_tags_with_meta_tag_id = function(meta_tag_id) {
    var tags = $('.meta-tag-id').filter(function(id) {
      return ($(this).html() == meta_tag_id);
    }).closest('.checkbox-tag');

    var tag_array = Array();
    for (var i = 0; i < tags.length; i++) {
      var is_global = ($(tags[i]).parent().attr('id') == 'tags-content-global');
      var is_used_in_current_book = $(tags[i]).find('.cb-label').hasClass('cb-label-assigned');

      var current_book_tag_assignment_count = $(tags[i]).find('.book-assignment-count').text();
      var current_global_tag_assignment_count = $(tags[i]).find('.global-assignment-count').text();

      var current_tag = {
        'id': $(tags[i]).find('.checkbox-tag-id').html(),
        'title': $(tags[i]).find('.cb-label').html(),
        'is_global': is_global,
        'is_used_in_current_book': is_used_in_current_book,
        'book_assignment_count': current_book_tag_assignment_count,
        'global_assignment_count': current_global_tag_assignment_count
      };

      tag_array.push(current_tag);
    }

    return tag_array;
  };

  this.html_code_for_meta_tag_child_tag = function(title,
                                                   id,
                                                   is_used_in_current_book,
                                                   book_assignment_count,
                                                   global_assignment_count) {

    var meta_tag_assignment_title = gettext_strings.remove_tag_from_meta_tag;
    var used_in_book_class = (is_used_in_current_book ? "cb-label-assigned" : "");

    var tag_counts = "";
    if (bible_browser_controller.current_book == null) {
      tag_counts = global_assignment_count;
    } else {
      tag_counts = book_assignment_count + " | " + global_assignment_count
    }

    return "<div class=\"checkbox-tag\">" + 
           "<div class=\"checkbox-tag-id\">" + id + "</div>" +
           "<div class=\"is-global\">true</div>" +

           "<div title=\"" + meta_tag_assignment_title + "\" " +
           "class=\"meta-tag-assignment-button fg-button fg-button-icon-left ui-state-default ui-corner-all\">" +
           "<span class=\"ui-icon ui-icon-closethick\"></span></div>" +
           "<span class=\"cb-label " + used_in_book_class + "\">" + title + "</span>" + 
           "<span class=\"cb-label-tag-assignment-count\">(" + tag_counts + ")</span>" +

           "</div>";
  };

  this.html_code_for_tag = function(title,
                                    id,
                                    is_global,
                                    is_used_in_current_book,
                                    is_meta_tag_assigned_tag,
                                    meta_tag_ids,
                                    book_assignment_count,
                                    global_assignment_count,
                                    visible) {
    var meta_tag_html = "";

    if (meta_tag_ids != null) {
      meta_tag_html = "<div class='meta-tag-list'>"

      for (var i = 0; i < meta_tag_ids.length; i++) {
        if (meta_tag_ids[i] != "") {
          meta_tag_html += "<div class='meta-tag-id'>" + meta_tag_ids[i] + "</div>";
        }
      }

      meta_tag_html += "</div>";
    }

    var meta_tag_assignment_icon = "ui-icon-circle-arrow-n";
    var meta_tag_assignment_title = gettext_strings.add_tag_to_meta_tag;

    var used_in_book_class = (is_used_in_current_book ? "cb-label-assigned" : "");
    var meta_tag_assignment_state = (is_meta_tag_assigned_tag ? "" : "ui-state-disabled");

    var style = "";
    if (!visible) {
      style = " style=\"display: none;\"";
    }

    var complete_tag_html =
           "<div class=\"checkbox-tag\"" + style + ">" + 
           "<div class=\"checkbox-tag-id\">" + id + "</div>" +
           "<div class=\"is-global\">" + is_global + "</div>" +
           "<div class=\"book-assignment-count\">" + book_assignment_count + "</div>" +
           "<div class=\"global-assignment-count\">" + global_assignment_count + "</div>" +

           meta_tag_html +

           "<div title=\"" + gettext_strings.delete_tag_permanently + "\" " +
           "class=\"tag-delete-button fg-button fg-button-icon-left ui-state-default ui-corner-all\">" +
           "<span class=\"ui-icon ui-icon-closethick\"></span></div>";

    /* Disabled for now (Meta tags not functional)
    if (is_global) {
      complete_tag_html +=
           "<div title=\"" + meta_tag_assignment_title + "\" " +
           "class=\"meta-tag-assignment-button fg-button fg-button-icon-left ui-state-default ui-corner-all " + meta_tag_assignment_state + "\">" +
           "<span class=\"ui-icon " + meta_tag_assignment_icon + "\"></span></div>";
    }
    */

    var tag_counts = "";
    if (bible_browser_controller.current_book == null) {
      tag_counts = global_assignment_count;
    } else {
      tag_counts = book_assignment_count + " | " + global_assignment_count
    }

    complete_tag_html +=
           "<input class=\"tag-cb\" type=\"checkbox\" />" +
           "<span class=\"cb-label " + used_in_book_class + "\">" + title + "</span>" + 
           "<span class=\"cb-label-tag-assignment-count\">(" + tag_counts + ")</span>" +
           "<span class=\"cb-label-postfix\"></span>" +
           "<span class=\"rename-tag-label\">[" + gettext_strings.rename + "]</span>" +
           
           "</div>";

    return complete_tag_html;
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

  this.update_tags_view_after_verse_selection = function(force) {
    //console.time('update_tags_view_after_verse_selection');
    if (tags_controller.verse_selection_blocked && force !== true) {
      return;
    }

    tags_controller.verse_selection_blocked = true;

    setTimeout(function() {
      tags_controller.verse_selection_blocked = false;
    }, 300);

    var selected_verse_tags = tags_controller.current_verse_selection_tags();

    var selected_verses_content = gettext_strings.none;

    $('#app-container').find('.tag-cb').removeAttr('checked');
    $('#app-container').find('.tag-cb').attr('title', gettext_strings.assign_tag);
    $('#app-container').find('.cb-label').removeClass('underline');
    $('#app-container').find('.cb-label-postfix').html('');

    if (tags_controller.selected_verse_boxes.length > 0) {
      $('#app-container').find('.tag-cb').removeAttr('disabled');
      $('#app-container').find('.tag-cb').css('opacity', '1.0');
      
      var checkbox_tags = $('#app-container').find('.checkbox-tag');

      for (var i = 0; i < checkbox_tags.length; i++) {
        var current_tag_element = $(checkbox_tags[i]);
        var current_parent = current_tag_element.parent();
        var current_tag_is_global = (current_tag_element.find('.is-global').html() == 'true');//(current_parent.attr('id') == 'tags-content-global');
        var current_checkbox = current_tag_element.find('.tag-cb');
        var current_title_element = current_tag_element.find('.cb-label');
        var current_title = current_title_element.html();
        var current_title_element_postfix = current_tag_element.find('.cb-label-postfix');
        
        for (var j = 0; j < selected_verse_tags.length; j++) {
          var current_tag_obj = selected_verse_tags[j];
          var current_tag_obj_is_global = (current_tag_obj.category == 'tag-global');

          if (current_tag_obj.title == current_title &&
              current_tag_obj_is_global == current_tag_is_global ) {
            if (current_tag_obj.complete) {
              current_checkbox.attr('checked', 'checked');
              current_checkbox.attr('title', 'Remove tag assignment');
            } else {
              current_title_element_postfix.html('&nbsp;*');
              current_title_element.addClass('underline');
            }
          }
        }
      }
    } else {
      $('.tag-cb').attr('disabled', 'disabled');
      $('.tag-cb').attr('title', '');
      $('.tag-cb').css('opacity', '0.3');
    }

    $('#tags-header').find('#selected-verses').html("");
    //$('#clippy-box').empty();

    if (bible_browser_controller.current_book_name != null && tags_controller.selected_verse_references.length > 0) {
      var formatted_verse_list = tags_controller.format_verse_list_for_view(tags_controller.selected_verse_references, true);
      selected_verses_content = bible_browser_controller.current_book_name + ' ' + formatted_verse_list;

      $('#tags-header').find('#selected-verses').html(selected_verses_content);

      // PORTING disabled
      /*if (tags_controller.selected_verse_references.length > 0) {
        var verse_text = tags_controller.get_selected_verse_text() + $('#tags-header').find('#selected-verses').text();
        tags_controller.update_text_for_clipboard(escape(verse_text));
      }*/
    }
    //console.timeEnd('update_tags_view_after_verse_selection');
  };

  this.update_text_for_clipboard = function(text) {

    var clippy = $('<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"'+
        'width="110"'+
        'height="14"'+
        'id="clippy" >'+
        '<param name="movie" value="/javascripts/lib/clippy.swf"/>'+
        '<param name="allowScriptAccess" value="always" />'+
        '<param name="quality" value="high" />'+
        '<param name="scale" value="noscale" />'+
        '<param NAME="FlashVars" value="text='+text+'">'+
        '<param name="bgcolor" value="#fff">'+
        '<embed src="lib/clippy.swf"'+
        'width="110"'+
        'height="14"'+
        'name="clippy"'+
        'quality="high"'+
        'allowScriptAccess="always"'+
        'type="application/x-shockwave-flash"'+
        'pluginspage="http://www.macromedia.com/go/getswf/clippy/buildplayer"'+
        'FlashVars="text='+text+'"'+
        'bgcolor="#f3f3f3"'+
        '/>'+
        '</object>');
    
    $('#clippy-box').append(clippy);
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

  this.format_single_verse_block = function(list, start_index, end_index, turn_into_link) {
    if (start_index > (list.length - 1)) start_index = list.length - 1;
    if (end_index > (list.length - 1)) end_index = list.length - 1;

    var start_reference = list[start_index];
    var end_reference = list[end_index];

    var formatted_passage = "";

    if (start_reference != undefined && end_reference != undefined) {
      formatted_passage = format_passage_reference_for_view(bible_browser_controller.current_book,
                                                            start_reference,
                                                            end_reference);

      if (turn_into_link) {
        formatted_passage = "<a href=\"javascript:jump_to_reference('" + start_reference + "', true);\">" + formatted_passage + "</a>";
      }
    }

    return formatted_passage;
  };

  this.verse_reference_list_to_absolute_verse_nr_list = function(list) {
    var new_list = new Array;
    var short_book_title = bible_browser_controller.current_book;

    for (var i = 0; i < list.length; i++) {
      new_list.push(Number(reference_to_verse_nr(short_book_title, list[i])));
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

    /*$('#new-tag-title-input').clickOnEnter();
    $('#new-tag-title-input').listenForEnter().bind('pressedEnter', function() {
      tags_controller.save_new_tag($('#new-tag-dialog'));
    });*/

    $('#tags-search-input').bind('keyup', tags_controller.handle_tag_search_input);
    $('#tags-search-input').bind('keydown', function(e) {
      e.stopPropagation(); 
    });

    await tags_controller.updateTagUiBasedOnTagAvailability();
  };

  this.updateTagUiBasedOnTagAvailability = async function() {
    var translations = await models.BibleTranslation.getTranslations();
    var translationCount = translations.length;
    var tagsCount = await models.Tag.getTagCount();

    if (tagsCount == 0) {
      $('.tag-select-button').addClass('ui-state-disabled');
      $('#show-book-tag-statistics-button').addClass('ui-state-disabled');

      if (translationCount > 0) {
        $('#new-standard-tag-button').removeClass('ui-state-disabled');
        $('#tags-content-global').html(gettext_strings.help_text_no_tags_book_opened);
      } else {
        $('#new-standard-tag-button').addClass('ui-state-disabled');
        $('#tags-content-global').html(gettext_strings.help_text_no_tags);
      }
    } else {
      $('.tag-select-button').removeClass('ui-state-disabled');
      $('#new-standard-tag-button').removeClass('ui-state-disabled');
      $('#show-book-tag-statistics-button').removeClass('ui-state-disabled');
    }
  };

  this.init = function() {
    if ($('#verse-list').hasClass('ui-selectable')) {
      $('#verse-list').selectable('destroy');
    }

    $('#verse-list').selectable({
      filter: '.verse-text',
      cancel: '.verse-notes, #currently-edited-notes, .section-header-box, .verse-content-edited, .tag-box, .tag',

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
      filter_dialog.slideDown();
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
    }, 300);
  };

  this.show_meta_tag_assigned_tags = function(meta_tag_id) {
    if (meta_tag_id == null) {
      return;
    }

    var meta_tag_title = $('#meta-tag-content').find('.checkbox-tag-id').filter(function(id) {
      return ($(this).html() == meta_tag_id);
    }).closest('.checkbox-tag').find('.meta-tag-title').html();

    var assigned_tags = tags_controller.find_tags_with_meta_tag_id(meta_tag_id);

    $('#meta-tag-assigned-tags').empty();

    for (var i = 0; i < assigned_tags.length; i++) {
      var tag = assigned_tags[i];

      var assigned_tag_html = tags_controller.html_code_for_meta_tag_child_tag(
        tag.title,
        tag.id,
        tag.is_used_in_current_book,
        tag.book_assignment_count,
        tag.global_assignment_count
      );

      $('#meta-tag-assigned-tags').append(assigned_tag_html);
    }

    $('#opened-meta-tag-title').html(meta_tag_title);

    $('#meta-tag-content').hide();
    $('#meta-tag-assigned-tags').show();

    tags_controller.current_meta_tag_id = meta_tag_id;
    tags_controller.meta_tag_opened = true;

    tags_controller.bind_tag_events();
    tags_controller.update_tags_view_after_verse_selection(false);
    tags_controller.disable_meta_tag_assignment_buttons_for_current_meta_tag();
    configure_button_styles();
  };

  this.disable_meta_tag_assignment_buttons_for_current_meta_tag = function() {
    var all_buttons = $('#tags-content').find('.meta-tag-assignment-button');

    var disabled_buttons = $('#tags-content').find('.meta-tag-id').filter(function(id) {
      return ($(this).html() == tags_controller.current_meta_tag_id);
    }).closest('.checkbox-tag').find('.meta-tag-assignment-button');

    all_buttons.removeClass('ui-state-disabled');
    disabled_buttons.addClass('ui-state-disabled');

    configure_button_styles();
  };

  this.show_meta_tag_list = function() {
    $('#app-container').find('.meta-tag-assignment-button').addClass('ui-state-disabled');

    $('#opened-meta-tag-title').html("&nbsp;&nbsp;[" + gettext_strings.click_meta_tag_action_hint + "]");

    $('#meta-tag-assigned-tags').hide();
    $('#meta-tag-content').show();

    tags_controller.current_meta_tag_id = null;
    tags_controller.meta_tag_opened = false;
  };

  this.html_code_for_meta_tag = function(title, id, tag_count) {
    var meta_tag_number_of_tags =
          "<div class='meta-tag-number-of-tags-container'>(" +
          "<span class='meta-tag-number-of-tags'>" + tag_count + "</span>" +
          ")</div>";

    return "<div class=\"checkbox-tag\">" +
           "<div class=\"checkbox-tag-id\">" + id + "</div>" +

           "<div title=\"" + gettext_strings.delete_meta_tag_permanently + "\" "+
           "class=\"tag-delete-button fg-button fg-button-icon-left ui-state-default ui-corner-all\">" +
           "<span class=\"ui-icon ui-icon-closethick\"></span></div>" +

           "<a href=\"javascript:tags_controller.show_meta_tag_assigned_tags(" + id + ");\">" + 
           "<div class=\"meta-tag-title\">" + title + "</div> " +
           meta_tag_number_of_tags + 
           "</a>" +
           "<div class=\"rename-meta-tag-label\">[" + gettext_strings.rename + "]</div>" +
           "</div>";
  };

  this.render_meta_tags = function(xml_tag_list) {
    var meta_tag_list = $(xml_tag_list).find('meta-tags').children();
    var meta_tag_content = $('#meta-tag-content');

    meta_tag_content.empty();

    for (var i = 0; i < meta_tag_list.length; i++) {
      var current_meta_tag = $(meta_tag_list[i]);
      var current_meta_tag_title = current_meta_tag.find('title').text();
      var current_meta_tag_id = current_meta_tag.find('id').text();
      var current_meta_tag_number_of_tags = current_meta_tag.find('tag-count').text();

      var current_meta_tag_html_code = 
        tags_controller.html_code_for_meta_tag(current_meta_tag_title,
                                               current_meta_tag_id,
                                               current_meta_tag_number_of_tags);

      meta_tag_content.append(current_meta_tag_html_code);
    }

    tags_controller.bind_tag_events();
    $('#app-container').find('.rename-meta-tag-label').bind('click', tags_controller.handle_rename_meta_tag_click__by_opening_rename_dialog);
    configure_button_styles('#meta-tag-content');
    configure_button_styles('#meta-tag-assigned-tags');
  };
}


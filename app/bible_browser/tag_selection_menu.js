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


class TagSelectionMenu {
  constructor() {
    this.tag_menu_is_opened = false;
    this.tag_menu_populated = false;
  }

  init_tag_selection_menu(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.tag-select-button').bind('click', (event) => { this.handle_tag_menu_click(event); });
    $('#tag-selection-filter-input').bind('keyup', this.handle_tag_search_input);
  }

  hide_tag_menu() {
    if (this.tag_menu_is_opened) {
      $('#app-container').find('#tag-selection-menu').hide();
      this.tag_menu_is_opened = false;

      var tag_button = $('#app-container').find('.tag-select-button');
      tag_button.removeClass('ui-state-active');
    }
  }

  handle_tag_menu_click(event) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var tagSelectButton = currentVerseListMenu.find('.tag-select-button');

    if (tagSelectButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.tag_menu_is_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.hide_book_menu();
      bible_browser_controller.module_search_menu.hide_search_menu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();
      tagSelectButton.addClass('ui-state-active');

      var tag_select_button_offset = tagSelectButton.offset();
      var menu = $('#app-container').find('#tag-selection-menu');
      var top_offset = tag_select_button_offset.top + tagSelectButton.height() + 12;
      var left_offset = tag_select_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      if (!this.tag_menu_populated) {
        this.request_tags_for_menu();
        this.tag_menu_populated = true;
      }

      $('#app-container').find('#tag-selection-menu').slideDown();
      this.tag_menu_is_opened = true;
      event.stopPropagation();
    }
  }

  request_tags_for_menu() {
    models.Tag.getGlobalAndBookTags().then(tags => {
      this.render_tags_in_menu(tags);
    });
  }

  render_tags_in_menu(tags) {
    this.reset_tags_in_menu();
    var taglist_container = $('#tag-selection-taglist-global');
    this.render_tag_list(tags, taglist_container, false);
    bind_click_to_checkbox_labels();
  }

  render_tag_list(tag_list, target_container, only_local) {
    while (target_container.firstChild) {
      target_container.removeChild(targetContainer.firstChild);
    }

    for (var i = 0; i < tag_list.length; i++) {
      var current_tag = tag_list[i];
      var current_tag_title = current_tag.title;
      var current_tag_id = current_tag.id;
      var current_book_id = current_tag.bibleBookId;
      var current_assignment_count = current_tag.globalAssignmentCount;

      if (only_local && (current_book_id == null)) {
        continue;
      }

      var current_tag_html = this.get_html_for_tag(current_tag_id,
                                                   current_tag_title,
                                                   current_assignment_count);
      target_container.append(current_tag_html);
    }

    this.bind_tag_cb_events();

    // Check all the previously selected tags in the list
    var all_tags = target_container.find('.tag-browser-tag-title-content');
    
    for (var i = 0; i < all_tags.length; i++) {
      var current_tag = $(all_tags[i]);
      var current_tag_is_checked = this.is_tag_selected(current_tag.text());

      if (current_tag_is_checked) {
        var tag_browser_tag = current_tag.closest('.tag-browser-tag');
        var tag_cb = tag_browser_tag.find('.tag-browser-tag-cb'); 
        tag_cb.attr('checked','checked');
      }
    }
  }

  get_html_for_tag(tag_id, tag_title, tag_assignment_count) {
    return "<div id='tag-browser-tag-" + tag_id + 
           "' class='tag-browser-tag'>" + 
           "<div class='tag-browser-tag-id'>" + tag_id + "</div>" +
           "<input class='tag-browser-tag-cb' type='checkbox'></input>" +
           "<div class='tag-browser-tag-title clickable-checkbox-label'>" +
           "<span class='tag-browser-tag-title-content'>" + tag_title + "</span>" +
           "<span class='tag-browser-tag-assignment-count'>(" + tag_assignment_count + ")</span>" +
           "</div>" +
           "</div>";
  }

  handle_tag_search_input(e) {
    clearTimeout(this.tag_search_timeout);
    var search_value = $(this).val();

    this.tag_search_timeout = setTimeout(function filter_tag_list() {
      //console.time('filter-tag-list');
      var labels = $('#tag-selection-taglist-global').find('.tag-browser-tag-title-content');
      $('#tag-selection-taglist-global').find('.tag-browser-tag').hide();

      for (var i = 0; i < labels.length; i++) {
        var current_label = $(labels[i]);

        if (current_label.text().toLowerCase().indexOf(search_value.toLowerCase()) != -1) {
          var current_tag_box = current_label.closest('.tag-browser-tag');
          current_tag_box.show();
        }
      }
      //console.timeEnd('filter-tag-list');
    }, 300);
  }

  reset_tags_in_menu() {
    var taglist_container = $('#tag-selection-taglist-global');
    // Empty the container first, because there may be tags from previous calls
    taglist_container.empty();
  }

  is_tag_selected(tag_title) {
    var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList();
    if (currentTagIdList != null) {
      var currentTagTitleList = bible_browser_controller.tab_controller.getCurrentTagTitleList();
      if (currentTagTitleList != null) {
        var tag_list = currentTagTitleList.split(', ');
        for (var i = 0; i < tag_list.length; i++) {
          var current_tag = tag_list[i];
          if (current_tag == tag_title) {
            return true;
          }
        }
      }
    }

    return false;
  }

  selected_tags() {
    var checked_cbs = $('.tag-browser-tag-cb:checked');
    var tag_list = "";

    for (var i = 0; i < checked_cbs.length; i++) {
      var current_tag_id = $(checked_cbs[i]).closest('.tag-browser-tag').find('.tag-browser-tag-id').html();
      tag_list += current_tag_id;

      if (i < (checked_cbs.length - 1)) tag_list += ","
    }

    return tag_list;
  }

  selected_tag_titles() {
    var checked_cbs = $('.tag-browser-tag-cb:checked');
    var tag_list = "";

    for (var i = 0; i < checked_cbs.length; i++) {
      var current_tag_title = $(checked_cbs[i]).closest('.tag-browser-tag').find('.tag-browser-tag-title-content').text();
      tag_list += current_tag_title;

      if (i < (checked_cbs.length - 1)) tag_list += ", "
    }

    return tag_list;
  }

  handle_bible_tag_cb_click(event) {
    var currentTagIdList = this.selected_tags();
    var currentTagTitleList = this.selected_tag_titles();
    bible_browser_controller.tab_controller.setCurrentTagIdList(currentTagIdList);
    bible_browser_controller.tab_controller.setCurrentTagTitleList(currentTagTitleList);

    // Set selected book to null, since we just switched to selected tags
    bible_browser_controller.tab_controller.setCurrentTabBook(null, null);
    //bible_browser_controller.settings.set('selected_book', null);

    bible_browser_controller.get_tagged_verses();
  }

  bind_tag_cb_events() {
    var cbs = $('.tag-browser-tag-cb');

    cbs.bind('click', (event) => { this.handle_bible_tag_cb_click(event); });
    cbs.removeAttr('checked');
    cbs.removeAttr('disabled');
  }
  
  reset_tag_menu() {
    /*bible_browser_controller.tab_controller.setCurrentTagTitleList(null);
    bible_browser_controller.tab_controller.setCurrentTagIdList("");*/

    var taglist_container = $('#tag-selection-taglist-global');
    var tag_cb_list = taglist_container.find('.tag-browser-tag-cb');

    for (var i = 0; i < tag_cb_list.length; i++) {
      $(tag_cb_list[i]).removeAttr('checked');
    }
  }

  updateTagSelectionMenu(tabIndex) {
    this.reset_tag_menu();
    var currentTagTitleList = bible_browser_controller.tab_controller.getCurrentTagTitleList(tabIndex);
    if (currentTagTitleList != "" && currentTagTitleList != null) {
        this.request_tags_for_menu();
    }
  }

  update_verse_count_in_tag_menu(tag_title, new_count) {
    var tag_list = $('.tag-browser-tag');

    for (var i = 0; i < tag_list.length; i++) {
      var current_tag = $(tag_list[i]).find('.tag-browser-tag-title-content').text();
      if (current_tag == tag_title) {
        $(tag_list[i]).find('.tag-browser-tag-assignment-count').text('(' + new_count + ')');
        break;
      }
    }
  }
}

module.exports = TagSelectionMenu;

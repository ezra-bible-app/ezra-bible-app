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

const TranslationWizard = require('./app/bible_browser/translation_wizard.js');

function sleep(time)
{
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

function BibleBrowserController() {
  this.book_menu_is_opened = false;
  this.tag_menu_is_opened = false;
  this.display_menu_is_opened = false;
  this.current_book = null;
  this.current_book_name = null;
  this.current_cr_verse_id = null;
  this.communication_controller = new BibleBrowserCommunicationController;
  this.tag_menu_populated = false;
  this.current_tag_id_list = "";
  this.current_tag_title_list = "";
  this.bibleTranslationCount = 0;

  this.get_matching_bible_books = function(expression) {
    var matching_bible_books = new Array();

    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];

      if (current_book.long_title.indexOf(expression) != -1) {
        matching_bible_books.push(current_book.long_title);
      }
    }

    return matching_bible_books;
  };

  this.is_valid_book = function(book) {
    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];

      if (current_book.long_title == book) {
        return true;
      }
    }

    return false;
  };

  this.is_valid_chapter = function(book, chapter) {
    var book_short_title = bible_browser_controller.get_book_short_title(book);
    var number_of_chapters = get_book_chapter_count(book_short_title);
    return (parseInt(chapter) <= number_of_chapters);
  };

  this.is_valid_verse = function(book, chapter, verse) {
    var book_short_title = bible_browser_controller.get_book_short_title(book);
    var number_of_verses = get_book_chapter_verse_count(book_short_title, chapter);
    return (parseInt(verse) <= number_of_verses);
  }

  this.get_book_short_title = function(book_long_title) {
    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];
      if (current_book.long_title == book_long_title) {
        return current_book.short_title;
      }
    }

    return -1;
  };

  this.get_book_long_title = function(book_short_title) {
    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];
      if (current_book.short_title == book_short_title) {
        return current_book.long_title;
      }
    }

    return -1;
  };

  this.get_book_chapter_list = function(book_long_title, prefix_number) {
    var book_short_title = bible_browser_controller.get_book_short_title(book_long_title);
    var number_of_chapters = get_book_chapter_count(book_short_title);
    var chapter_list = new Array();
    var prefix = prefix_number + "";
    for (var i = 1; i <= number_of_chapters; i++) {
      var current_number_string = i + "";
      if (current_number_string == prefix_number) {
        continue;
      }
      if (prefix == "0" || current_number_string.indexOf(prefix) == 0) {
        chapter_list.push(book_long_title + " " + i);
      }
    }
    return chapter_list;
  };

  this.get_book_chapter_verse_list = function(book, chapter, prefix_number) {
    var book_short_title = bible_browser_controller.get_book_short_title(book);
    var verse_list = new Array();
    var number_of_verses = get_book_chapter_verse_count(book_short_title, parseInt(chapter));
    var prefix = prefix_number + "";
    for (var i = 1; i <= number_of_verses; i++) {
      var current_number_string = i + "";
      if (current_number_string == prefix_number) {
        continue;
      }
      if (prefix == "0" || current_number_string.indexOf(prefix) == 0) {
        verse_list.push(book + " " + chapter + reference_separator + i);
      }
    }
    return verse_list;
  }

  this.init = function(settings) {
    this.settings = settings;
    this.bind_events();
    this.init_book_selection_menu();
    this.init_tag_selection_menu();
    this.init_display_options_menu();
    this.init_cr_edit_box();
    this.translation_wizard = new TranslationWizard();
  };

  this.loadSettings = function() {
    if (bible_browser_controller.settings.has('selected_book') &&
        bible_browser_controller.settings.get('selected_book') != null &&
        bible_browser_controller.bibleTranslationCount > 0) {

      bible_browser_controller.select_bible_book(bible_browser_controller.settings.get('selected_book.code'),
                                                 bible_browser_controller.settings.get('selected_book.name'));
    }

    if (bible_browser_controller.settings.has('selected_tags') &&
        bible_browser_controller.settings.get('selected_tags') != null) {

      bible_browser_controller.current_tag_id_list = bible_browser_controller.settings.get('selected_tags.id_list');
      bible_browser_controller.current_tag_title_list = bible_browser_controller.settings.get('selected_tags.title_list');

      bible_browser_controller.get_tagged_verses();
    }
  };

  this.bind_events = function() {
    $('#app-container').find('#book-selection-menu').bind('click', bible_browser_controller.handle_body_click);

    $('#chapter-select').bind('change', function() {
      bible_browser_controller.hide_tag_menu();

      var chapter = bible_browser_controller.selected_chapter();
      var reference = '#top';

      if (chapter > 1) {
        reference = '#' + chapter + ':1';
        window.location = reference;
      } else {
        $('#verse-list-frame')[0].scrollTop = 0;
      }
    });

    // Enable the tags display by default
    $('#tags-switch').attr('checked', 'checked');
    $('#tags-switch').removeAttr('disabled');
    $('#tags-switch').bind('change', function() {
      bible_browser_controller.show_or_hide_verse_tags_based_on_option();
    });

    $('#verse-notes-switch').bind('change', function() {
      bible_browser_controller.show_or_hide_verse_notes_based_on_option();
    });
    $('#verse-notes-switch').removeAttr('disabled');

    // Enable the cross reference display by default
    $('#x-refs-switch').attr('checked', 'checked');
    $('#x-refs-switch').removeAttr('disabled');
    $('#x-refs-switch').bind('change', function() {
      bible_browser_controller.show_or_hide_xrefs_based_on_option();
    });
  };

  this.init_book_selection_menu = function() {
    var menu = $('#app-container').find('#book-selection-menu');
    var links = menu.find('a');

    menu.find('li').addClass('book-menu-enabled-entry');

    for (var i = 0; i < links.length; i++) {
      var current_link = $(links[i]);
      var current_link_href = current_link.attr('href');
      var current_book_title = current_link.html();
      var new_link_href = "javascript:bible_browser_controller.select_bible_book('" + 
                          current_link_href + "','" + current_book_title + "')";

      current_link.attr('href', new_link_href);
    }

    $('#app-container').find('.book-select-button').bind('click', bible_browser_controller.handle_book_menu_click);
  };

  this.init_tag_selection_menu = function() {
    $('#app-container').find('.tag-select-button').bind('click', bible_browser_controller.handle_tag_menu_click);
    $('#tag-selection-filter-input').bind('keyup', bible_browser_controller.handle_tag_search_input);
  };

  this.init_display_options_menu = function() {
    $('#app-container').find('.display-options-button').bind('click', bible_browser_controller.handle_display_menu_click);
  };

  this.handle_tag_search_input = function(e) {
    clearTimeout(bible_browser_controller.tag_search_timeout);
    var search_value = $(this).val();

    bible_browser_controller.tag_search_timeout = setTimeout(function filter_tag_list() {
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
  };

  this.get_parsed_verse_from_expression = function(expression) {
      if (expression.indexOf('Song of Solomon') != -1) {
        var book = 'Song of Solomon';
        if (expression.indexOf(':') != -1) {
          var separator = ':';
        } else if (expression.indexOf(',') != 1) {
          var separator = ',';
        }
        var chapter = expression.split(' ')[3].split(separator)[0];
        var verse = expression.split(' ')[3].split(separator)[1];
      } else {
        var book = expression.match(/^[1-5]?[ ]?[a-zA-Zöäü]+ /g);
        if (book != null) {
          book = book[0].substring(0, book[0].length - 1);
        }
        var chapter = expression.match(/^[1-5]?[ ]?[a-zA-Zöäü]+ [0-9]+/g);
        if (chapter != null) {
          chapter = chapter[0].split(' ');
          chapter = chapter[chapter.length - 1];
        }
        var verse = expression.match(/^[1-5]?[ ]?[a-zA-Zöäü]+ [0-9]+[,:][0-9]*$/g);
        if (verse != null) {
          if (expression.indexOf(':') != -1) {
            verse = verse[0].split(':')[1];
          } else if (expression.indexOf(',') != -1) {
            verse = verse[0].split(',')[1];
          }
        }
      }

      return {
        'book' : book,
        'chapter' : chapter,
        'verse' : verse
      }
  };

  this.matches_complete_verse_pattern = function(text) {
    if (text == null) {
      return false;
    }

    return (text.match(/^[1-5]?[ ]?[a-zA-Zöäü]+ [0-9]+[,:][0-9]*$/g) != null ||
            text.match(/^Song of Solomon [0-9]+[,:][0-9]*$/g) != null);
  };

  this.matches_complete_book_pattern = function(text) {
    if (text == null) {
      return false;
    }

    return (text.match(/^[1-5]?[ ]?[a-zA-Zöäü]+ $/g) != null || text == "Song of Solomon ");
  };

  this.matches_incomplete_book_pattern = function(text) {
    if (text == null) {
      return false;
    }

    return (text.match(/^[1-5]?[ ]?[a-zA-Zöäü]*$/g) != null);
  };

  this.init_cr_edit_box = function() {
    $('#cr-edit-box, #tag-reference-box').dialog({
      width: 720,
      position: [200,200],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });

    $('#cr-edit-box-input').autocomplete({
      minLength: 0,

      source: function(request, response) {
        var parsed_verse = bible_browser_controller.get_parsed_verse_from_expression(request.term);
        
        var book = parsed_verse.book;
        var chapter = parsed_verse.chapter;
        var verse = parsed_verse.verse;

        if (request.term.match(/^[1-5]?[ ]?[a-zA-Zöäü]+ [0-9]+$/g) != null) {
          if (bible_browser_controller.is_valid_book(book)) {
            var chapter_list = bible_browser_controller.get_book_chapter_list(book, chapter);
            response(chapter_list);
          }
        } else if (bible_browser_controller.matches_complete_verse_pattern(request.term)) {
          //console.log("Looking for verse...");

          if (bible_browser_controller.is_valid_book(book)) {
            if (bible_browser_controller.is_valid_chapter(book, chapter)) {
              if (bible_browser_controller.is_valid_verse(book, chapter, verse)) {
                //console.log("Valid verse!");
                bible_browser_controller.request_verse_preview(parsed_verse.book,
                                                               parsed_verse.chapter,
                                                               parsed_verse.verse);
              }

              var verse_list = bible_browser_controller.get_book_chapter_verse_list(book, chapter, verse);
              response(verse_list);
            } else {
              //console.log("Invalid chapter: " + book + " " + chapter);
              // handle invalid chapter
            }
          } else {
            //console.log("Invalid book: " + book);
            // handle invalid book
          }
        } else if (bible_browser_controller.matches_complete_book_pattern(request.term)) {
          if (bible_browser_controller.is_valid_book(book)) {
            //console.log("Valid book: " + book);
            var chapter_list = bible_browser_controller.get_book_chapter_list(book, 0);
            response(chapter_list);
          } else {
            console.log("Invalid book: " + book);
            // Handle invalid book
          }
        } else if (bible_browser_controller.matches_incomplete_book_pattern(request.term)) {
          console.log("Book not completed!");
          var matching_bible_books = bible_browser_controller.get_matching_bible_books(request.term);
          response(matching_bible_books);
        } else {
          // Handle invalid passage
          console.log("Invalid passage!");
        }
      },

      focus: function() {
        // prevent value inserted on focus
        return false;
      },

      select: function( event, ui ) {
        var selected_item = ui.item.value;
        if (bible_browser_controller.matches_complete_verse_pattern(selected_item)) {
          var parsed_verse = bible_browser_controller.get_parsed_verse_from_expression(selected_item);
          bible_browser_controller.request_verse_preview(parsed_verse.book,
                                                         parsed_verse.chapter,
                                                         parsed_verse.verse);
        }
      }
    });

    $('#cr-edit-box-add-cr-button').bind('click', bible_browser_controller.handle_add_cr_button_click);
  };

  this.handle_add_cr_button_click = function() {
    var current_verse = $('#cr-edit-box-input').val();
    var parsed_verse = bible_browser_controller.get_parsed_verse_from_expression(current_verse);
    if (bible_browser_controller.is_valid_verse(parsed_verse.book,
                                                parsed_verse.chapter,
                                                parsed_verse.verse)) {
       
      var verse_id = bible_browser_controller.current_cr_verse_id;
      var book_short_title = bible_browser_controller.get_book_short_title(parsed_verse.book);
      var absolute_verse_number = reference_to_absolute_verse_nr(book_short_title, parsed_verse.chapter, parsed_verse.verse);
      bible_browser_controller.communication_controller.submit_new_cross_reference(
        verse_id,
        book_short_title,
        absolute_verse_number
      );
    }
  };

  this.request_verse_preview = function(book, chapter, verse) {
    if (bible_browser_controller.is_valid_verse(book, chapter, verse)) {
      var book_short_title = bible_browser_controller.get_book_short_title(book);
      bible_browser_controller.communication_controller.request_verse_preview(book_short_title, chapter, verse);
    }
  };

  this.select_bible_book = function(book_code, book_title) {
    bible_browser_controller.hide_book_menu();
    bible_browser_controller.hide_tag_menu();

    $('#verse-list-menu').find('.book-select-value').html(book_title);
    $('#outline-content').empty();

    bible_browser_controller.settings.set('selected_book', {
        code: book_code,
        name: book_title
    });

    // Set selected tags to null, since we just switched to a book
    bible_browser_controller.settings.set('selected_tags', null);

    this.current_book = book_code;
    this.current_book_name = book_title;

    bible_browser_controller.update_book_data();
  };

  this.update_book_data = function() {
    if (bible_browser_controller.current_book != null) {

      tags_controller.clear_verse_selection();
      $('#download-tagged-verses-button').addClass('ui-state-disabled');
      bible_browser_controller.reset_verse_list_view();
      $('#temporary-help').hide();
      $('#verse-list-loading-indicator').show();

      bible_browser_controller.communication_controller.request_book_text(
        bible_browser_controller.current_book,
        bible_browser_controller.render_text_and_init_app);

      initChapterVerseCounts();

      tags_controller.communication_controller.request_tags();

      // DISABLED for PORTING
      //tags_controller.communication_controller.request_meta_tags();
    }
  };

  this.hide_book_menu = function() {
    if (bible_browser_controller.book_menu_is_opened) {
      $('#app-container').find('#book-selection-menu').hide();
      bible_browser_controller.book_menu_is_opened = false;

      var book_button = $('#app-container').find('.book-select-button');
      book_button.removeClass('ui-state-active');
    }
  };

  this.hide_tag_menu = function() {
    if (bible_browser_controller.tag_menu_is_opened) {
      $('#app-container').find('#tag-selection-menu').hide();
      bible_browser_controller.tag_menu_is_opened = false;

      var tag_button = $('#app-container').find('.tag-select-button');
      tag_button.removeClass('ui-state-active');
    }
  };

  this.hide_display_menu = function() {
    if (bible_browser_controller.display_menu_is_opened) {
      $('#app-container').find('#display-options-menu').hide();
      bible_browser_controller.display_menu_is_opened = false;

      var display_button = $('#app-container').find('.display-options-button');
      display_button.removeClass('ui-state-active');
    }
  };

  this.handle_body_click = function(event) {
    if($(this).hasClass('verse-selection-menu')) {
      event.stopPropagation();
      return;
    }
    
    bible_browser_controller.hide_book_menu();
    bible_browser_controller.hide_tag_menu();
    bible_browser_controller.hide_display_menu();

    if ($('#currently-edited-notes').length > 0) {
      notes_controller.restore_currently_edited_notes();
    }
  };

  this.handle_book_menu_click = function(event) {
    if (bible_browser_controller.book_menu_is_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.hide_tag_menu();
      bible_browser_controller.hide_display_menu();
      var book_button = $('#app-container').find('.book-select-button');
      book_button.addClass('ui-state-active');

      var book_button_offset = book_button.offset();
      var menu = $('#app-container').find('#book-selection-menu');
      var top_offset = book_button_offset.top + book_button.height() + 12;
      var left_offset = book_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#book-selection-menu').slideDown();
      bible_browser_controller.book_menu_is_opened = true;
      event.stopPropagation();
    }
  };

  this.handle_tag_menu_click = function(event) {
    if (bible_browser_controller.tag_menu_is_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.hide_book_menu();
      bible_browser_controller.hide_display_menu();
      var tag_select_button = $('#app-container').find('.tag-select-button');
      tag_select_button.addClass('ui-state-active');

      var tag_select_button_offset = tag_select_button.offset();
      var menu = $('#app-container').find('#tag-selection-menu');
      var top_offset = tag_select_button_offset.top + tag_select_button.height() + 12;
      var left_offset = tag_select_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      if (!bible_browser_controller.tag_menu_populated) {
        bible_browser_controller.communication_controller.request_tags_for_menu();
        bible_browser_controller.tag_menu_populated = true;
      }

      $('#app-container').find('#tag-selection-menu').slideDown();
      bible_browser_controller.tag_menu_is_opened = true;
      event.stopPropagation();
    }
  };

  this.handle_display_menu_click = function(event) {
    if (bible_browser_controller.display_menu_is_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.hide_book_menu();
      bible_browser_controller.hide_tag_menu();
      var display_options_button = $('#app-container').find('.display-options-button');
      display_options_button.addClass('ui-state-active');

      var display_options_button_offset = display_options_button.offset();
      var menu = $('#app-container').find('#display-options-menu');
      var top_offset = display_options_button_offset.top + display_options_button.height() + 12;
      var left_offset = display_options_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#display-options-menu').slideDown();
      bible_browser_controller.display_menu_is_opened = true;
      event.stopPropagation();
    }
  };

  this.bind_events_after_bible_text_loaded = function() {
    $('.cr-info').filter(":not('.tag-events-configured')").bind('click', bible_browser_controller.handle_cross_reference_click).addClass('tag-events-configured');
    $('.tag-box, .cr-box').filter(":not('.tag-events-configured')").bind('click', tags_controller.clear_verse_selection).addClass('tag-events-configured');
    $('.tag').filter(":not('.tag-events-configured')").bind('click', bible_browser_controller.handle_tag_reference_click).addClass('tag-events-configured');

    if (bible_browser_controller.text_is_book) {
      var book_tag_statistics_button = $('#show-book-tag-statistics-button');
      book_tag_statistics_button.removeClass('ui-state-disabled');
      book_tag_statistics_button.removeClass('events-configured');
      book_tag_statistics_button.bind('click', function() {
        bible_browser_controller.open_book_tag_statistics(); 
      });
      book_tag_statistics_button.show();
      configure_button_styles('#verse-list-menu');
    }
  };

  this.get_overlay_verse_box_position = function(verse_box) {
    var verse_box_position = verse_box.offset();
    var verse_box_class = verse_box.attr('class');
    var verse_nr = parseInt(verse_box_class.match(/verse-nr-[0-9]*/)[0].split('-')[2]);
    var next_verse_nr = verse_nr + 1;
    var next_verse_box = $('.verse-nr-' + next_verse_nr);
    var next_verse_box_position = next_verse_box.offset();
    if (next_verse_box_position == undefined) {
      next_verse_box_position = verse_box.offset();
    }
    var verse_list_height = $('#verse-list-frame').height();
    var verse_list_position = $('#verse-list-frame').offset();
    var screen_bottom = verse_list_position.top + verse_list_height;
    var cross_reference_box_height = 240;
    var overlay_box_position = null;

    if ((next_verse_box_position.top + cross_reference_box_height) <
        screen_bottom) {
      // The box does fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: next_verse_box_position.top + 7,
        left: next_verse_box_position.left
      };
    } else {
      // The box does NOT fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: verse_box_position.top - cross_reference_box_height,
        left: verse_box_position.left
      };
    }

    return overlay_box_position;
  };

  this.handle_cross_reference_click = function() {
    var position = $(this).offset();
    var verse_reference = $(this).closest('.verse-reference').find('.verse-reference-content').text();
    var verse_box = $(this).closest('.verse-box');
    var verse_id = verse_box.find('.verse-id').text();

    bible_browser_controller.current_cr_verse_id = verse_id;
    bible_browser_controller.communication_controller.request_cross_references_for_verse(verse_id);

    var cross_reference_box_position = bible_browser_controller.get_overlay_verse_box_position(verse_box);

    var current_book = "";
    if (bible_browser_controller.current_book_name != null) {
      current_book = bible_browser_controller.current_book_name;
    } else {
      current_book = verse_box.find('.verse-bible-book').text();
    }

    var cr_title = gettext_strings.cross_references_for +
                   ' ' +
                   current_book +
                   ' ' +
                   verse_reference;

    $('#cr-edit-box').dialog({
      position: [cross_reference_box_position.left, cross_reference_box_position.top],
      title: cr_title
    });
    $('#cr-edit-box-verse-list').empty();
    $('#cr-edit-box-input').val('');
    $('#cr-edit-box-verse-preview').empty();
    $('#cr-edit-box').dialog("open");
  };

  this.render_cross_references_in_preview_box = function(xml_verse_list) {
    var cr_edit_box_verse_list = $('#cr-edit-box-verse-list');
    cr_edit_box_verse_list.empty();
    var verse_box = $('.verse-id-' + bible_browser_controller.current_cr_verse_id);
    var cr_box = verse_box.find('.cr-box');
    var cr_info = verse_box.find('.cr-info');
    cr_box.empty();

    var verses = $(xml_verse_list).find('verse');
    for (var i = 0; i < verses.length; i++) {
      var current_verse = verses[i];
      var current_verse_html = bible_browser_controller.get_html_for_cross_reference(current_verse);
      cr_edit_box_verse_list.append(current_verse_html);
      var inline_reference_html = bible_browser_controller.get_inline_reference_html_for_verse(current_verse);
      cr_box.append(inline_reference_html);
    }

    configure_button_styles('#cr-edit-box');
    cr_edit_box_verse_list.find('.cr-delete-button').bind('click', bible_browser_controller.delete_cross_reference);

    if (verses.length > 0) {
      cr_info.addClass('visible');
    } else {
      cr_info.removeClass('visible');
    }
  };

  this.handle_tag_reference_click = function() {
    var position = $(this).offset();
    var verse_box = $(this).closest('.verse-box');
    var verse_id = verse_box.find('.verse-id').text();
    var selected_tag = $(this).html().trim();
    selected_tag = selected_tag.replace(/&nbsp;/g, ' ');
    var tag_id = null;

    var tag_info_list = verse_box.find('.tag-global');
    for (var i = 0; i < tag_info_list.length; i++) {
      var current_tag_info = $(tag_info_list[i]);
      var current_tag_title = current_tag_info.find('.tag-title').text();

      if (current_tag_title == selected_tag) {
        tag_id = current_tag_info.find('.tag-id').text();
        break;
      }
    }

    bible_browser_controller.communication_controller.request_verses_for_selected_tags(
      tag_id,
      bible_browser_controller.render_tagged_verse_list_in_reference_box,
      renderVerseMetaInfo=false
    );

    var box_position = bible_browser_controller.get_overlay_verse_box_position(verse_box);
    var title = gettext_strings.tagged_verses_for + ' "' + selected_tag + '"';

    $('#tag-reference-box').dialog({
      position: [box_position.left, box_position.top],
      title: title
    });
    $('#tag-reference-box-verse-list').empty();
    $('#tag-reference-box').dialog("open");
  };

  this.render_tagged_verse_list_in_reference_box = function(htmlVerses) {
    $('#tag-reference-box-verse-list').html(htmlVerses);
  };

  this.render_tags_in_menu = function(tags) {
    var taglist_container = $('#tag-selection-taglist-global');
    // Empty the container first, because there may be tags from previous calls
    taglist_container.empty();

    bible_browser_controller.render_tag_list(tags, taglist_container, false);
    bind_click_to_checkbox_labels();
  };

  this.render_tag_list = function(tag_list, target_container, only_local) {
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

      var current_tag_html = bible_browser_controller.get_html_for_tag(current_tag_id,
                                                                       current_tag_title,
                                                                       current_assignment_count);
      target_container.append(current_tag_html);
    }

    bible_browser_controller.bind_tag_cb_events();

    // Check all the previously selected tags in the list
    all_tags = target_container.find('.tag-browser-tag-title-content');
    for (var i = 0; i < all_tags.length; i++) {
      var current_tag = $(all_tags[i]);
      var current_tag_is_checked = bible_browser_controller.is_tag_selected(current_tag.text());

      if (current_tag_is_checked) {
        var tag_browser_tag = current_tag.closest('.tag-browser-tag');
        var tag_cb = tag_browser_tag.find('.tag-browser-tag-cb'); 
        tag_cb.attr('checked','checked');
      }
    }
  };

  this.is_tag_selected = function(tag_title) {
    if (bible_browser_controller.current_tag_title_list != null) {
      var tag_list = bible_browser_controller.current_tag_title_list.split(', ');
      for (var i = 0; i < tag_list.length; i++) {
        var current_tag = tag_list[i];
        if (current_tag == tag_title) {
          return true;
        }
      }
    }

    return false;
  };

  this.update_tag_title_in_selection = function(old_title, new_title) {
    if (bible_browser_controller.current_tag_title_list != null) {
      var tag_list = bible_browser_controller.current_tag_title_list.split(', ');
      for (var i = 0; i < tag_list.length; i++) {
        var current_tag = tag_list[i];
        if (current_tag == old_title) {
          tag_list[i] = new_title;
          break;
        }
      }
      bible_browser_controller.current_tag_title_list = tag_list.join(', ');
    }
  };

  this.bind_tag_cb_events = function() {
    var cbs = $('.tag-browser-tag-cb');

    cbs.bind('click', bible_browser_controller.handle_bible_tag_cb_click);
    cbs.removeAttr('checked');
    cbs.removeAttr('disabled');
  };

  this.handle_bible_tag_cb_click = function() {
    bible_browser_controller.current_tag_id_list = bible_browser_controller.selected_tags();
    bible_browser_controller.current_tag_title_list = bible_browser_controller.selected_tag_titles();

    bible_browser_controller.settings.set('selected_tags', {
      id_list: bible_browser_controller.current_tag_id_list,
      title_list: bible_browser_controller.current_tag_title_list
    });

    // Set selected book to null, since we just switched to selected tags
    bible_browser_controller.current_book_name = null;
    bible_browser_controller.settings.set('selected_book', null);

    bible_browser_controller.get_tagged_verses();
  };

  this.get_tagged_verses = function() {
    bible_browser_controller.reset_verse_list_view();
    $('#show-book-tag-statistics-button').addClass('ui-state-disabled');

    if (bible_browser_controller.current_tag_id_list != "") {
      $('#verse-list-loading-indicator').show();

      bible_browser_controller.communication_controller.request_verses_for_selected_tags(
        bible_browser_controller.current_tag_id_list,
        bible_browser_controller.render_tagged_verse_list,
        renderVerseMetaInfo=true
      );

      tags_controller.communication_controller.request_tags();
      // PORTING DISABLED
      //tags_controller.communication_controller.request_meta_tags();
    }
  };

  this.selected_tags = function() {
    var checked_cbs = $('.tag-browser-tag-cb:checked');
    var tag_list = "";

    for (var i = 0; i < checked_cbs.length; i++) {
      var current_tag_id = $(checked_cbs[i]).closest('.tag-browser-tag').find('.tag-browser-tag-id').html();
      tag_list += current_tag_id;

      if (i < (checked_cbs.length - 1)) tag_list += ","
    }

    return tag_list;
  };

  this.get_html_for_tag = function(tag_id, tag_title, tag_assignment_count) {
    return "<div id='tag-browser-tag-" + tag_id + 
           "' class='tag-browser-tag'>" + 
           "<div class='tag-browser-tag-id'>" + tag_id + "</div>" +
           "<input class='tag-browser-tag-cb' type='checkbox'></input>" +
           "<div class='tag-browser-tag-title clickable-checkbox-label'>" +
           "<span class='tag-browser-tag-title-content'>" + tag_title + "</span>" +
           "<span class='tag-browser-tag-assignment-count'>(" + tag_assignment_count + ")</span>" +
           "</div>" +
           "</div>";
  };

  this.reset_verse_list_view = function() {
    var verse_list = document.getElementById('verse-list');
    while(verse_list.firstChild) {
      verse_list.removeChild(verse_list.firstChild);
    }

    // FIXME
    //$('#download-tagged-verses-as-odt-button').hide();
  };

  this.selected_tag_titles = function() {
    var checked_cbs = $('.tag-browser-tag-cb:checked');
    var tag_list = "";

    for (var i = 0; i < checked_cbs.length; i++) {
      var current_tag_title = $(checked_cbs[i]).closest('.tag-browser-tag').find('.tag-browser-tag-title-content').text();
      tag_list += current_tag_title;

      if (i < (checked_cbs.length - 1)) tag_list += ", "
    }

    return tag_list;
  };

  this.update_verse_list_headline = function() {
    var selected_tags = bible_browser_controller.selected_tag_titles();

    $('#tag-browser-verselist-header-content').html(gettext_strings.bible_verses_tagged_with + ": " + selected_tags);
  };

  this.wrap_book_with_html = function(book_title) {
    return "<div class='tag-browser-verselist-book-header'>" + book_title + "</div>";
  };

  this.render_tagged_verse_list = function(htmlVerses) {
    $('#verse-list-loading-indicator').hide();
    bible_browser_controller.current_book = null;
    bible_browser_controller.settings.set('book', null);

    $('#verse-list-menu').find('.book-select-value').html(gettext_strings.book_select_label);
    $('#download-tagged-verses-button').removeClass('ui-state-disabled');

    $('#verse-list').html(htmlVerses);

    var dl_button = $('#download-tagged-verses-button');
    dl_button.bind('click', function() {
      var selected_tags = bible_browser_controller.selected_tags();
      var url = '/tags/' + selected_tags + '/tagged_verses.odt';
      location.href = url;
    });
    dl_button.show();
    dl_button.removeClass('events-configured');
    configure_button_styles('#verse-list-menu');

    bible_browser_controller.enable_tagging_toolbox_only();
    bible_browser_controller.text_is_book = false;
    bible_browser_controller.init_application_for_current_verse_list();
  };

  this.get_html_for_cross_reference = function(verse) {
    var content = $(verse).find('content').text();
    var book = $(verse).find('bible-book-short-title').text();
    var book_long_title = bible_browser_controller.get_book_long_title(book);
    var chapter = $(verse).find('chapter').text();
    var verse_nr = $(verse).find('verse-nr').text();
    var cr_id = $(verse).find('cross-reference-id').text();

    var reference = book_long_title + " " + chapter + reference_separator + verse_nr;

    return "<div class=\"full-cross-reference\">" +
           "<div title=\"" + gettext_strings.delete_cross_reference + "\" class=\"cr-delete-button fg-button fg-button-icon-left ui-state-default ui-corner-all\">" +
           "<span class=\"ui-icon ui-icon-closethick\"></span>" +
           "</div>" +
           "<span class=\"cross-reference-id hidden\">" + cr_id + "</span>" +
           "<div class=\"cross-reference-ref\">" + reference + "</div> " + 
           "<div class=\"cross-reference-text\">" +
              content +
           "</div>" +
           "</div>"; 
  };

  this.get_inline_reference_html_for_verse = function(verse) {
    var book = $(verse).find('bible-book-short-title').text();
    var chapter = $(verse).find('chapter').text();
    var verse = $(verse).find('verse-nr').text();
    var reference = book + " " + chapter + reference_separator + verse;
    
    return "<div class=\"cross-reference\" title=\"\">" + reference + "</div>";
  };

  this.delete_cross_reference = function() {
    var full_cross_reference = $(this).closest('.full-cross-reference');
    var cross_reference_id = full_cross_reference.find('.cross-reference-id').text();
    full_cross_reference.addClass('ui-state-disabled');
    $(this).addClass('ui-state-disabled');
    bible_browser_controller.communication_controller.destroy_cross_reference(cross_reference_id);
  };

  this.selected_chapter = function() {
    var chapter = Number(bible_browser_controller.selected_chapter_option().text);
    return chapter;
  };

  this.selected_chapter_option = function() {
    var select_field = $('#chapter-select')[0];
    var selected_option = select_field.options[select_field.selectedIndex];

    return selected_option;
  };

  this.show_or_hide_verse_tags_based_on_option = function() {
    if (bible_browser_controller.tags_switch_checked()) {
      $('#verse-list').removeClass('verse-list-without-tags');
    } else {
      $('#verse-list').addClass('verse-list-without-tags');
    }
  };

  this.show_or_hide_xrefs_based_on_option = function() {
    if (bible_browser_controller.xrefs_switch_checked()) {
      $('#verse-list').removeClass('verse-list-without-xrefs');
    } else {
      $('#verse-list').addClass('verse-list-without-xrefs');
    }
  };

  this.show_or_hide_verse_notes_based_on_option = function() {
    if (bible_browser_controller.verse_notes_switch_checked()) {
      $('#verse-list').addClass('verse-list-with-notes');
    } else {
      if ($('#currently-edited-notes').length > 0) {
        // If the user wants to hide the notes the currently edited note
        // has to be restored as well
        notes_controller.restore_currently_edited_notes();
      }
      $('#verse-list').removeClass('verse-list-with-notes');
    }
  };

  this.verse_notes_switch_checked = function() {
    return $('#verse-notes-switch').attr('checked');
  };

  this.tags_switch_checked = function() {
    return $('#tags-switch').attr('checked');
  };

  this.xrefs_switch_checked = function() {
    return $('#x-refs-switch').attr('checked');
  };

  this.enable_toolbox = function() {
    $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li').removeClass('ui-state-disabled');
  };

  this.enable_tagging_toolbox_only = function() {
    var menu_items = $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li');
    for (var i = 0; i < menu_items.length; i++) {
      var current_item = $(menu_items[i]);
      if (current_item.find('a').attr('href') == '#tags-view') {
        current_item.removeClass('ui-state-disabled');
      } else {
        current_item.addClass('ui-state-disabled');
      }
    }
    $('#bible-browser-toolbox').tabs('select', 1);
  };

  this.disable_toolbox = function() {
    $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li').addClass('ui-state-disabled');
  };

  this.init_application_for_current_verse_list = function() {
    // Disabled notes controller
    //notes_controller.init();
    tags_controller.init();

    updateNavMenu();

    bible_browser_controller.bind_events_after_bible_text_loaded();
    tags_controller.bind_tag_events();
  };
  
  this.reset_tag_menu = function() {
    bible_browser_controller.current_tag_title_list = null;
    bible_browser_controller.current_tag_id_list = "";

    var taglist_container = $('#tag-selection-taglist-global');
    var tag_cb_list = taglist_container.find('.tag-browser-tag-cb');

    for (var i = 0; i < tag_cb_list.length; i++) {
      $(tag_cb_list[i]).removeAttr('checked');
    }
  };

  this.update_verse_count_in_tag_menu = function(tag_title, new_count) {
    var tag_list = $('.tag-browser-tag');

    for (var i = 0; i < tag_list.length; i++) {
      var current_tag = $(tag_list[i]).find('.tag-browser-tag-title-content').text();
      if (current_tag == tag_title) {
        $(tag_list[i]).find('.tag-browser-tag-assignment-count').text('(' + new_count + ')');
        break;
      }
    }
  };

  this.open_book_tag_statistics = function() {
    var verse_list_position = $('#verse-list-frame').offset();
    $('#book-tag-statistics-box').dialog({
      position: [verse_list_position.left + 50, verse_list_position.top + 50],
      width: 350,
      title: bible_browser_controller.current_book_name + ' - tag statistics'
    });
  };

  this.open_translation_settings_wizard = function() {
    bible_browser_controller.translation_wizard.openWizard();
  };

  this.render_text_and_init_app = function(verse_list) {
    $('#verse-list').html(verse_list);

    $('#verse-list-loading-indicator').hide();
    bible_browser_controller.enable_toolbox();
  
    bible_browser_controller.reset_tag_menu();
    bible_browser_controller.text_is_book = true;

    bible_browser_controller.init_application_for_current_verse_list();
  };
}
 

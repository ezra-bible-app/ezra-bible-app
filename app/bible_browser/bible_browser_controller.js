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

const TagSelectionMenu = require('./app/bible_browser/tag_selection_menu.js');
const TranslationWizard = require('./app/bible_browser/translation_wizard.js');
const TranslationController = require('./app/bible_browser/translation_controller.js');
const BookSearch = require('./app/bible_browser/book_search.js');
const TabController = require('./app/bible_browser/tab_controller.js');
const NavigationPane = require('./app/bible_browser/navigation_pane.js');
const TextLoader = require('./app/bible_browser/text_loader.js');
const TaggedVerseExport = require('./app/bible_browser/tagged_verse_export.js');
const BibleBrowserCommunicationController = require('./app/bible_browser/bible_browser_communication_controller.js');
const LanguageMapper = require('./app/bible_browser/language_mapper.js');

function BibleBrowserController() {
  this.book_menu_is_opened = false;
  this.display_menu_is_opened = false;
  this.current_cr_verse_id = null;
  this.communication_controller = new BibleBrowserCommunicationController();

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

  this.init = async function() {
    this.verse_list_menu_template = $($('.verse-list-menu')[0]).html();
    this.verse_list_composite_template = $($('.verse-list-composite')[0]).html();

    this.settings = require('electron-settings');

    this.tag_selection_menu = new TagSelectionMenu();

    this.translation_controller = new TranslationController();
    this.translation_controller.init(bible_browser_controller.onBibleTranslationChanged);
    this.translation_wizard = new TranslationWizard();

    this.text_loader = new TextLoader();

    this.book_search = new BookSearch();
    this.book_search.init('#book-search',
                          '#book-search-input',
                          '#book-search-occurances',
                          '#book-search-previous',
                          '#book-search-next',
                          bible_browser_controller.onSearchResultsAvailable,
                          bible_browser_controller.onSearchReset);

    var tabHtmlTemplate = bible_browser_controller.getTabHtmlTemplate();

    var bibleTranslations = await models.BibleTranslation.findAndCountAll();
    var defaultBibleTranslationId = null;
    if (bibleTranslations.rows.length > 0) {
      var defaultBibleTranslationId = bibleTranslations.rows[0].id;
    }

    this.tab_controller = new TabController();
    this.tab_controller.init('verse-list-tabs',
                             'verse-list-container',
                             'add-tab-button',
                             this.settings,
                             tabHtmlTemplate,
                             bible_browser_controller.onTabSelected,
                             bible_browser_controller.onTabAdded,
                             defaultBibleTranslationId);

    this.navigation_pane = new NavigationPane();
    this.taggedVerseExport = new TaggedVerseExport();

    this.init_book_selection_menu();
    // Not used
    //this.init_display_options_menu();
    this.init_tag_reference_box();
    this.init_bible_translation_info_box();
    this.init_bible_sync_box();
  };

  this.onSearchResultsAvailable = function(occurances) {
    for (var i = 0; i < occurances.length; i++) {
      var currentOccurance = $(occurances[i]);
      var verseBox = currentOccurance.closest('.verse-box');

      var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
      var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList();

      if (currentBook != null) {
        // Highlight chapter if we are searching in a book

        var verseReferenceContent = verseBox.find('.verse-reference-content').text();
        var chapter = bible_browser_controller.getChapterFromReference(verseReferenceContent);
        bible_browser_controller.navigation_pane.highlightSearchResult(chapter);

      } else if (currentTagIdList != null) {

        // Highlight bible book if we are searching in a tagged verses list
        var book = verseBox.find('.verse-bible-book-short').text();
        var bibleBookLongTitle = bible_browser_controller.get_book_long_title(book);
        
        var bibleBookNumber = bible_browser_controller.getTaggedVerseListBookNumber(bibleBookLongTitle);
        if (bibleBookNumber != -1) {
          bible_browser_controller.navigation_pane.highlightSearchResult(bibleBookNumber);
        }
      }

    }
  };

  this.onSearchReset = function() {
    bible_browser_controller.navigation_pane.clearHighlightedSearchResults();
  };

  this.onTabSelected = function(event = undefined, ui = { 'index' : 0}) {
    // Refresh tags view
    bible_browser_controller.updateTagsView(ui.index);

    // Refresh tags selection menu (It's global!)
    bible_browser_controller.tag_selection_menu.updateTagSelectionMenu(ui.index);

    // Re-configure book search for current verse list
    var currentVerseList = bible_browser_controller.getCurrentVerseList(ui.index);
    bible_browser_controller.book_search.setVerseList(currentVerseList);

    // Re-configure bible translations menu for current verse list
    bible_browser_controller.translation_controller.initTranslationsMenu(ui.index);

    // Update available books for current translation
    bible_browser_controller.translation_controller.updateAvailableBooks(ui.index);

    // Toggle book statistics
    bible_browser_controller.toggle_book_tags_statistics_button(ui.index);
  };

  this.onTabAdded = function(tabIndex=0) {
    resize_app_container();
    bible_browser_controller.tag_selection_menu.init_tag_selection_menu(tabIndex);
    bible_browser_controller.init_current_verse_list_menu(tabIndex);
    bible_browser_controller.translation_controller.initBibleTranslationInfoButton();

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tabIndex);
    if (currentBibleTranslationId != null) {
      bible_browser_controller.translation_controller.enableCurrentTranslationInfoButton(tabIndex);
    }
  };

  this.onBibleTranslationChanged = function() {
    var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
    var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList();
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();

    if (!bible_browser_controller.tab_controller.isCurrentTabEmpty()) {
      bible_browser_controller.text_loader.requestTextUpdate(currentTabId,
                                                             currentBook,
                                                             currentTagIdList,
                                                             false);
    }
  };

  this.getTabHtmlTemplate = function() {
    var tabHtmlTemplate = "";

    tabHtmlTemplate += "<div class='verse-list-menu'>";
    tabHtmlTemplate += bible_browser_controller.verse_list_menu_template;
    tabHtmlTemplate += "</div>";

    tabHtmlTemplate += "<div class='verse-list-composite'>";
    tabHtmlTemplate += bible_browser_controller.verse_list_composite_template;
    tabHtmlTemplate += "</div>";

    return tabHtmlTemplate;
  };

  this.loadSettings = async function() {
    await this.tab_controller.loadTabConfiguration();
    await bible_browser_controller.translation_controller.loadSettings();
    this.tab_controller.bindEvents();

    if (bible_browser_controller.settings.get('tag_list_width') &&
        bible_browser_controller.settings.get('tag_list_width') != null) {

      $('#bible-browser-toolbox').css('width', bible_browser_controller.settings.get('tag_list_width'));
    }
  };

  this.init_book_selection_menu = function() {
    var menu = $('#app-container').find('#book-selection-menu');
    var links = menu.find('a');

    menu.bind('click', bible_browser_controller.handle_body_click);

    for (var i = 0; i < links.length; i++) {
      var current_link = $(links[i]);
      var current_link_href = current_link.attr('href');
      var current_book_title = current_link.html();
      var new_link_href = "javascript:bible_browser_controller.select_bible_book('" + 
                          current_link_href + "','" + current_book_title + "')";

      current_link.attr('href', new_link_href);
    }
  };

  this.init_current_verse_list_menu = function(tabIndex=undefined) {
    //console.log("init_current_verse_list_menu " + tabIndex);
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var bookSelectButton = currentVerseListMenu.find('.book-select-button');
    bookSelectButton.bind('click', bible_browser_controller.handle_book_menu_click);
    $('.verse-list-menu').find('.fg-button').removeClass('events-configured');
    configure_button_styles('.verse-list-menu');
    bible_browser_controller.navigation_pane.updateNavigation();
  };

  // Not used
  this.init_display_options_menu = function() {
    $('#app-container').find('.display-options-button').bind('click', bible_browser_controller.handle_display_menu_click);
  };

  this.init_tag_reference_box = function() {
    $('#tag-reference-box').dialog({
      width: 620,
      position: [200,200],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  };

  this.init_bible_translation_info_box = function() {
    $('#bible-translation-info-box').dialog({
      width: 800,
      height: 500,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  };

  this.init_bible_sync_box = function() {
    $('#bible-sync-box').dialog({
      width: 600,
      height: 300,
      autoOpen: false,
      title: "Synchronizing Sword modules",
      dialogClass: 'bible-sync-dialog'
    });
  }

  this.getCurrentVerseListTabs = function(tabIndex=undefined) {
    var selectedTabId = bible_browser_controller.tab_controller.getSelectedTabId(tabIndex);
    var currentVerseListTabs = $('#' + selectedTabId);
    return currentVerseListTabs;
  }

  this.getCurrentVerseListMenu = function(tabIndex=undefined) {
    var currentVerseListTabs = bible_browser_controller.getCurrentVerseListTabs(tabIndex);
    var currentVerseListMenu = currentVerseListTabs.find('.verse-list-menu');
    return currentVerseListMenu;
  };

  this.getCurrentVerseListComposite = function(tabIndex=undefined) {
    var currentVerseListTabs = bible_browser_controller.getCurrentVerseListTabs(tabIndex);
    var currentVerseListComposite = currentVerseListTabs.find('.verse-list-composite');
    return currentVerseListComposite;
  };

  this.getCurrentVerseListFrame = function(tabIndex=undefined) {
    var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite(tabIndex);
    var currentVerseListFrame = currentVerseListComposite.find('.verse-list-frame');
    return currentVerseListFrame;
  };

  this.getCurrentVerseList = function(tabIndex=undefined) {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    var verseList = currentVerseListFrame.find('.verse-list');
    return verseList;
  };

  this.select_bible_book = function(book_code, book_title) {
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
    models.BibleTranslation.getBookList(currentBibleTranslationId).then(books => {
      if (!books.includes(book_code)) {
        return;
      }

      bible_browser_controller.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.tag_selection_menu.reset_tag_menu();

      // Not needed at the moment
      //$('#outline-content').empty();

      // Set selected tags to null, since we just switched to a book
      bible_browser_controller.tab_controller.setCurrentTagIdList(null);
      bible_browser_controller.tab_controller.setCurrentTabBook(book_code, book_title);

      var currentVerseList = bible_browser_controller.getCurrentVerseList();
      bible_browser_controller.book_search.setVerseList(currentVerseList);

      var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
      var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();

      bible_browser_controller.text_loader.requestTextUpdate(currentTabId, currentBook, null, true);
      tags_controller.communication_controller.request_tags();
    });
  };

  this.getCurrentVerseListLoadingIndicator = function() {
    var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();
    var loadingIndicator = currentVerseListComposite.find('.verse-list-loading-indicator');
    return loadingIndicator;
  };

  this.showVerseListLoadingIndicator = function() {
    var loadingIndicator = bible_browser_controller.getCurrentVerseListLoadingIndicator();
    loadingIndicator.find('.loader').show();
    loadingIndicator.show();
  };

  this.hideVerseListLoadingIndicator = function() {
    var loadingIndicator = bible_browser_controller.getCurrentVerseListLoadingIndicator();
    loadingIndicator.hide();
  };

  this.hide_book_menu = function() {
    if (bible_browser_controller.book_menu_is_opened) {
      $('#app-container').find('#book-selection-menu').hide();
      bible_browser_controller.book_menu_is_opened = false;

      var book_button = $('#app-container').find('.book-select-button');
      book_button.removeClass('ui-state-active');
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

  this.updateTagsView = function(tabIndex) {
    tags_controller.clear_verse_selection();
    var currentTabBook = bible_browser_controller.tab_controller.getCurrentTabBook(tabIndex);
    var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList(tabIndex);
    if ((currentTabBook != undefined && currentTabBook != null) || currentTagIdList != null) {
      setTimeout(() => {
        tags_controller.communication_controller.request_tags(currentTabBook);
      }, 200);
    }
  };

  this.handle_body_click = function(event) {
    if($(this).hasClass('verse-selection-menu')) {
      event.stopPropagation();
      return;
    }
    
    bible_browser_controller.hide_book_menu();
    bible_browser_controller.tag_selection_menu.hide_tag_menu();
    bible_browser_controller.hide_display_menu();

    if ($('#currently-edited-notes').length > 0) {
      notes_controller.restore_currently_edited_notes();
    }
  };

  this.handle_book_menu_click = function(event) {
    if ($('.book-select-button').hasClass('ui-state-disabled')) {
      return;
    }

    if (bible_browser_controller.book_menu_is_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.hide_display_menu();
      var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
      var book_button = currentVerseListMenu.find('.book-select-button');
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

  this.handle_display_menu_click = function(event) {
    if (bible_browser_controller.display_menu_is_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
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

  this.bind_events_after_bible_text_loaded = async function() {
    $('.tag-box').filter(":not('.tag-events-configured')").bind('click', tags_controller.clear_verse_selection).addClass('tag-events-configured');
    $('.tag').filter(":not('.tag-events-configured')").bind('click', bible_browser_controller.handle_tag_reference_click).addClass('tag-events-configured');
    $('.verse-box').bind('mouseover', bible_browser_controller.onVerseBoxMouseOver);
  };

  this.getTaggedVerseListBookNumber = function(bibleBookLongTitle) {
    var bibleBookNumber = -1;
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame();
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');

    for (var i = 0; i < bookHeaders.length; i++) {
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();

      if (currentBookHeaderText == bibleBookLongTitle) {
        bibleBookNumber = i + 1;
        break;
      }
    }

    return bibleBookNumber;
  };

  this.onVerseBoxMouseOver = function() {
    var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
    var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList();

    if (currentBook != null) {

      var verseReferenceContent = $(this).find('.verse-reference-content').text();
      var mouseOverChapter = bible_browser_controller.getChapterFromReference(verseReferenceContent);
      bible_browser_controller.navigation_pane.highlightNavElement(mouseOverChapter);

    } else if (currentTagIdList != null) {

      var mouseOverBook = $(this).find('.verse-bible-book-short').text();
      var bibleBookLongTitle = bible_browser_controller.get_book_long_title(mouseOverBook);
      
      var bibleBookNumber = bible_browser_controller.getTaggedVerseListBookNumber(bibleBookLongTitle);
      if (bibleBookNumber != -1) {
        bible_browser_controller.navigation_pane.highlightNavElement(bibleBookNumber);
      }
    }
  };

  this.get_overlay_verse_box_position = function(verse_box) {
    var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();

    var verse_box_position = verse_box.offset();
    var verse_box_class = verse_box.attr('class');
    var verse_nr = parseInt(verse_box_class.match(/verse-nr-[0-9]*/)[0].split('-')[2]);
    var next_verse_nr = verse_nr + 1;

    var next_verse_box = currentVerseListComposite.find('.verse-nr-' + next_verse_nr);
    var next_verse_box_position = next_verse_box.offset();
    if (next_verse_box_position == undefined) {
      next_verse_box_position = verse_box.offset();
    }
    var verse_list_height = currentVerseListComposite.height();
    var verse_list_position = currentVerseListComposite.offset();
    var screen_bottom = verse_list_position.top + verse_list_height;
    var cross_reference_box_height = 240;
    var overlay_box_position = null;

    var appContainerWidth = $(window).width();
    var offsetLeft = appContainerWidth - 700;

    if ((next_verse_box_position.top + cross_reference_box_height) <
        screen_bottom) {
      // The box does fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: next_verse_box_position.top + 7,
        left: offsetLeft
      };
    } else {
      // The box does NOT fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: verse_box_position.top - cross_reference_box_height,
        left: offsetLeft
      };
    }

    return overlay_box_position;
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

    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var currentTabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();

    bible_browser_controller.communication_controller.request_verses_for_selected_tags(
      currentTabIndex,
      currentTabId,
      tag_id,
      bible_browser_controller.render_tagged_verse_list_in_reference_box,
      render_type='html',
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

  this.update_tag_title_in_selection = function(old_title, new_title) {
    var currentTagTitleList = bible_browser_controller.tab_controller.getCurrentTagTitleList();
    if (currentTagTitleList != null) {
      var tag_list = currentTagTitleList.split(', ');
      for (var i = 0; i < tag_list.length; i++) {
        var current_tag = tag_list[i];
        if (current_tag == old_title) {
          tag_list[i] = new_title;
          break;
        }
      }
      bible_browser_controller.tab_controller.setCurrentTagTitleList(tag_list.join(', '));
    }
  };

  this.get_tagged_verses = function() {
    var currentTagIdList = bible_browser_controller.tab_controller.getCurrentTagIdList();
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var currentVerseList = bible_browser_controller.getCurrentVerseList();

    bible_browser_controller.book_search.setVerseList(currentVerseList);

    if (currentTagIdList != "") {
      bible_browser_controller.text_loader.requestTextUpdate(currentTabId, null, currentTagIdList, true);

      tags_controller.communication_controller.request_tags();
      // PORTING DISABLED
      //tags_controller.communication_controller.request_meta_tags();
    }
  };

  this.resetVerseListView = function() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList()[0];
    if (currentVerseList != undefined) {
      while(currentVerseList.firstChild) {
        currentVerseList.removeChild(currentVerseList.firstChild);
      }
    }

    bible_browser_controller.navigation_pane.resetNavigationPane();
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    currentVerseListMenu.find('.export-tagged-verses-button').addClass('ui-state-disabled');
  };

  this.update_verse_list_headline = function() {
    var selected_tags = bible_browser_controller.tag_selection_menu.selected_tag_titles();

    $('#tag-browser-verselist-header-content').html(gettext_strings.bible_verses_tagged_with + ": " + selected_tags);
  };

  this.wrap_book_with_html = function(book_title) {
    return "<div class='tag-browser-verselist-book-header'>" + book_title + "</div>";
  };

  this.show_or_hide_verse_tags_based_on_option = function() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    if (bible_browser_controller.tags_switch_checked()) {
      currentVerseList.removeClass('verse-list-without-tags');
    } else {
      currentVerseList.addClass('verse-list-without-tags');
    }
  };

  this.show_or_hide_verse_notes_based_on_option = function() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    if (bible_browser_controller.verse_notes_switch_checked()) {
      currentVerseList.addClass('verse-list-with-notes');
    } else {
      if ($('#currently-edited-notes').length > 0) {
        // If the user wants to hide the notes the currently edited note
        // has to be restored as well
        notes_controller.restore_currently_edited_notes();
      }
      currentVerseList.removeClass('verse-list-with-notes');
    }
  };

  this.verse_notes_switch_checked = function() {
    return $('#verse-notes-switch').attr('checked');
  };

  this.tags_switch_checked = function() {
    return $('#tags-switch').attr('checked');
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

  this.initApplicationForVerseList = function(tabIndex=undefined) {
    if (tabIndex === undefined) {
      var tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }

    // Disabled notes controller
    //notes_controller.init();
    tags_controller.init(tabIndex);
    bible_browser_controller.navigation_pane.updateNavigation(tabIndex);
    bible_browser_controller.bind_events_after_bible_text_loaded();
    bible_browser_controller.toggle_book_tags_statistics_button();
    tags_controller.bind_tag_events();
  };

  this.toggle_book_tags_statistics_button = async function(index=undefined) {
    var book_tag_statistics_button = $('#show-book-tag-statistics-button');
    if (index === undefined) {
      index = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }

    if (bible_browser_controller.tab_controller.isCurrentTextBook(index)) {
      var tagsCount = await models.Tag.getTagCount();

      if (tagsCount > 0) {
        book_tag_statistics_button.removeClass('ui-state-disabled');
        book_tag_statistics_button.removeClass('events-configured');
      }

      book_tag_statistics_button.bind('click', function() {
        bible_browser_controller.open_book_tag_statistics(); 
      });
      book_tag_statistics_button.show();
    } else {
      book_tag_statistics_button.unbind()
      book_tag_statistics_button.addClass('ui-state-disabled');
      book_tag_statistics_button.addClass('events-configured');
    }

    configure_button_styles('.tags-header');
  };

  this.open_book_tag_statistics = function() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
    var currentBookName = bible_browser_controller.get_book_long_title(currentBook);

    $('#book-tag-statistics-box').dialog({
      position: [verse_list_position.left + 50, verse_list_position.top + 50],
      width: 350,
      title: currentBookName + ' - tag statistics'
    });
  };

  this.sync_sword_modules = async function() {
    var modulesNotInDb = await bible_browser_controller.translation_controller.getLocalModulesNotYetAvailableInDb();

    if (modulesNotInDb.length > 0) {
      var currentVerseList = bible_browser_controller.getCurrentVerseList();
      var verse_list_position = currentVerseList.offset();
      $('#bible-sync-box').dialog({
        position: [verse_list_position.left + 50, verse_list_position.top + 30]
      });

      await bible_browser_controller.translation_controller.syncSwordModules($('#bible-sync-box'));
    }
  };

  this.updateUiAfterBibleTranslationAvailable = function(translationCode) {
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
    if (currentBibleTranslationId == "" || 
        currentBibleTranslationId == null) { // Update UI after a Bible translation becomes available

      bible_browser_controller.tab_controller.setCurrentBibleTranslationId(translationCode);
      bible_browser_controller.translation_controller.updateAvailableBooks();
      bible_browser_controller.translation_controller.enableCurrentTranslationInfoButton();
    }
  }

  this.open_translation_settings_wizard = function() {
    bible_browser_controller.translation_wizard.openWizard();
  };

  this.getChapterFromReference = function(reference) {
    var chapter = Number(reference.split(reference_separator)[0]);
    return chapter;
  };

  this.getVerseFromReference = function(reference) {
    var verse = Number(reference.split(reference_separator)[1]);
    return verse;
  };

  this.jump_to_reference = function(reference, highlight) {
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var chapter = bible_browser_controller.getChapterFromReference(reference);
    var verse = bible_browser_controller.getVerseFromReference(reference);

    var uniqueReference = '#' + currentTabId + ' ' + chapter + ':' + verse;

    if (chapter == 1 && verse < 5) {
      var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();
      currentVerseListComposite[0].scrollTop = 0;
    } else {
      window.location = uniqueReference;
    }

    bible_browser_controller.navigation_pane.highlightNavElement(chapter);

    /*if (highlight) { // FIXME
      original_verse_box.glow();
    }*/
  };

  this.enableTaggedVersesExportButton = function(tabIndex) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var exportButton = currentVerseListMenu.find('.export-tagged-verses-button');
    exportButton.removeClass('ui-state-disabled');
    exportButton.unbind('click');
    exportButton.bind('click', function() {
      bible_browser_controller.taggedVerseExport.runExport();
    });
    exportButton.show();
    exportButton.removeClass('events-configured');
    configure_button_styles('.verse-list-menu');
  }
}
 

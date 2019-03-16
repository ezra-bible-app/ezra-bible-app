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

const app = require('electron').remote.app;
var userDataDir = app.getPath('userData');
const models = require('./models')(userDataDir);
const settings = require('electron-settings');
var Mousetrap = require('mousetrap');

current_section_start_toolbox = null;
current_section_end_toolbox = null;

bible_browser_controller = null;
tags_controller = null;

last_highlighted_listpoint = null;

current_bible_translation_id = '';
reference_separator = ':';

$.create_xml_doc = function(string)
{
  var doc;

  if ($.browser.msie) {
    doc = new ActiveXObject('Microsoft.XMLDOM');
    doc.async = 'false'
    doc.loadXML(string);
  } else {
    doc = (new DOMParser()).parseFromString(string, 'text/xml');
  }

  return doc;
}

String.prototype.trim = function() {
  var s = this;
  s = s.replace(/(^\s*)|(\s*$)/gi,"");
  s = s.replace(/[ ]{2,}/gi," ");
  s = s.replace(/\n /,"\n");
  return s;
}

function format_passage_reference_for_view(book_short_title, start_reference, end_reference)
{
  // This first split is necessary, because there's a verse list id in the anchor that we do not
  // want to show
  start_reference = start_reference.split(" ")[1];
  end_reference = end_reference.split(" ")[1];

  var start_chapter = start_reference.split(reference_separator)[0];
  var start_verse = start_reference.split(reference_separator)[1];
  var end_chapter = end_reference.split(reference_separator)[0];
  var end_verse = end_reference.split(reference_separator)[1];

  var passage = start_chapter + reference_separator + start_verse;

  if (start_verse == "1" &&
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
}

function format_verse_reference(chapter, verse_nr)
{
  return chapter + reference_separator + verse_nr;
}

function adapt_verse_list() {
  var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();
  var currentVerseListFrame = currentVerseListComposite.find('.verse-list-frame');
  if (currentVerseListFrame.width() < 650) {
    currentVerseListFrame.addClass('verse-list-frame-small-screen');
  } else {
    currentVerseListFrame.removeClass('verse-list-frame-small-screen');
  }
}

function resize_app_container(e) {
  var new_app_container_height = $(window).height();
  $("#app-container").css("height", new_app_container_height);

  $('#tags-view, #notes-view, #xrefs-view').css('height', new_app_container_height - 110);
  $('.verse-list-frame').css('height', new_app_container_height - 100);
  $('.chapter-navigation').css('height', new_app_container_height - 100);

  // Meta Tag stuff disabled for now
  //$('#meta-tag-content, #meta-tag-assigned-tags').css('height', (new_app_container_height - 280) * 0.3);
  $('#tags-content-global').css('height', new_app_container_height - 175);

  // Book tags disabled
  //$('#tags-content-book').css('height', new_app_container_height - 220);

  // Notes disabled
  // $('#general-notes-textarea').css('height', new_app_container_height - 210);

  $('#tag-browser-taglist').css('height', new_app_container_height - 110);
  $('#tag-browser-taglist-global, #tag-browser-taglist-book').css('height', new_app_container_height - 170);

  adapt_verse_list();
}

function reference_to_absolute_verse_nr(bible_book, chapter, verse)
{
  var verse_nr = 0;

  for (var i = 0; i < chapter - 1; i++) {
    if (bible_chapter_verse_counts[bible_book][i] != undefined) {
      verse_nr += bible_chapter_verse_counts[bible_book][i];
    }
  }
  
  verse_nr += Number(verse);
  return verse_nr;
}

function reference_to_verse_nr(bible_book_short_title, reference, split_support)
{
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

  verse_nr = reference_to_absolute_verse_nr(bible_book_short_title, ref_chapter, ref_verse);
  if (split_support) verse_nr += 0.5;

  return verse_nr;
}

function verse_nr_to_reference(verse_nr)
{
  var bible_book_short_title = bible_browser_controller.tab_controller.getCurrentTabBook();

  var chapter = 0;
  var rest_verse_nr = verse_nr;
  var reference = "";
  
  var book_chapter_count = 0;
  for (var key in bible_chapter_verse_counts[bible_book_short_title]) {
    if (key != 'nil') {
      book_chapter_count += 1;
    }
  }

  for (var i = 0; i < book_chapter_count - 1; i++) {
    current_chapter_verse_count = bible_chapter_verse_counts[bible_book_short_title][i];
    
    if (rest_verse_nr - current_chapter_verse_count <= 0) {
      reference = i + reference_separator + rest_verse_nr; 
      break;
    } else {
      rest_verse_nr -= current_chapter_verse_count;
    }
  }

  return reference;
}

function get_book_chapter_count(book_short_title)
{
  var book_chapter_count = 0;
  for (var key in bible_chapter_verse_counts[book_short_title]) {
    if (key != 'nil') {
      book_chapter_count += 1;
    }
  }

  return book_chapter_count;
}

function get_book_chapter_verse_count(book_short_title, chapter)
{
    var chapter_verse_count = bible_chapter_verse_counts[book_short_title][chapter - 1];
    return chapter_verse_count;
}

function romanize(num)
{
  if (!num)
    return false;

  var	digits = String(+num).split("");

  var key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
             "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
             "","I","II","III","IV","V","VI","VII","VIII","IX"];

  var roman = "";
  var i = 3;

  while (i--)
    roman = (key[+digits.pop() + (i * 10)] || "") + roman;

  return Array(+digits.join("") + 1).join("M") + roman;
}

function alphabetize(num, small_chars)
{
  if (!num || num > 676)
    return num;

  var rounds = Math.floor(num / 26);
  var rest = num % 26;
  if (rest == 0) rest = 26;
  var prefix = "";

  if (num > 26) {
    prefix += get_char_from_number(rounds);
  }

  num = rest;

  converted_char = prefix + get_char_from_number(num, small_chars);

  return converted_char;
}

function get_char_from_number(num, small_chars)
{
  var offset = 64;
  if (small_chars) {
    offset = 96;
  }

  var char_code = num + offset;
  var converted_char = String.fromCharCode(char_code);

  return converted_char;
}

function initUi()
{
  // Setup resizable function for divider between tags toolbox and verse list
  $('#bible-browser-toolbox').resizable({
    handles: 'e',
    resize: function(event, ui) {
      adapt_verse_list();
    },
    stop: function(event, ui) {
      //console.log("Saving new tag list width: " + ui.size.width);
      bible_browser_controller.settings.set('tag_list_width', ui.size.width);
    }
  });

  $('.chapter-select').attr('disabled','disabled');

  tags_controller.init_ui();

  $('#show-translation-settings-button').bind('click', function() {
    bible_browser_controller.open_translation_settings_wizard(); 
  });

  configure_button_styles();

  $('#main-content').fadeIn(500);
  resize_app_container();

  $(window).bind("resize", handle_window_resize);
}

function handle_bible_translation_change()
{
  current_bible_translation_id = $(this).val();
  settings.set('bible_translation', current_bible_translation_id);

  updateAvailableBooks();
  initChapterVerseCounts();

  var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
  var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();

  if (currentBook != null) {
    bible_browser_controller.communication_controller.request_book_text(
      currentTabId,
      currentBook,
      bible_browser_controller.render_book_text_and_init_app);
  }

  if (bible_browser_controller.current_tag_title_list != null) {
    bible_browser_controller.communication_controller.request_verses_for_selected_tags(
      bible_browser_controller.current_tag_id_list,
      bible_browser_controller.render_tagged_verse_list,
      renderVerseMetaInfo=true
    );
  }
}

function handle_window_resize()
{
  resize_app_container();
  adapt_verse_list();
}

function configure_button_styles(context = null)
{
  if (context == null) {
    context = document;
  }

  $(".fg-button:not(.ui-state-disabled, .events-configured)", context).hover(
    function(){ 
      $(this).addClass("ui-state-hover"); 
    },
    function(){ 
      $(this).removeClass("ui-state-hover"); 
    }
  )
  .mousedown(function(){
    handle_fg_button_mousedown(this, true);
  })
  .mouseup(function(){
    if(! $(this).is('.fg-button-toggleable, .fg-buttonset-single .fg-button,  .fg-buttonset-multi .fg-button') ){
      $(this).removeClass("ui-state-active");
    }
  }).addClass('events-configured');

  $(".fg-button", context).find("input:not('.events-configured')").mousedown(function(e) {
    if ($(this).attr('type') == 'checkbox') {
      e.stopPropagation();
      handle_fg_button_mousedown($(this).parent(), false);
    }
  }).addClass('events-configured');
}

function handle_fg_button_mousedown(element, click_checkbox) {
  $(element).parents('.fg-buttonset-single:first').find(".fg-button.ui-state-active").removeClass("ui-state-active");
  if ($(element).is('.ui-state-active.fg-button-toggleable, .fg-buttonset-multi .ui-state-active')) {
    $(element).removeClass("ui-state-active");
  } else { 
    $(element).addClass("ui-state-active");
  }

  if (click_checkbox) {
    var embedded_input = $(element).find('input:first');

    if (embedded_input.attr('type') == 'checkbox') {
      embedded_input[0].click();
    }
  }
}

async function initTranslationsMenu()
{

  var languages = await models.BibleTranslation.getLanguages();
  var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
  var bibleSelect = currentVerseListMenu.find('select.bible-select');
  bibleSelect.empty();

  for (var i = 0; i < languages.length; i++) {
    var currentLang = languages[i];

    var newOptGroup = "<optgroup class='bible-select-" + currentLang + "-translations' label='" + currentLang + "'></optgroup>";
    bibleSelect.append(newOptGroup);
  }

  models.BibleTranslation.findAndCountAll().then(result => {
    console.log("Found " + result.count + " bible translations!");

    var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();

    if (result.count == 0) {
      bibleSelect.attr('disabled','disabled');
      $('.book-select-button').addClass('ui-state-disabled');
      var currentVerseList = bible_browser_controller.getCurrentVerseList();
      currentVerseList.find('.help-text').text(gettext_strings.help_text_no_translations);
    } else if (currentBook == null && bible_browser_controller.current_tag_id_list == "")  {
      $('.book-select-button').removeClass('ui-state-disabled');
      var currentVerseList = bible_browser_controller.getCurrentVerseList();
      currentVerseList.find('.help-text').text(gettext_strings.help_text_translation_available);
    }

    for (var translation of result.rows) {
      var selected = '';
      if (current_bible_translation_id == translation.id) {
        var selected = ' selected=\"selected\"';
      }

      var current_translation_html = "<option value='" + translation.id + "'" + selected + ">" + translation.name + "</option>"
      var optGroup = bibleSelect.find('.bible-select-' + translation.language + '-translations');
      optGroup.append(current_translation_html);
    }

    bibleSelect.selectmenu({
      change: handle_bible_translation_change,
      maxHeight: 400
    });
  });
}

function toggle_loading_indicator(text) {
  if (text != undefined) {
    $('.main-loading-indicator-label').html(text);
  }

  $('.main-loading-indicator').toggle();
}

function bind_click_to_checkbox_labels()
{
  $('.clickable-checkbox-label:not(.events-configured)').bind('click', function() {
    var closest_input = $(this).prevAll('input:first');

    if (closest_input.attr('type') == 'checkbox') {
      closest_input[0].click();
    }
  }).addClass('events-configured');
}

function initController()
{
  bible_browser_controller = new BibleBrowserController;
  bible_browser_controller.init(settings);

  tags_controller = new TagsController;
  tags_controller.init();

  // Disabled notes controller
  //notes_controller = new NotesController;
}

function unbind_events()
{
  var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame();
  currentVerseListFrame.find('div').unbind();
}

function updateAvailableBooks()
{
  models.BibleTranslation.getBookList(current_bible_translation_id).then(books => {
    var book_links = $('#book-selection-menu').find('li');

    for (var i = 0; i < book_links.length; i++) {
      var current_book_link = $(book_links[i]);
      var current_link_book = current_book_link.attr('class').split(' ')[0];
      var current_book_id = current_link_book.split('-')[1];
      if (books.includes(current_book_id)) {
        current_book_link.removeClass('book-unavailable');
        current_book_link.addClass('book-available');
      } else {
        current_book_link.addClass('book-unavailable');
        current_book_link.removeClass('book-available');
      }
    }
  });
}

function initChapterVerseCounts()
{
  return models.BibleBook.getChapterVerseCounts(current_bible_translation_id).then(verseCountEntries => {
    var lastBook = null;

    for (var entry of verseCountEntries) {
      var currentBook = entry.shortTitle;

      if (currentBook != lastBook) {
        bible_chapter_verse_counts[currentBook] = [];
      }

      var current_chapter = entry.verseCount;
      bible_chapter_verse_counts[currentBook].push(current_chapter);

      lastBook = currentBook;
    }
  });
}

function loadSettings()
{
  if (settings.has('bible_translation')) {
    current_bible_translation_id = settings.get('bible_translation');
  }

  models.BibleTranslation.findAndCountAll().then(result => {
    if (!settings.has('bible_translation') && result.rows.length > 0) {
      current_bible_translation_id = result.rows[0].id;
    }

    updateAvailableBooks();
    initChapterVerseCounts();
    bible_browser_controller.bibleTranslationCount = result.count;
    bible_browser_controller.loadSettings();
  });
}

$(document).ready(function() {
  console.log("Initializing controllers ...");
  initController();

  console.log("Initializing UI ...");
  initUi();

  console.log("Loading settings ...");
  loadSettings();
});


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
const DbHelper = require('./app/db_helper.js');
const i18n = require('i18next');
const I18nHelper = require('./app/i18n_helper.js');
const i18nHelper = new I18nHelper();

require('log-timestamp');

var models = null;
bible_browser_controller = null;
tags_controller = null;
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

function getLineBreak() {
  if (process.platform === 'win32') {
    return "\r\n";
  } else {
    return "\n";
  }
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
  var new_app_container_height = $(window).height() - 10;
  $("#app-container").css("height", new_app_container_height);

  $('#tags-view, #notes-view, #xrefs-view').css('height', new_app_container_height - 110);
  $('.verse-list-frame').css('height', new_app_container_height - 110);
  $('.navigation-pane').css('height', new_app_container_height - 110);
  $('#tags-content-global').css('height', new_app_container_height - 145);

  // Book tags disabled
  //$('#tags-content-book').css('height', new_app_container_height - 220);

  // Notes disabled
  // $('#general-notes-textarea').css('height', new_app_container_height - 210);

  $('#tag-browser-taglist').css('height', new_app_container_height - 110);
  $('#tag-browser-taglist-global, #tag-browser-taglist-book').css('height', new_app_container_height - 140);

  adapt_verse_list();
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

async function initI18N()
{
  await i18nHelper.init();
  //await i18n.changeLanguage('de');

  reference_separator = i18n.t('general.chapter-verse-separator');
  $("body").localize();
  localizeBookSelectionMenu();
}

function localizeBookSelectionMenu()
{
  var i18nHelper = new I18nHelper();
  var aElements = $("#book-selection-menu").find('a');
  for (var i = 0; i < aElements.length; i++) {
    var currentBook = $(aElements[i]);
    var currentBookTranslation = i18nHelper.getSwordTranslation(currentBook.text());
    currentBook.text(currentBookTranslation);
  }
}

async function initDatabase()
{
  var userDataDir = app.getPath('userData');
  var dbHelper = new DbHelper(userDataDir);
  var dbDir = dbHelper.getDatabaseDir();

  await dbHelper.initDatabase(dbDir);
  models = require('./models')(dbDir);
}

async function initControllers()
{
  bible_browser_controller = new BibleBrowserController();
  await bible_browser_controller.init();

  tags_controller = new TagsController();
  tags_controller.init();

  // Disabled notes controller
  //notes_controller = new NotesController;
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

  // Open links classified as external in the default web browser
  $('body').on('click', 'a.external', (event) => {
    event.preventDefault();
    let link = event.target.href;
    require("electron").shell.openExternal(link);
  });

  $('#show-translation-settings-button').bind('click', function() {
    bible_browser_controller.open_translation_settings_wizard(); 
  });

  tags_controller.init_ui();
  configure_button_styles();
  resize_app_container();
  $(window).bind("resize", handle_window_resize);
}

async function initApplication()
{
  var applicationLoaded = false;
  var loadingIndicator = $('#startup-loading-indicator');

  setTimeout(() => {
    if (!applicationLoaded) {
      loadingIndicator.show();
      loadingIndicator.find('.loader').show();
    }
  }, 500);

  console.log("Initializing database ...");
  await initDatabase();

  console.log("Initializing i18n ...");
  await initI18N();

  console.log("Initializing controllers ...");
  await initControllers();

  console.log("Initializing user interface ...");
  initUi();
  $('#main-content').show();

  console.log("Syncing sword modules ...");
  await bible_browser_controller.sync_sword_modules();

  console.log("Loading settings ...");
  bible_browser_controller.loadSettings();

  applicationLoaded = true;
  loadingIndicator.hide();
}

function unbind_events()
{
  var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame();
  currentVerseListFrame.find('div').unbind();
}

$(document).ready(function() {
  initApplication();
});

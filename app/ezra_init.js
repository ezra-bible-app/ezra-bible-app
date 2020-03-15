/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const app = require('electron').remote.app;

// i18n
const i18n = require('i18next');
const I18nHelper = require('./app/helpers/i18n_helper.js');
const i18nHelper = new I18nHelper();

// This module checks for new releases on startup
const NewReleaseChecker = require('./app/helpers/new_release_checker.js');

// DB-related stuff
const DbHelper = require('./app/helpers/db_helper.js');
const userDataDir = app.getPath('userData');
const dbHelper = new DbHelper(userDataDir);
const dbDir = dbHelper.getDatabaseDir();

// Global instance of NodeSwordInterface used in many places
const NodeSwordInterface = require('node-sword-interface');
const nsi = new NodeSwordInterface();

// This module will modify the standard console.log function and add a timestamp as a prefix for all log calls
require('log-timestamp');

var models = null;
var bible_browser_controller = null;
var tags_controller = null;
var reference_separator = ':';
var app_container_height = null;
var bible_chapter_verse_counts = {};

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

function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function getLineBreak() {
  if (process.platform === 'win32') {
    return "\r\n";
  } else {
    return "\n";
  }
}

function sleep(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

function adapt_verse_list(verseListFrame=undefined) {
  if (verseListFrame === undefined) {
    verseListFrame = bible_browser_controller.getCurrentVerseListFrame();
  }
  
  if (verseListFrame.width() < 650) {
    verseListFrame.addClass('verse-list-frame-small-screen');
  } else {
    verseListFrame.removeClass('verse-list-frame-small-screen');
  }
}

// FIXME: Optimize this to be tab-specific
function resize_app_container(e) {
  app_container_height = $(window).height() - 10;
  $("#app-container").css("height", app_container_height);
  // Notes disabled
  // $('#general-notes-textarea').css('height', new_app_container_height - 210);

  var tagsToolBarHeight = $('#tags-toolbar').height();

  if (bible_browser_controller.optionsMenu.strongsSwitchChecked()) {
    $('#tags-content-global').css('height', app_container_height - tagsToolBarHeight - 415);
    $('#dictionary-info-box-panel').css('height', 302);
  } else {
    $('#tags-content-global').css('height', app_container_height - tagsToolBarHeight - 55);
  }

  if (e === undefined) {
    // If there was no event then we don't react after the window was resized
    resize_verse_list();
  } else {
    // If the window was resized we get an event. In this case we need to resize all verse lists in all tabs
    var tabCount = bible_browser_controller.tab_controller.getTabCount();
    for (var i = 0; i < tabCount; i++) {
      resize_verse_list(i);
    }
  }
}

function resize_verse_list(tabIndex=undefined) {
  if (tabIndex === undefined) {
    tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
  }

  var verseListComposite = bible_browser_controller.getCurrentVerseListComposite(tabIndex);
  var navigationPane = verseListComposite.find('.navigation-pane');
  var verseListFrame = verseListComposite.find('.verse-list-frame');

  var newVerseListHeight = app_container_height - 135;
  navigationPane.css('height', newVerseListHeight);
  verseListFrame.css('height', newVerseListHeight);

  adapt_verse_list(verseListFrame);
}

function configure_button_styles(context = null)
{
  if (context == null) {
    context = document;
  } else {
    var context = document.querySelector(context);
  }

  var buttons = context.querySelectorAll('.fg-button');

  for (var i = 0; i < buttons.length; i++) {
    var currentButton = buttons[i];
    var currentButtonClasses = currentButton.classList;

    if (!currentButtonClasses.contains("ui-state-disabled") && !currentButtonClasses.contains("events-configured")) {
      currentButton.addEventListener('mouseover', function(e) {
        $(e.target).closest('.fg-button').addClass('ui-state-hover');
      });

      currentButton.addEventListener('mouseout', function(e) {
        $(e.target).closest('.fg-button').removeClass('ui-state-hover');
      });

      currentButton.addEventListener('mousedown', function(e) {
        handle_fg_button_mousedown($(e.target).closest('.fg-button'), e.target.nodeName != 'INPUT');
      });

      currentButton.addEventListener('mouseup', function(e) {
        if(!$(e.target).closest('.fg-button').is('.fg-button-toggleable, .fg-buttonset-single .fg-button,  .fg-buttonset-multi .fg-button') ){
          $(e.target).closest('.fg-button').removeClass("ui-state-active");
        }
      });

      currentButton.classList.add('events-configured');
    }
  }
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
  $(document).localize();
  localizeBookSelectionMenu();
}

function localizeBookSelectionMenu()
{
  var aElements = $("#book-selection-menu").find('a');
  for (var i = 0; i < aElements.length; i++) {
    var currentBook = $(aElements[i]);
    var currentBookTranslation = i18nHelper.getSwordTranslation(currentBook.text());
    currentBook.text(currentBookTranslation);
  }
}

async function initDatabase()
{
  await dbHelper.initDatabase(dbDir);
  models = require('./models')(dbDir);
}

async function initControllers()
{
  bible_browser_controller = new BibleBrowserController();
  await bible_browser_controller.init();

  tags_controller = new TagsController();
  // Disabled notes controller
  //notes_controller = new NotesController;
}

function isMac()
{
  return navigator.platform.match('Mac') !== null;
}

function initUi()
{
  if (isMac()) {
    document.body.classList.add('OSX');
  }

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
  $('body').on('click', 'a.external, p.external a', (event) => {
    event.preventDefault();
    let link = event.target.href;
    require("electron").shell.openExternal(link);
  });

  $('#show-translation-settings-button').bind('click', function() {
    bible_browser_controller.openTranslationSettingsWizard(); 
  });

  tags_controller.init_ui();
  configure_button_styles();
  resize_app_container();
  $(window).bind("resize", resize_app_container);
}

async function initApplication()
{
  //console.time("application-startup");
  var applicationLoaded = false;
  var loadingIndicator = $('#startup-loading-indicator');

  setTimeout(() => {
    if (!applicationLoaded) {
      loadingIndicator.show();
      loadingIndicator.find('.loader').show();
    }
  }, 1000);

  console.log("Initializing i18n ...");
  await initI18N();

  console.log("Initializing database ...");
  await initDatabase();

  console.log("Initializing controllers ...");
  await initControllers();

  console.log("Initializing user interface ...");
  initUi();

  // Show main content
  $('#main-content').show();

  await bible_browser_controller.translation_controller.installStrongsIfNeeded();

  console.log("Loading settings ...");
  bible_browser_controller.loadSettings();

  console.log("Checking for latest release ...");
  var newReleaseChecker = new NewReleaseChecker('new-release-info-box');
  newReleaseChecker.check();

  applicationLoaded = true;
  loadingIndicator.hide();
  //console.timeEnd("application-startup");
}

$(document).ready(function() {
  initApplication();
});

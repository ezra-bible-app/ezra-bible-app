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
nsi.enableMarkup();

// UI Helper
const UiHelper = require('./app/helpers/ui_helper.js');
const uiHelper = new UiHelper();

// This module will modify the standard console.log function and add a timestamp as a prefix for all log calls
require('log-timestamp');

var models = null;
var bible_browser_controller = null;
var tags_controller = null;
var reference_separator = ':';
var app_container_height = null;
var bible_chapter_verse_counts = {};

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

function sleep(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

$.create_xml_doc = function(string)
{
  var doc = (new DOMParser()).parseFromString(string, 'text/xml');
  return doc;
}

async function initI18N()
{
  await i18nHelper.init();
  //await i18n.changeLanguage('de');

  reference_separator = i18n.t('general.chapter-verse-separator');
  $(document).localize();
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
      uiHelper.adaptVerseList();
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

  tags_controller.init_ui();
  uiHelper.configureButtonStyles();
  uiHelper.resizeAppContainer();
  $(window).bind("resize", () => { uiHelper.resizeAppContainer(); });
}

function showGlobalLoadingIndicator() {
  $('#main-content').hide();
  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.show();
  loadingIndicator.find('.loader').show();
}

function hideGlobalLoadingIndicator() {
  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.hide();
  $('#main-content').show();
}

function switchToDarkTheme() {
  switchToTheme('css/jquery-ui/dark-hive/jquery-ui.css');
  bible_browser_controller.notes_controller.setDarkTheme();
}

function switchToRegularTheme() {
  switchToTheme('css/jquery-ui/cupertino/jquery-ui.css');
  bible_browser_controller.notes_controller.setLightTheme();
}

function switchToTheme(theme) {
  var currentTheme = document.querySelector("#theme-css").href;

  if (currentTheme.indexOf(theme) == -1) { // Only switch the theme if it is different from the current theme
    document.querySelector("#theme-css").href = theme;
  }
}

function initNightMode() {
  var useNightMode = false;

  if (bible_browser_controller.settings.has('useNightMode')) {
    useNightMode = bible_browser_controller.settings.get('useNightMode');

    if (useNightMode) {
      console.log("Initializing night mode ...");
      bible_browser_controller.optionsMenu.useNightModeBasedOnOption(true);
    }
  }
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
  }, 500);

  console.log("Initializing i18n ...");
  await initI18N();

  console.log("Initializing database ...");
  await initDatabase();

  console.log("Initializing controllers ...");
  await initControllers();

  console.log("Initializing user interface ...");
  initUi();

  initNightMode();

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

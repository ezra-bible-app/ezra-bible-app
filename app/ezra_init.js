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

require('v8-compile-cache');

const app = require('electron').remote.app;
const { remote, ipcRenderer } = require('electron');
const isDev = require('electron-is-dev');

if (isDev) {
  global.Sentry = {
    addBreadcrumb: function() {},
    Severity: {
      Info: undefined
    }
  }
}

// i18n
let i18n = null;
let I18nHelper = null;
let i18nHelper = null;

// DB-related stuff
let dbHelper = null;
let dbDir = null;

// Global instance of NodeSwordInterface used in many places
let nsi = null;

// UI Helper
const UiHelper = require('./app/helpers/ui_helper.js');
const uiHelper = new UiHelper();

// Platform Helper
const PlatformHelper = require('./app/helpers/platform_helper.js');
const ThemeController = require('./app/controllers/theme_controller.js');
const platformHelper = new PlatformHelper();

let models = null;
let app_controller = null;
let tags_controller = null;
let theme_controller = new ThemeController();
let reference_separator = ':';
let bible_chapter_verse_counts = {};

function sleep(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

function waitUntilIdle() {
  return new Promise(resolve => {
    window.requestIdleCallback(() => {
      resolve();
    });
  });
}

// based on https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

$.create_xml_doc = function(string)
{
  var doc = (new DOMParser()).parseFromString(string, 'text/xml');
  return doc;
}

async function initI18N()
{
  i18n = require('i18next');
  I18nHelper = require('./app/helpers/i18n_helper.js');
  i18nHelper = new I18nHelper();

  await i18nHelper.init();
  // await i18n.changeLanguage('de');

  if (platformHelper.isTest()) { // Use English for test mode
    await i18n.changeLanguage('en');
  }

  reference_separator = i18n.t('general.chapter-verse-separator');
  $(document).localize();
}

function initNSI()
{
  const NodeSwordInterface = require('node-sword-interface');

  if (platformHelper.isTest()) {
    const userDataDir = app.getPath('userData');
    nsi = new NodeSwordInterface(userDataDir);
  } else {
    nsi = new NodeSwordInterface();
  }

  nsi.enableMarkup();
}

async function initDatabase()
{
  const DbHelper = require('./app/helpers/db_helper.js');
  const userDataDir = app.getPath('userData');
  dbHelper = new DbHelper(userDataDir);
  dbDir = dbHelper.getDatabaseDir();

  await dbHelper.initDatabase(dbDir);
  models = require('./models')(dbDir);
}

async function initControllers()
{
  const AppController = require('./app/controllers/app_controller.js');
  const TagsController = require('./app/controllers/tags_controller.js');

  app_controller = new AppController();
  await app_controller.init();

  tags_controller = new TagsController();
}

function initUi()
{
  platformHelper.addPlatformCssClass();

  // Setup resizable function for divider between tags toolbox and verse list
  $('#bible-browser-toolbox').resizable({
    handles: 'e',
    resize: function(event, ui) {
      uiHelper.adaptVerseList();
    },
    stop: function(event, ui) {
      //console.log("Saving new tag list width: " + ui.size.width);
      app_controller.settings.set('tag_list_width', ui.size.width);
    }
  });

  tags_controller.init_ui();
  uiHelper.configureButtonStyles();
  $(window).bind("resize", () => { uiHelper.resizeAppContainer(); });
}

function initExternalLinkHandling() {
  // Open links classified as external in the default web browser
  $('body').on('click', 'a.external, p.external a, div.external a', (event) => {
    event.preventDefault();
    let link = event.target.href;
    require("electron").shell.openExternal(link);
  });
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

function earlyHideToolBar() {
  var settings = require('electron-settings');

  if (!settings.get('showToolBar')) {
    $('#bible-browser-toolbox').hide();
  }
}

function loadScript(src)
{
  var script = document.createElement('script');
  script.src = src;
  document.getElementsByTagName('head')[0].appendChild(script);
}

// This function loads the content of html fragments into the divs in the app-container
function loadFragment(filePath, elementId) {
  const path = require('path');
  const fs = require('fs');

  var absoluteFilePath = path.join(__dirname, filePath);
  var fileContent = fs.readFileSync(absoluteFilePath);
  document.getElementById(elementId).innerHTML = fileContent;
}

function loadHTML()
{
  loadFragment('html/book_selection_menu.html',           'book-selection-menu');
  loadFragment('html/tag_selection_menu.html',            'tag-selection-menu');
  loadFragment('html/bible_browser_toolbox.html',         'bible-browser-toolbox');
  loadFragment('html/module_settings_wizard.html',        'module-settings-wizard');
  loadFragment('html/tab_search_form.html',               'tab-search');
  loadFragment('html/module_search_menu.html',            'module-search-menu');
  loadFragment('html/display_options_menu.html',          'display-options-menu');
  loadFragment('html/verse_list_tabs.html',               'verse-list-tabs');
  loadFragment('html/boxes.html',                         'boxes');
}

function toggleFullScreen()
{
  var window = remote.getCurrentWindow();

  if (window.isFullScreen()) {
    window.setFullScreen(false);
  } else {
    window.setFullScreen(true);
  }
}

async function initApplication()
{
  console.time("application-startup");
  theme_controller.earlyInitNightMode();

  // Wait for the UI to render
  await waitUntilIdle();

  await ipcRenderer.send('manageWindowState');
  
  const appWindow = remote.getCurrentWindow();
  appWindow.show();

  // This module will modify the standard console.log function and add a timestamp as a prefix for all log calls
  require('log-timestamp');

  console.log("Loading HTML fragments");
  loadHTML();

  earlyHideToolBar();
  initExternalLinkHandling();

  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.show();

  if (platformHelper.isWin()) {
    if (!platformHelper.isWindowsTenOrLater()) {
      var vcppRedistributableNeeded = platformHelper.showVcppRedistributableMessageIfNeeded();
      if (vcppRedistributableNeeded) {
        return;
      }
    }
  }

  loadingIndicator.find('.loader').show();

  console.log("Initializing i18n ...");
  await initI18N();

  console.log("Initializing node-sword-interface ...");
  initNSI();

  console.log("Initializing database ...");
  await initDatabase();

  console.log("Initializing controllers ...");
  await initControllers();

  console.log("Initializing user interface ...");
  initUi();
  app_controller.optionsMenu.init();
  theme_controller.initNightMode();

  // Wait for the UI to render
  await waitUntilIdle();

  console.log("Loading settings ...");
  await app_controller.loadSettings();

  // Wait for the UI to render, before we hide the loading indicator
  await waitUntilIdle();
  loadingIndicator.hide();

  // Show main content
  $('#main-content').show();
  uiHelper.resizeAppContainer();

  console.timeEnd("application-startup");

  await app_controller.translation_controller.installStrongsIfNeeded();

  console.log("Checking for latest release ...");
  const NewReleaseChecker = require('./app/helpers/new_release_checker.js');
  var newReleaseChecker = new NewReleaseChecker('new-release-info-box');
  newReleaseChecker.check();
}

$(document).ready(function() {
  initApplication();
});

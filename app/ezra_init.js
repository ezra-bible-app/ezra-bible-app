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

require('v8-compile-cache');

const app = require('electron').remote.app;
const { remote, ipcRenderer } = require('electron');

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

let models = null;
let bible_browser_controller = null;
let tags_controller = null;
let reference_separator = ':';
let bible_chapter_verse_counts = {};

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

  reference_separator = i18n.t('general.chapter-verse-separator');
  $(document).localize();
}

function initNSI()
{
  const NodeSwordInterface = require('node-sword-interface');
  nsi = new NodeSwordInterface();
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
  const BibleBrowserController = require('./app/bible_browser/bible_browser_controller.js');
  const TagsController = require('./app/tags/tags_controller.js');

  bible_browser_controller = new BibleBrowserController();
  await bible_browser_controller.init();

  tags_controller = new TagsController();
}

function isMac()
{
  return navigator.platform.match('Mac') !== null;
}

function isLinux()
{
  return navigator.platform.match('Linux') !== null;
}

function isWin()
{
  return navigator.platform.match('Win') !== null;
}

function initUi()
{
  if (isMac()) {
    document.body.classList.add('OSX');
  } else if (isLinux()) {
    document.body.classList.add('Linux');
  } else if (isWin()) {
    document.body.classList.add('Windows');
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
  var currentTheme = document.getElementById("theme-css").href;

  if (currentTheme.indexOf(theme) == -1) { // Only switch the theme if it is different from the current theme
    document.getElementById("theme-css").href = theme;
  }
}

function earlyInitNightMode() {
  var useDarkMode = false;

  if (isMac()) {
    const nativeTheme = require('electron').remote.nativeTheme;

    if (nativeTheme.shouldUseDarkColors) {
      useDarkMode = true;
    }
  } else {
    var settings = require('electron-settings');

    if (settings.get('useNightMode')) {
      useDarkMode = true;
    }
  }

  if (useDarkMode) {
    document.body.classList.add('darkmode--activated');
  }
}

function earlyHideToolBar() {
  var settings = require('electron-settings');

  if (!settings.get('showToolBar')) {
    $('#bible-browser-toolbox').hide();
  }
}

function initNightMode() {
  if (isMac()) { // On macOS we initialize night mode based on the system settings

    const nativeTheme = require('electron').remote.nativeTheme;

    // Set up a listener to react when the native theme has changed
    nativeTheme.on('updated', () => {
      if (nativeTheme.shouldUseDarkColors != bible_browser_controller.optionsMenu.nightModeSwitchChecked()) {
        showGlobalLoadingIndicator();

        setTimeout(() => {
          bible_browser_controller.optionsMenu.toggleDarkModeIfNeeded();
        }, 100);
      }
    });

    if (nativeTheme.shouldUseDarkColors != bible_browser_controller.optionsMenu.nightModeSwitchChecked()) {
      console.log("Initializing night mode based on system settings ...");
      bible_browser_controller.optionsMenu.toggleDarkModeIfNeeded();
    }

  } else { // On other systems we initialize night mode based on the application settings

    if (bible_browser_controller.settings.has('useNightMode')) {
      var useNightMode = bible_browser_controller.settings.get('useNightMode');
  
      if (useNightMode) {
        console.log("Initializing night mode based on app settings ...");
        bible_browser_controller.optionsMenu.useNightModeBasedOnOption(true);
      }
    }
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
  loadFragment('html/translation_settings_wizard.html',   'translation-settings-wizard');
  loadFragment('html/tab_search_form.html',               'tab-search');
  loadFragment('html/module_search_menu.html',            'module-search-menu');
  loadFragment('html/display_options_menu.html',          'display-options-menu');
  loadFragment('html/verse_list_tabs.html',               'verse-list-tabs');
  loadFragment('html/boxes.html',                         'boxes');
}

async function initApplication()
{
  console.time("application-startup");
  earlyInitNightMode();

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

  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.show();
  loadingIndicator.find('.loader').show();

  console.log("Initializing i18n ...");
  await initI18N();

  console.log("Initializing node-sword-interface ...");
  initNSI();

  console.log("Initializing database ...");
  await initDatabase();

  console.log("Initializing controllers ...");
  await initControllers();

  initNightMode();

  // Wait for the UI to render
  await waitUntilIdle();

  console.log("Initializing user interface ...");
  initUi();

  bible_browser_controller.optionsMenu.loadDisplayOptions();

  // Wait for the UI to render, before we hide the loading indicator
  await waitUntilIdle();

  console.log("Loading settings ...");
  await bible_browser_controller.loadSettings();

  // Wait for the UI to render, before we hide the loading indicator
  await waitUntilIdle();
  loadingIndicator.hide();

  // Show main content
  $('#main-content').show();
  uiHelper.resizeAppContainer();

  console.timeEnd("application-startup");

  await bible_browser_controller.translation_controller.installStrongsIfNeeded();

  console.log("Checking for latest release ...");
  const NewReleaseChecker = require('./app/helpers/new_release_checker.js');
  var newReleaseChecker = new NewReleaseChecker('new-release-info-box');
  newReleaseChecker.check();
}

$(document).ready(function() {
  initApplication();
});

window.addEventListener('beforeunload', () => {
  bible_browser_controller.tab_controller.saveTabConfiguration();
});

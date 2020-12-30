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

window.app = null;
let isDev = null;

const IpcI18n = require('./ipc/ipc_i18n.js');
const IpcNsi = require('./ipc/ipc_nsi.js');
const IpcDb = require('./ipc/ipc_db.js');

// i18n
window.i18n = null;
window.I18nHelper = null;
window.i18nHelper = null;

window.ipcI18n = null;
window.ipcNsi = null;
window.ipcDb = null;

// UI Helper
const UiHelper = require('./helpers/ui_helper.js');
window.uiHelper = new UiHelper();

// Platform Helper
const PlatformHelper = require('./helpers/platform_helper.js');
const ThemeController = require('./controllers/theme_controller.js');
window.platformHelper = new PlatformHelper();

window.app_controller = null;
window.tags_controller = null;
window.theme_controller = new ThemeController();
window.reference_separator = ':';

window.sleep = function(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

window.waitUntilIdle = function() {
  return new Promise(resolve => {
    window.requestIdleCallback(() => {
      resolve();
    });
  });
}

// based on https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
window.escapeRegExp = function(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

$.create_xml_doc = function(string)
{
  var doc = (new DOMParser()).parseFromString(string, 'text/xml');
  return doc;
}

async function initI18N()
{
  I18nHelper = require('./helpers/i18n_helper.js');
  i18nHelper = new I18nHelper();

  await i18nHelper.init();
  // await i18n.changeLanguage('de');

  if (platformHelper.isTest()) { // Use English for test mode
    await i18n.changeLanguage('en');
  }

  reference_separator = i18n.t('general.chapter-verse-separator');
  $(document).localize();
}

async function initTest()
{
  if (app.commandLine.hasSwitch('install-kjv')) {
    var repoConfigExisting = await ipcNsi.repositoryConfigExisting();

    if (!repoConfigExisting) {
      $('#loading-subtitle').text("Updating repository config");
      await ipcNsi.updateRepositoryConfig();
    }

    var kjvModule = await ipcNsi.getLocalModule('KJV');
    if (kjvModule == null) {
      $('#loading-subtitle').text("Installing KJV");
      await ipcNsi.installModule('KJV');
    }
  }

  if (app.commandLine.hasSwitch('install-asv')) {
    var repoConfigExisting = await ipcNsi.repositoryConfigExisting();

    if (!repoConfigExisting) {
      $('#loading-subtitle').text("Updating repository config");
      await ipcNsi.updateRepositoryConfig();
    }

    var kjvModule = await ipcNsi.getLocalModule('ASV');
    if (kjvModule == null) {
      $('#loading-subtitle').text("Installing ASV");
      await ipcNsi.installModule('ASV');
    }
  }
}

async function initIpcClients()
{
  if (platformHelper.isCordova()) {
    const IpcCordova = require('./ipc/ipc_cordova.js');
    window.ipcCordova = new IpcCordova();
  }

  window.ipcI18n = new IpcI18n();
  window.ipcNsi = new IpcNsi();
  window.ipcDb = new IpcDb();
}

async function initCordovaStorage() {
  await ipcCordova.initStorage();
}

async function initControllers()
{
  const AppController = require('./controllers/app_controller.js');
  const TagsController = require('./controllers/tags_controller.js');

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

  if (!platformHelper.isMac()) {
    $('.fullscreen-button').bind('click', () => {
      toggleFullScreen();
    });
  }

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

window.showGlobalLoadingIndicator = function() {
  $('#main-content').hide();
  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.show();
  loadingIndicator.find('.loader').show();
}

window.hideGlobalLoadingIndicator = function() {
  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.hide();
  $('#main-content').show();
}

function earlyHideToolBar() {
  if (platformHelper.isElectron()) {
    var settings = require('electron-settings');

    if (!settings.get('showToolBar')) {
      $('#bible-browser-toolbox').hide();
    }
  }
}

window.loadScript = function(src)
{
  var script = document.createElement('script');
  script.src = src;
  document.getElementsByTagName('head')[0].appendChild(script);
}

function loadHTML()
{
  if (!platformHelper.isElectron()) {
    window.Buffer = require('buffer/').Buffer;
  }

  const fs = require('fs');

  var bookSelectionMenu = fs.readFileSync('html/book_selection_menu.html');
  var tagSelectionMenu = fs.readFileSync('html/tag_selection_menu.html');
  var bibleBrowserToolbox = fs.readFileSync('html/bible_browser_toolbox.html');
  var moduleSettingsAssistant = fs.readFileSync('html/module_settings_assistant.html');
  var tabSearchForm = fs.readFileSync('html/tab_search_form.html');
  var moduleSearchMenu = fs.readFileSync('html/module_search_menu.html');
  var displayOptionsMenu = fs.readFileSync('html/display_options_menu.html');
  var verseListTabs = fs.readFileSync('html/verse_list_tabs.html');
  var boxes = fs.readFileSync('html/boxes.html');

  document.getElementById('book-selection-menu').innerHTML = bookSelectionMenu;
  document.getElementById('tag-selection-menu').innerHTML = tagSelectionMenu;
  document.getElementById('bible-browser-toolbox').innerHTML = bibleBrowserToolbox;
  document.getElementById('module-settings-assistant').innerHTML = moduleSettingsAssistant;
  document.getElementById('tab-search').innerHTML = tabSearchForm;
  document.getElementById('module-search-menu').innerHTML = moduleSearchMenu;
  document.getElementById('display-options-menu').innerHTML = displayOptionsMenu;
  document.getElementById('verse-list-tabs').innerHTML = verseListTabs;
  document.getElementById('boxes').innerHTML = boxes;
}

function toggleFullScreen()
{
  const { remote } = require('electron');
  var window = remote.getCurrentWindow();

  if (window.isFullScreen()) {
    window.setFullScreen(false);
  } else {
    window.setFullScreen(true);
  }
}

window.initApplication = async function()
{
  console.time("application-startup");
  theme_controller.earlyInitNightMode();

  // Wait for the UI to render
  await waitUntilIdle();

  var isDev = await platformHelper.isDebug();

  if (isDev) {
    window.Sentry = {
      addBreadcrumb: function() {},
      Severity: {
        Info: undefined
      }
    }
  }

  if (platformHelper.isElectron()) {
    window.app = require('electron').remote.app;

    const { ipcRenderer } = require('electron');
    await ipcRenderer.send('manageWindowState');
    await ipcRenderer.send('initIpc');
  
    const { remote } = require('electron');
    const appWindow = remote.getCurrentWindow();
    appWindow.show();

    // This module will modify the standard console.log function and add a timestamp as a prefix for all log calls
    require('log-timestamp');
  }

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

  console.log("Initializing IPC ...");
  await initIpcClients();

  if (platformHelper.isCordova()) {
    await initCordovaStorage();
  }

  console.log("Initializing i18n ...");
  await initI18N();

  if (platformHelper.isTest()) {
    await initTest();
  }

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

  //await app_controller.translation_controller.installStrongsIfNeeded();

  if (platformHelper.isElectron()) {
    console.log("Checking for latest release ...");
    const NewReleaseChecker = require('./helpers/new_release_checker.js');
    var newReleaseChecker = new NewReleaseChecker('new-release-info-box');
    newReleaseChecker.check();
  }
}

function initElectronApp() {
  console.log("Initializing app on Electron platform ...");
  initApplication();
}

window.addEventListener('load', function() {
  console.log("load event fired!");

  if (platformHelper.isCordova()) {

    var CordovaPlatform = require('./platform/cordova_platform.js');
    var cordovaPlatform = new CordovaPlatform();
    cordovaPlatform.init();

  } else if (platformHelper.isElectron()) {

    initElectronApp();

  } else {

    console.error("FATAL: Unknown platform");
  }
});

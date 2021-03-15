/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

window.app = null;

const IpcGeneral = require('./ipc/ipc_general.js');
const IpcI18n = require('./ipc/ipc_i18n.js');
const IpcNsi = require('./ipc/ipc_nsi.js');
const IpcDb = require('./ipc/ipc_db.js');
const IpcSettings = require('./ipc/ipc_settings.js');

// i18n
window.i18n = null;
window.I18nHelper = null;
window.i18nHelper = null;
window.i18nInitDone = false;

window.ipcI18n = null;
window.ipcNsi = null;
window.ipcDb = null;
window.ipcSettings = null;

// UI Helper
const UiHelper = require('./helpers/ui_helper.js');
window.uiHelper = new UiHelper();

// Platform Helper
const PlatformHelper = require('../lib/platform_helper.js');
const ThemeController = require('./controllers/theme_controller.js');
window.platformHelper = new PlatformHelper();
window.theme_controller = new ThemeController();

window.app_controller = null;
window.tags_controller = null;
window.reference_separator = ':';
window.cordovaPlatform = null;

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

// Extend NodeList with the forEach function from Array
NodeList.prototype.forEach = Array.prototype.forEach;

$.create_xml_doc = function(string)
{
  var doc = (new DOMParser()).parseFromString(string, 'text/xml');
  return doc;
}

window.initI18N = async function()
{
  if (window.i18nInitDone) {
    return;
  }

  window.i18nInitDone = true;

  I18nHelper = require('./helpers/i18n_helper.js');
  i18nHelper = new I18nHelper();

  await i18nHelper.init();
  // await i18n.changeLanguage('de');

  if (platformHelper.isTest()) { // Use English for test mode
    await i18n.changeLanguage('en');
  }

  reference_separator = i18n.t('general.chapter-verse-separator');
}

window.getReferenceSeparator = async function(moduleCode=undefined) {
  if (moduleCode == undefined) {
    
    return reference_separator;

  } else {
    var moduleReferenceSeparator = reference_separator;
    
    var localModule = await ipcNsi.getLocalModule(moduleCode);
    moduleReferenceSeparator = await i18nHelper.getSpecificTranslation(localModule.language, 'general.chapter-verse-separator');
    
    return moduleReferenceSeparator;
  }
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
  if (window.ipcGeneral === undefined) {
    window.ipcGeneral = new IpcGeneral();
  }

  if (window.ipcI18n === undefined) {
    window.ipcI18n = new IpcI18n();
  }

  window.ipcNsi = new IpcNsi();
  window.ipcDb = new IpcDb();
  window.ipcSettings = new IpcSettings();
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
      ipcSettings.set('tagListWidth', ui.size.width);
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

async function earlyHideToolBar() {
  //var settings = require('electron-settings');

  var showToolBar = await ipcSettings.get('showToolBar', true);

  if (!showToolBar) {
    $('#bible-browser-toolbox').hide();
  }
}

async function earlyInitNightMode() {
  var useNightMode = await ipcSettings.get('useNightMode', false);

  if (useNightMode) {
    document.body.classList.add('darkmode--activated');
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

window.toggleFullScreen = function()
{
  if (platformHelper.isElectron()) {

    const { remote } = require('electron');
    var window = remote.getCurrentWindow();

    if (window.isFullScreen()) {
      window.setFullScreen(false);
    } else {
      window.setFullScreen(true);
    }

  } else if (platformHelper.isAndroid()) {

    cordovaPlatform.toggleFullScreen();
  }
}

window.updateLoadingSubtitle = function(text) {
  if (platformHelper.isCordova()) {
    $('#loading-subtitle').text(text);
  }
}

window.initApplication = async function()
{
  if (platformHelper.isElectron()) {
    // This module will modify the standard console.log function and add a timestamp as a prefix for all log calls
    require('log-timestamp');
  }

  console.time("application-startup");

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

    console.log("Initializing IPC handlers ...");
    await ipcRenderer.invoke('initIpc');
  }

  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.show();
  loadingIndicator.find('.loader').show();

  updateLoadingSubtitle("Initializing user interface");

  console.log("Loading HTML fragments");
  loadHTML();

  console.log("Initializing IPC clients ...");
  await initIpcClients();

  if (platformHelper.isElectron()) {
    await earlyHideToolBar();
  }

  if (platformHelper.isCordova()) {
    await earlyInitNightMode();
  }

  initExternalLinkHandling();

  if (platformHelper.isWin()) {
    var isWin10 = await platformHelper.isWindowsTenOrLater();
    if (isWin10 != undefined) {
      if (!isWin10) {
        hideGlobalLoadingIndicator();
        var vcppRedistributableNeeded = platformHelper.showVcppRedistributableMessageIfNeeded();
        if (vcppRedistributableNeeded) {
          return;
        }
      }
    }
  }

  loadingIndicator.find('.loader').show();

  console.log("Initializing i18n ...");
  await initI18N();
  $(document).localize();

  if (platformHelper.isTest()) {
    await initTest();
  }

  console.log("Initializing controllers ...");
  await initControllers();

  console.log("Initializing user interface ...");
  initUi();
  await app_controller.optionsMenu.init();
  theme_controller.initNightMode();

  // Wait for the UI to render
  await waitUntilIdle();

  console.log("Loading settings ...");
  updateLoadingSubtitle("Loading settings");
  if (platformHelper.isElectron() || platformHelper.isCordova()) {
    await app_controller.loadSettings();
  }

  updateLoadingSubtitle("Waiting for app to get ready");

  // Wait for the UI to render, before we hide the loading indicator
  await waitUntilIdle();
  loadingIndicator.hide();
  $('#loading-subtitle').hide();

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
    cordovaPlatform = new CordovaPlatform();
    cordovaPlatform.init();

  } else if (platformHelper.isElectron()) {

    initElectronApp();

  } else {

    console.error("FATAL: Unknown platform");

    initApplication();
  }
});

if (platformHelper.isCordova() || platformHelper.isTest()) {
  $('#loading-subtitle').show();
}

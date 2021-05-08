/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

// i18n
window.i18n = null;
window.I18nHelper = null;
window.i18nHelper = null;
window.i18nInitDone = false;

const PlatformHelper = require('../lib/platform_helper.js');
const IpcGeneral = require('./ipc/ipc_general.js');
const IpcI18n = require('./ipc/ipc_i18n.js');
const IpcNsi = require('./ipc/ipc_nsi.js');
const IpcDb = require('./ipc/ipc_db.js');
const IpcSettings = require('./ipc/ipc_settings.js');

// UI Helper
const UiHelper = require('./helpers/ui_helper.js');
window.uiHelper = new UiHelper();

const { waitUntilIdle } = require('./helpers/ezra_helper.js');

/**
 * The Startup class has the purpose to start up the application.
 * The main entry point is the method `initApplication()`.
 * @category Startup
 */
class Startup
{
  constructor() {
    this._platformHelper = new PlatformHelper();
    
    window.ipcI18n = null;
    window.ipcNsi = null;
    window.ipcDb = null;
    window.ipcSettings = null;

    window.reference_separator = ':';

    window.app_controller = null;
    window.tags_controller = null;
  }

  async initI18N() {
    if (window.i18nInitDone) {
      return;
    }
  
    window.i18nInitDone = true;
  
    I18nHelper = require('./helpers/i18n_helper.js');
    i18nHelper = new I18nHelper();
  
    await i18nHelper.init();

    if (await ipcSettings.has('appLocale')) {
      await i18n.changeLanguage(await ipcSettings.get('appLocale', 'en'));
    }
  
    if (this._platformHelper.isTest()) { // Use English for test mode
      await i18n.changeLanguage('en');
    }
  
    reference_separator = i18n.t('general.chapter-verse-separator');
  }

  async initTest() {
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

  loadHTML() {
    if (!this._platformHelper.isElectron()) {
      window.Buffer = require('buffer/').Buffer;
    }
  
    const fs = require('fs');

    require('./components/config_option.js');
    require('./components/locale_switch.js');
  
    var bookSelectionMenu = fs.readFileSync('html/book_selection_menu.html');
    var tagSelectionMenu = fs.readFileSync('html/tag_selection_menu.html');
    var tagAssignmentMenu = fs.readFileSync('html/tag_assignment_menu.html');
    var bibleBrowserToolbox = fs.readFileSync('html/bible_browser_toolbox.html');
    var moduleSettingsAssistant = fs.readFileSync('html/module_settings_assistant.html');
    var moduleSearchMenu = fs.readFileSync('html/module_search_menu.html');
    var displayOptionsMenu = fs.readFileSync('html/display_options_menu.html');
    var verseListTabs = fs.readFileSync('html/verse_list_tabs.html');
    var boxes = fs.readFileSync('html/boxes.html');
  
    document.getElementById('book-selection-menu').innerHTML = bookSelectionMenu;
    document.getElementById('tag-selection-menu').innerHTML = tagSelectionMenu;
    document.getElementById('tag-assignment-menu').innerHTML = tagAssignmentMenu;
    document.getElementById('bible-browser-toolbox').innerHTML = bibleBrowserToolbox;
    document.getElementById('module-settings-assistant').innerHTML = moduleSettingsAssistant;
    document.getElementById('module-search-menu').innerHTML = moduleSearchMenu;
    document.getElementById('display-options-menu').innerHTML = displayOptionsMenu;
    document.getElementById('verse-list-tabs').innerHTML = verseListTabs;
    document.getElementById('boxes').innerHTML = boxes;
  }

  async initIpcClients() {
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

  async initControllers() {
    const AppController = require('./controllers/app_controller.js');
    const TagsController = require('./controllers/tags_controller.js');
  
    window.app_controller = new AppController();
    await app_controller.init();
  
    window.tags_controller = new TagsController();

    const ThemeController = require('./controllers/theme_controller.js');
    window.theme_controller = new ThemeController();
  }

  initUi() {
    this._platformHelper.addPlatformCssClass();
  
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
  
    tags_controller.initTagsUI();
    uiHelper.configureButtonStyles();
  
    if (!platformHelper.isMac()) {
      $('.fullscreen-button').bind('click', () => {
        app_controller.toggleFullScreen();
      });
    }
  
    $(window).bind("resize", () => { uiHelper.resizeAppContainer(); });
  }

  async earlyHideToolBar() {
    //var settings = require('electron-settings');
  
    var showToolBar = await ipcSettings.get('showToolBar', true);
  
    if (!showToolBar) {
      $('#bible-browser-toolbox').hide();
    }
  }
  
  async earlyInitNightMode() {
    var useNightMode = await ipcSettings.get('useNightMode', false);
  
    if (useNightMode) {
      document.body.classList.add('darkmode--activated');
    }
  }

  initExternalLinkHandling() {
    // Open links classified as external in the default web browser
    $('body').on('click', 'a.external, p.external a, div.external a', (event) => {
      event.preventDefault();
      let link = event.target.href;
  
      if (platformHelper.isElectron()) {

        require("electron").shell.openExternal(link);

      } else if (platformHelper.isCordova()) {

        window.open(link, '_system');
        
      }
    });
  }

  async initApplication() {
    console.time("application-startup");

    // Wait for the UI to render
    await waitUntilIdle();

    var isDev = await this._platformHelper.isDebug();

    if (isDev) {
      window.Sentry = {
        addBreadcrumb: function() {},
        Severity: {
          Info: undefined
        }
      }
    }

    if (this._platformHelper.isElectron()) {
      window.app = require('electron').remote.app;

      const { ipcRenderer } = require('electron');
      await ipcRenderer.send('manageWindowState');

      console.log("Initializing IPC handlers ...");
      await ipcRenderer.invoke('initIpc');
    }

    var loadingIndicator = $('#startup-loading-indicator');
    loadingIndicator.show();
    loadingIndicator.find('.loader').show();

    uiHelper.updateLoadingSubtitle("Initializing user interface");

    console.log("Initializing IPC clients ...");
    await this.initIpcClients();

    console.log("Initializing i18n ...");
    await this.initI18N();

    console.log("Loading HTML fragments");
    this.loadHTML();

    if (this._platformHelper.isElectron()) {
      await this.earlyHideToolBar();
    }

    if (this._platformHelper.isCordova()) {
      await this.earlyInitNightMode();
    }

    this.initExternalLinkHandling();

    if (this._platformHelper.isWin()) {
      var isWin10 = await this._platformHelper.isWindowsTenOrLater();
      if (isWin10 != undefined) {
        if (!isWin10) {
          uiHelper.hideGlobalLoadingIndicator();
          var vcppRedistributableNeeded = this._platformHelper.showVcppRedistributableMessageIfNeeded();
          if (vcppRedistributableNeeded) {
            return;
          }
        }
      }
    }

    loadingIndicator.find('.loader').show();

    $(document).localize();

    if (this._platformHelper.isTest()) {
      await this.initTest();
    }

    console.log("Initializing controllers ...");
    await this.initControllers();

    console.log("Initializing user interface ...");
    this.initUi();
    await app_controller.optionsMenu.init();
    theme_controller.initNightMode();

    // Wait for the UI to render
    await waitUntilIdle();

    console.log("Loading settings ...");
    uiHelper.updateLoadingSubtitle("Loading settings");
    if (this._platformHelper.isElectron() || this._platformHelper.isCordova()) {
      await app_controller.loadSettings();
    }

    uiHelper.updateLoadingSubtitle("Waiting for app to get ready");

    // Wait for the UI to render, before we hide the loading indicator
    await waitUntilIdle();
    loadingIndicator.hide();
    $('#loading-subtitle').hide();

    // Show main content
    $('#main-content').show();
    uiHelper.resizeAppContainer();

    await waitUntilIdle();

    // Restore the scroll position of the first tab.
    app_controller.tab_controller.restoreScrollPosition(0);

    if (this._platformHelper.isElectron()) {
      const { ipcRenderer } = require('electron');
      ipcRenderer.invoke("startupCompleted");
    }

    console.timeEnd("application-startup");

    //await app_controller.translation_controller.installStrongsIfNeeded();

    if (this._platformHelper.isElectron()) {
      console.log("Checking for latest release ...");
      const NewReleaseChecker = require('./helpers/new_release_checker.js');
      var newReleaseChecker = new NewReleaseChecker('new-release-info-box');
      newReleaseChecker.check();
    }
  }
}

module.exports = Startup;
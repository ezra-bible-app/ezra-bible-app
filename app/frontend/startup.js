/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const Mousetrap = require('mousetrap');
const PlatformHelper = require('../lib/platform_helper.js');
const IpcGeneral = require('./ipc/ipc_general.js');
const IpcI18n = require('./ipc/ipc_i18n.js');
const IpcNsi = require('./ipc/ipc_nsi.js');
const IpcDb = require('./ipc/ipc_db.js');
const IpcSettings = require('./ipc/ipc_settings.js');
const i18nController = require('./controllers/i18n_controller.js');
const dbSyncController = require('./controllers/db_sync_controller.js');
const eventController = require('./controllers/event_controller.js');
const cacheController = require('./controllers/cache_controller.js');
const { showDialog } = require('./helpers/ezra_helper.js');

// UI Helper
const UiHelper = require('./helpers/ui_helper.js');
window.uiHelper = new UiHelper();

const { html, waitUntilIdle, getPlatform } = require('./helpers/ezra_helper.js');

/**
 * The Startup class has the purpose to start up the application.
 * The main entry point is the method `initApplication()`.
 * @category Startup
 */
class Startup {
  constructor() {
    this._platformHelper = new PlatformHelper();

    window.ipcI18n = null;
    window.ipcNsi = null;
    window.ipcDb = null;
    window.ipcSettings = null;

    window.reference_separator = ':';

    window.app_controller = null;
    window.tag_assignment_panel = null;

    if (window.sendCrashReports == null) {
      window.sendCrashReports = false;
    }
  }

  async initTest() {
    if (app.commandLine.hasSwitch('install-kjv')) {
      let repoConfigExisting = await ipcNsi.repositoryConfigExisting();

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
      let repoConfigExisting = await ipcNsi.repositoryConfigExisting();

      if (!repoConfigExisting) {
        $('#loading-subtitle').text("Updating repository config");
        await ipcNsi.updateRepositoryConfig();
      }

      var asvModule = await ipcNsi.getLocalModule('ASV');
      if (asvModule == null) {
        $('#loading-subtitle').text("Installing ASV");
        await ipcNsi.installModule('ASV');
      }
    }
  }

  loadWebComponents() {
    if (this._platformHelper.isIOS()) {
      // Add Polyfill for custom elements on iOS Safari
      require('@ungap/custom-elements');
    }

    require('./components/tool_panel/panel_buttons.js');
    require('./components/tags/tag_list_menu.js');
    require('./components/tags/tag_group_list.js');
    require('./components/tags/tag_group_assignment_list.js');
    require('./components/tags/tag_list.js');
    require('./components/tags/tag_distribution_matrix.js');
    require('./components/options_menu/config_option.js');
    require('./components/options_menu/select_option.js');
    require('./components/options_menu/locale_switch.js');
    require('./components/module_assistant/module_assistant.js');
    require('./components/verse_context_menu.js');
    require('./components/generic/text_field.js');
  }

  loadHTML() {
    if (!this._platformHelper.isElectron()) {
      window.Buffer = require('buffer/').Buffer;
    }

    this.loadWebComponents();

    var bookSelectionMenu = null;
    var tagSelectionMenu = null;
    var toolPanel = null;
    var tagPanel = null;
    var moduleSearchMenu = null;
    var displayOptionsMenu = null;
    var verseListTabs = null;
    var boxes = null;

    if (this._platformHelper.isElectron() && !isDev) {
      // Electron Production

      const { loadFile } = require('./helpers/fs_helper.js');

      console.log("Loading HTML files via Electron production approach");

      bookSelectionMenu = loadFile('html/book_selection_menu.html');
      tagSelectionMenu = loadFile('html/tag_selection_menu.html');
      toolPanel = loadFile('html/tool_panel.html');
      tagPanel = loadFile('html/tag_panel.html');
      moduleSearchMenu = loadFile('html/module_search_menu.html');
      displayOptionsMenu = loadFile('html/display_options_menu.html');
      verseListTabs = loadFile('html/verse_list_tabs.html');
      boxes = loadFile('html/boxes.html');

    } else {
      // Development & Cordova

      console.log("Loading HTML files via Development / Cordova approach");

      // Note that for Cordova these readFileSync calls are all inlined, which means the content of those files
      // becomes part of the bundle when bundling up the sources with Browserify.

      const fs = require('fs');

      bookSelectionMenu = fs.readFileSync('html/book_selection_menu.html');
      tagSelectionMenu = fs.readFileSync('html/tag_selection_menu.html');
      toolPanel = fs.readFileSync('html/tool_panel.html');
      tagPanel = fs.readFileSync('html/tag_panel.html');
      moduleSearchMenu = fs.readFileSync('html/module_search_menu.html');
      displayOptionsMenu = fs.readFileSync('html/display_options_menu.html');
      verseListTabs = fs.readFileSync('html/verse_list_tabs.html');
      boxes = fs.readFileSync('html/boxes.html');
    }
  
    document.getElementById('book-selection-menu-book-list').innerHTML = bookSelectionMenu;
    document.getElementById('tag-selection-menu').innerHTML = tagSelectionMenu;
    document.getElementById('tool-panel').innerHTML = toolPanel;
    document.getElementById('tag-panel').innerHTML = tagPanel;
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
    const TagAssignmentPanel = require('./components/tool_panel/tag_assignment_panel/tag_assignment_panel.js');

    window.app_controller = new AppController();
    await app_controller.init();

    window.tag_assignment_panel = new TagAssignmentPanel();

    const ThemeController = require('./controllers/theme_controller.js');
    window.theme_controller = new ThemeController();
  }

  initUi() {
    this._platformHelper.addPlatformCssClass();

    tag_assignment_panel.initTagsUI();
    uiHelper.configureButtonStyles();
    
    if (platformHelper.isElectron()) {
      const resizable = require('./components/tool_panel/resizable.js');
      resizable.initResizable();
    }

    window.addEventListener('resize', () => { uiHelper.onResize(); });

    // We need to call onResize initially independent of an event in order to correctly initialize the innerWidth in uiHelper
    uiHelper.onResize();
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

      window.uiHelper.openLinkInBrowser(link);
    });
  }

  async confirmPrivacyOptions() {
    const dialogBoxTemplate = html`
      <div id='privacy-options-box-content'>
        <h2 i18n='data-privacy.data-privacy-options'></h2>
        <p i18n='general.welcome-to-ezra-bible-app'></p>

        <p i18n='[html]data-privacy.please-confirm-options'></p>

        <div id='check-new-releases-box'>
          <h3 i18n='general.check-new-releases'></h3>
          <p i18n='[html]data-privacy.check-new-releases-hint'></p>

          <div style='width: 18em;'>
            <config-option id="checkNewReleasesPrivacyOption" settingsKey="checkNewReleases" label="general.check-new-releases" checkedByDefault="true"></config-option>
          </div>
        </div>

        <div id='send-crash-reports-box'>
          <h3 i18n='general.send-crash-reports'></h3>
          <p>
            <span i18n='[html]data-privacy.send-crash-reports-hint-part1'></span>
            <span i18n='[html]data-privacy.send-crash-reports-hint-part2'></span>
            <span i18n='[html]data-privacy.send-crash-reports-hint-part3'></span> 
          </p>

          <div style='width: 18em;'>
            <config-option id="sendCrashReportsPrivacyOption" settingsKey="sendCrashReports" label="general.send-crash-reports" checkedByDefault="true"></config-option>
          </div>
        </div>
      </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#privacy-options-box').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#privacy-options-box');
      $dialogBox.localize();

      let checkNewReleasesOption = document.getElementById('checkNewReleasesPrivacyOption');
      let checkNewReleasesMenuOption = document.getElementById('checkNewReleasesOption');
      checkNewReleasesOption.addEventListener("optionChanged", async () => {
        await checkNewReleasesMenuOption.loadOptionFromSettings();
      });

      let sendCrashReportsOption = document.getElementById('sendCrashReportsPrivacyOption');
      let sendCrashReportsMenuOption = document.getElementById('sendCrashReportsOption');
      sendCrashReportsOption.addEventListener("optionChanged", async () => {
        await sendCrashReportsMenuOption.loadOptionFromSettings();
        await app_controller.optionsMenu.toggleCrashReportsBasedOnOption();
      });

      uiHelper.configureButtonStyles('#privacy-options-box');
      
      const width = 800;
      const height = 600;
      const offsetLeft = ($(window).width() - width)/2;

      let dialogOptions = uiHelper.getDialogOptions(width, height, false, [offsetLeft, 80]);

      var buttons = {};
      buttons[i18n.t('general.ok')] = function() {
        $(this).dialog('close');
      };

      let title = '';

      if (this._platformHelper.isElectron()) { 
        title = i18n.t('data-privacy.confirm-privacy-options');
      } else if (this._platformHelper.isCordova()) {
        title = i18n.t('general.ezra-bible-app') + ' - ' + i18n.t('data-privacy.confirm-privacy-options');
      }

      dialogOptions.buttons = buttons;
      dialogOptions.title = title;
      dialogOptions.resizable = false;
      dialogOptions.modal = true;
      dialogOptions.dialogClass = 'ezra-dialog privacy-options-dialog';
      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      Mousetrap.bind('esc', () => { $dialogBox.dialog("close"); });
      $dialogBox.dialog(dialogOptions);
      
      $('.privacy-options-dialog').find('.ui-dialog-titlebar-close').hide();
    });
  }

  async initApplication(initDbResult=0) {
    console.time("application-startup");

    // Wait for the UI to render
    await waitUntilIdle();

    var isDev = await this._platformHelper.isDebug();

    if (isDev) {
      window.Sentry = {
        addBreadcrumb: function () { },
        Severity: {
          Info: ''
        }
      };
    }

    if (this._platformHelper.isElectron()) {
      window.app = require('@electron/remote').app;

      const { ipcRenderer } = require('electron');
      await ipcRenderer.send('manageWindowState');

      console.log("Initializing IPC handlers ...");
      initDbResult = await ipcRenderer.invoke('initIpc');
    }

    var loadingIndicator = $('#startup-loading-indicator');
    loadingIndicator.show();
    loadingIndicator.find('.loader').show();

    uiHelper.updateLoadingSubtitle("cordova.init-user-interface", "Initializing user interface");

    console.log("Initializing IPC clients ...");
    await this.initIpcClients();

    console.log("Initializing i18n ...");

    // Initialize the localize function as empty first on unsupported platforms.
    // This helps to have a functioning JavaScript environment
    // when opening the index.html file just like that.
    if (window.jQuery && !this._platformHelper.isSupportedPlatform()) {
      jQuery.fn.extend({
        localize: function() { return null; }
      });
    }

    if (this._platformHelper.isElectron()) {
      await i18nController.initI18N();
    } else if (this._platformHelper.isCordova()) {
      // The initI18N call already happened on Cordova, but not yet the initLocale one,
      // because the initLocale call depends on persisting settings which can only be done now (after the permissions setup).
      // At this point, we can write settings and can therefore call initLocale!
      await i18nController.initLocale();
    }

    console.log("Loading HTML fragments");
    this.loadHTML();

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

    try {
      $(document).localize();
    } catch (e) {
      console.warn("Could not localize the DOM!");
    }

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
    uiHelper.updateLoadingSubtitle("cordova.loading-settings");
    if (this._platformHelper.isElectron() || this._platformHelper.isCordova()) {
      await app_controller.loadSettings();
    }

    uiHelper.updateLoadingSubtitle("cordova.waiting-app-ready");

    // Wait for the UI to render, before we hide the loading indicator
    await waitUntilIdle();
    loadingIndicator.hide();
    $('#loading-subtitle').hide();

    // Show main content
    document.getElementById('main-content').style.display = 'block';

    await waitUntilIdle();

    // Restore the scroll position of the first tab.
    app_controller.tab_controller.restoreScrollPosition(0);
    // FIXME: Also highlight the last navigation element in the navigation pane and scroll to it

    dbSyncController.init();

    setTimeout(() => {
      dbSyncController.showSyncResultMessage();
    }, 3000);

    if (this._platformHelper.isElectron()) {
      const { ipcRenderer } = require('electron');
      ipcRenderer.invoke("startupCompleted");
    }

    console.timeEnd("application-startup");

    // Save some meta data about versions used
    cacheController.saveLastUsedVersion();

    if (platformHelper.isAndroid()) {
      ipcSettings.set('lastUsedAndroidVersion', getPlatform().getOSVersion());
    } else if (platformHelper.isIOS()) {
      ipcSettings.set('lastUsedIOSVersion', getPlatform().getOSVersion());
    }

    // Confirm privacy options at first startup
    const firstStartDone = await ipcSettings.has('firstStartDone');
    if (!this._platformHelper.isTest() && this._platformHelper.isSupportedPlatform() && !firstStartDone) {
      await this.confirmPrivacyOptions();
      await ipcSettings.set('firstStartDone', true);
    }

    // Automatically open module assistant to install Bible translations if no translations are installed yet.
    if (!this._platformHelper.isTest()) {
      const translationCount = app_controller.translation_controller.getTranslationCount();
      if (translationCount == 0) {
        app_controller.openModuleSettingsAssistant('BIBLE'); 
      }
    }

    let checkNewReleasesOption = app_controller.optionsMenu._checkNewReleasesOption;

    if (this._platformHelper.isElectron() && checkNewReleasesOption.isChecked) {
      console.log("Checking for latest release ...");
      const NewReleaseChecker = require('./helpers/new_release_checker.js');
      var newReleaseChecker = new NewReleaseChecker('new-release-info-box');
      newReleaseChecker.check();
    }

    const isDropboxAccessUpgradeNeeded = await ipcDb.isDropboxAccessUpgradeNeeded();

    if (isDropboxAccessUpgradeNeeded) {
      // The Dropbox access level has changed from full access to app folder access in version 1.15.
      // Here we inform the user about this change.

      const message = i18n.t('dropbox.access-method-message-part1') +
                      i18n.t('dropbox.access-method-message-part2') +
                      i18n.t('dropbox.access-method-message-part3') +
                      i18n.t('dropbox.access-method-message-part4') +
                      i18n.t('dropbox.access-method-message-part5') +
                      `<ul>
                        <li>${i18n.t('dropbox.access-method-message-part6')}</li>
                        <li>${i18n.t('dropbox.access-method-message-part7')}</li>
                      </ul>`;

      await showDialog(i18n.t('dropbox.access-method-change'), message, 600, 450);
    }

    this.showDatabaseErrorsIfAny(initDbResult);

    await eventController.publishAsync('on-startup-completed');
    app_controller.startupCompleted = true;
  }

  showDatabaseErrorsIfAny(initDbResult) {
    if (initDbResult < 0) {
      console.log("WARNING: An error happened during the initialization.");

      if (initDbResult == -1) {

        const message = "The database file has been restored from the last backup after corruption.";
        console.error(message);

        iziToast.warning({
          title: "WARNING - Database issue",
          message: message,
          position: platformHelper.getIziPosition(),
          timeout: 30000
        });

      } else if (initDbResult == -2) {

        const message = "The database file was corrupted. A new database has been restored from the initial, empty template.";
        console.error(message);

        iziToast.error({
          title: "FATAL - Database issue",
          message: message,
          position: platformHelper.getIziPosition(),
          timeout: 30000
        });

      } else if (initDbResult == -3) {

        const message = "The database could not be initialized, even after resetting it due to corruption. You should reinstall the app.";
        console.error(message);

        iziToast.error({
          title: "FATAL - Database issue",
          message: message,
          position: platformHelper.getIziPosition(),
          timeout: 30000
        });
      }
    }
  }

  /** 
   * Localize "Loading" strings early if localStorage available 
   */
  earlyRestoreLocalizedString() {
    const loadingElement = document.querySelector('[i18n="general.loading"]');
    if (loadingElement) {
      loadingElement.textContent = i18nController.getStringForStartup("general.loading", "Loading");
    }

    const loadingSubtitleElement = document.querySelector('#loading-subtitle');
    if (loadingSubtitleElement) {
      loadingSubtitleElement.textContent = i18nController.getStringForStartup("cordova.starting-app", "Starting app");
    }
  }
}

module.exports = Startup;
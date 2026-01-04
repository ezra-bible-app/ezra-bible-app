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
const PlatformHelper = require('../../lib/platform_helper.js');
const { html, sleep } = require('../helpers/ezra_helper.js');
const eventController = require('../controllers/event_controller.js');
const exportHelper = require('../helpers/export_helper.js');
const swordModuleHelper = require('../helpers/sword_module_helper.js');
const moduleSelectHelper = require('../helpers/module_select_helper.js');

class InfoPopup {
  constructor() {
    this.platformHelper = new PlatformHelper();
    this.initAppInfoBoxDone = false;
    this.initAppInfoButton();

    eventController.subscribe('on-tab-added', (tabIndex) => {
      this.initAppInfoButton();

      var currentTab = app_controller.tab_controller.getTab(tabIndex);
      if (currentTab) {
        const currentBibleTranslationId = currentTab.getBibleTranslationId();
        if (currentBibleTranslationId != null) {
          this.enableCurrentAppInfoButton(tabIndex);
        }
      }
    });

    eventController.subscribe('on-all-translations-removed', () => {
      this.disableCurrentAppInfoButton();
    });

    eventController.subscribe('on-translation-added', () => {
      this.enableCurrentAppInfoButton();
    });
  }

  initAppInfoButton() {
    var appInfoButton = $('.app-info-button');

    appInfoButton.unbind('click');
    appInfoButton.bind('click', async (event) => {
      event.stopPropagation();

      if (!$(this).hasClass('ui-state-disabled')) {
        app_controller.hideAllMenus();
        await this.showAppInfo();
      }
    });
  }

  initAppInfoBox() {
    if (this.initAppInfoBoxDone) {
      return;
    }

    this.initAppInfoBoxDone = true;

    $('#info-popup').dialog({
      autoOpen: false,
      dialogClass: 'ezra-dialog app-info-popup'
    });

    uiHelper.fixDialogCloseIconOnAndroid('app-info-popup');
  }

  getFormattedTimestamp(timestamp) {
    return timestamp.toLocaleDateString() + ' / ' + timestamp.toLocaleTimeString();
  }

  async showAppInfo(moduleCode=undefined) {
    var CommitInfo = null;
    var gitCommit = "";

    try {
      CommitInfo = require('../../commit_info.js');
      gitCommit = CommitInfo.commit.slice(0, 8);
    } catch (e) {
      console.log("Did not find commit_info.js!");
    }

    this.initAppInfoBox();

    let currentModuleId = app_controller.tab_controller.getTab().getBibleTranslationId();

    if (moduleCode != null) {
      currentModuleId = moduleCode;
    }

    var version = "";
    if (this.platformHelper.isElectron()) {
      version = app.getVersion();
    } else if (this.platformHelper.isCordova()) {
      version = await cordova.getAppVersion.getVersionNumber();
    }

    const swordVersion = await ipcNsi.getSwordVersion();
    const chromiumVersion = window.getChromiumVersion();
    const databasePath = await ipcDb.getDatabasePath();
    const databaseSize = await ipcDb.getDatabaseSize() + ' MB';
    const configFilePath = await ipcSettings.getConfigFilePath();
    const swordPath = await ipcNsi.getSwordPath();

    let lastDropboxSyncTime = '--';
    if (await ipcSettings.has('lastDropboxSyncTime')) {
      let rawTime = await ipcSettings.get('lastDropboxSyncTime');

      if (rawTime != null && rawTime != "") {
        lastDropboxSyncTime = new Date(await ipcSettings.get('lastDropboxSyncTime'));
        lastDropboxSyncTime = this.getFormattedTimestamp(lastDropboxSyncTime);
      }
    }

    let lastDropboxDownloadTime = '--';
    if (await ipcSettings.has('lastDropboxDownloadTime')) {
      let rawDropboxDownloadTime = await ipcSettings.get('lastDropboxDownloadTime', '--');

      if (rawDropboxDownloadTime != '--' && rawDropboxDownloadTime != '' && rawDropboxDownloadTime != null) {
        lastDropboxDownloadTime = new Date(rawDropboxDownloadTime);
        lastDropboxDownloadTime = this.getFormattedTimestamp(lastDropboxDownloadTime);
      }
    }

    let lastDropboxUploadTime = '--';
    if (await ipcSettings.has('lastDropboxUploadTime')) {
      let rawDropboxUploadTime = await ipcSettings.get('lastDropboxUploadTime', '--');

      if (rawDropboxUploadTime != '--' && rawDropboxUploadTime != '' && rawDropboxUploadTime != null) {
        lastDropboxUploadTime = new Date(rawDropboxUploadTime);
        lastDropboxUploadTime = this.getFormattedTimestamp(lastDropboxUploadTime);
      }
    }

    let lastDropboxSyncResult = await ipcSettings.get('lastDropboxSyncResult', '--');
    if (lastDropboxSyncResult == null) {
      lastDropboxSyncResult = '--'
    }

    const moduleDescription = await swordModuleHelper.getModuleDescription(currentModuleId);
    const moduleInfo = await swordModuleHelper.getModuleInfo(currentModuleId, false, false);

    const exportUserDataHint = await i18n.t('general.export-user-data-hint');

    var toggleFullScreenLine = '';

    if (this.platformHelper.isWin() || this.platformHelper.isLinux()) {
      toggleFullScreenLine = `
        <tr><td>${i18n.t("shortcuts.summary.toggle-fullscreen-only-Win-Linux")}</td><td><code>${i18n.t("shortcuts.shortcut.toggle-fullscreen-only-Win-Linux")}</code></td></tr>
      `;
    }

    const appInfo = html`
    <div id='app-info-tabs'>
      <ul>
        <li><a href='#app-info-tabs-1'>${i18n.t('general.sword-module-description')}</a></li>
        <li><a href='#app-info-tabs-2'>${i18n.t('general.application-info')}</a></li>
        <li id='app-info-tabs-3-nav'><a href='#app-info-tabs-3'>${i18n.t('shortcuts.tab-title')}</a></li>
      </ul>

      <div id='app-info-tabs-1' class='info-tabs scrollable' style='padding-top: 1.2em;'>
        <select id='info-popup-module-select' name='info-popup-module-select'></select>

        <div id='app-info-module-description' style='padding-top: 1em;'>
        ${moduleDescription}
        </div>

        <div id='app-info-module-info' style='margin-top: 1.5em; padding-top: 1em; border-top: 1px solid var(--border-color)'>
        ${moduleInfo}
        </div>
      </div>

      <div id='app-info-tabs-2' class='info-tabs scrollable'>
        <h2>${i18n.t("general.about-ezra-bible-app")}</h2>
        <p>${i18n.t("general.general-app-info")}</p>

        ${i18n.t("general.website")}: <a class='external' href='https://ezrabibleapp.net'>ezrabibleapp.net</a><br>
        GitHub: <a class='external' href='https://github.com/ezra-bible-app/ezra-bible-app'>github.com/ezra-bible-app/ezra-bible-app</a>

        <h2>${i18n.t("general.developers")}</h2>
        <a class='external' href='https://github.com/tobias-klein'>Tobias Klein (Maintainer)</a><br>
        <a class='external' href='https://github.com/zhuiks'>Evgen Kucherov</a>

        <h2>${i18n.t("general.translators")}</h2>
        <a class='external' href='https://github.com/tobias-klein'>Tobias Klein (English, German)</a><br>
        <a class='external' href='https://gitlab.com/lafricain79'>Br Cyrille (French)</a><br>
        <a class='external' href='https://github.com/lemtom'>Tom Lemmens (French, Dutch)</a><br>
        <a class='external' href='https://github.com/reyespinosa1996'>Reinaldo R. Espinosa (Spanish)</a><br>
        <a class='external' href='https://github.com/MartinIIOT'>MartinIIOT (Slovakian)</a><br>
        <a class='external' href='https://github.com/debritto'>Christian De Britto (Brazilian Portuguese)</a><br>
        <a class='external' href='https://github.com/zhuiks'>Evgen Kucherov (Ukrainian, Russian)</a><br>
        <a class='external' href='https://github.com/augustin-colesnic'>Augustin Colesnic (Romanian)</a><br>
        <a class='external' href='https://github.com/msavli'>Marjan Šavli (Slovenian)</a><br>

        <h2>${i18n.t("general.versions-and-paths")}</h2>
        <table>
          <tr><td style='width: 15em;'>${i18n.t("general.application-version")}:</td><td>${version}</td></tr>
          <tr><td>${i18n.t("general.git-commit")}:</td><td>${gitCommit}</td></tr>
          <tr><td>${i18n.t("general.sword-version")}:</td><td>${swordVersion}</td></tr>
          <tr><td>${i18n.t("general.chromium-version")}:</td><td>${chromiumVersion}</td></tr>
          <tr><td>${i18n.t("general.database-path")}:</td><td>${databasePath}</td></tr>
          <tr><td>${i18n.t("general.database-size")}:</td><td>${databaseSize}</td></tr>
          <tr><td>${i18n.t("general.config-file-path")}:</td><td>${configFilePath}</td></tr>
          <tr><td>${i18n.t("general.sword-path")}:</td><td>${swordPath}</td></tr>
        </table>

        <h2>${i18n.t("dropbox.dropbox-sync-info")}</h2>
        <table>
          <tr><td style='width: 15em;'>${i18n.t("dropbox.last-dropbox-sync-time")}:</td><td>${lastDropboxSyncTime}</td></tr>
          <tr><td style='width: 15em;'>${i18n.t("dropbox.last-dropbox-sync-result")}:</td><td>${lastDropboxSyncResult}</td></tr>
          <tr><td style='width: 15em;'>${i18n.t("dropbox.last-dropbox-download-time")}:</td><td>${lastDropboxDownloadTime}</td></tr>
          <tr><td style='width: 15em;'>${i18n.t("dropbox.last-dropbox-upload-time")}:</td><td>${lastDropboxUploadTime}</td></tr>
        </table>

        <div id="info-popup-export">
          <h2>${i18n.t("general.export")}</h2>
          <p>
            <button id="export-user-data-button" title="${exportUserDataHint}" style="padding: 0.5em;" class="fg-button ui-state-default ui-corner-all" i18n="general.export-user-data-action">
              ${i18n.t("general.export-user-data-action")}
            </button>

            <i id="user-data-export-result" class="fas fa-check fa-lg" style="display: none; margin-left: 0.5em; color: var(--checkmark-success-color);"></i>
          </p>
        </div>
      </div>

      <div id='app-info-tabs-3' class='info-tabs scrollable'>
       <h2>${i18n.t("shortcuts.description")}</h2>
        <table role="table" id="info-table-shortcuts">

          <tr>
            <th class="info-tab-section-title">${i18n.t("shortcuts.summary.font-section-title")}</th>
          </tr>
          
          <tr><td>${i18n.t("shortcuts.summary.increase-current-font-size")}</td><td><code>${i18n.t("shortcuts.shortcut.increase-current-font-size")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.decrease-current-font-size")}</td><td><code>${i18n.t("shortcuts.shortcut.decrease-current-font-size")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.reset-font-size-to-default")}</td><td><code>${i18n.t("shortcuts.shortcut.reset-font-size-to-default")}</code></td></tr>

          <tr>
            <th class="info-tab-section-title">${i18n.t("shortcuts.summary.current-tab-search-section-title")}</th>
          </tr>
          
          <tr><td>${i18n.t("shortcuts.summary.in-tab-search")}</td><td><code>${i18n.t("shortcuts.shortcut.in-tab-search")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.hide-in-tab-search-form")}</td><td><code>${i18n.t("shortcuts.shortcut.hide-in-tab-search-form")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.jump-to-next-search-occurance")}</td><td><code>${i18n.t("shortcuts.shortcut.jump-to-next-search-occurance")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.jump-to-previous-occurance")}</td><td><code>${i18n.t("shortcuts.shortcut.jump-to-previous-occurance")}</code></td></tr>

          <tr>
            <th class="info-tab-section-title">${i18n.t("shortcuts.summary.miscellaneous-section-title")}</th>
          </tr>
          
          <tr><td>${i18n.t("shortcuts.summary.previous-chapter")}</td><td><code><i class="fa-solid fa-arrow-left-long"></i></code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.next-chapter")}</td><td><code><i class="fa-solid fa-arrow-right-long"></i></code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.select-all-verses")}</td><td><code>${i18n.t("shortcuts.shortcut.select-all-verses")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.copy-selected-verses-to-clipboard")}</td><td><code>${i18n.t("shortcuts.shortcut.copy-selected-verses-to-clipboard")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.enable-dynamic-strongs-display")}</td><td><code>${i18n.t("shortcuts.shortcut.enable-dynamic-strongs-display")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.open-new-tab")}</td><td><code>${i18n.t("shortcuts.shortcut.open-new-tab")}</code></td></tr>
          ${toggleFullScreenLine}
         
        </table>
      </div>
    </div>`;

    var dialogWidth = uiHelper.getMaxDialogWidth();
    var dialogHeight = 550;
    var draggable = true;

    var offsetLeft = ($(window).width() - dialogWidth) / 2;
    var position = [offsetLeft, 120];

    let dialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
    dialogOptions.title = i18n.t('general.module-application-info');

    $('#info-popup').dialog(dialogOptions);
    $('#info-popup-content').empty();
    $('#info-popup-content').html(appInfo.innerHTML);
    $('#app-info-tabs').tabs({ heightStyle: "fill" });

    const MODULE_SELECT_WIDTH = 450;
    let moduleSelect = document.getElementById('info-popup-content').querySelector('#info-popup-module-select');

    await moduleSelectHelper.initModuleSelect(moduleSelect, currentModuleId, MODULE_SELECT_WIDTH, (selectedValue) => {
      this.updateModuleSummary(selectedValue);
    });

    if (this.platformHelper.isElectron()) {
      document.getElementById('export-user-data-button').addEventListener('click', async () => {
        var dialogTitle = i18n.t("general.export-user-data-action");
        var filePath = await exportHelper.showSaveDialog('User_data_export', 'csv', dialogTitle);

        await ipcDb.exportUserData(filePath);

        $('#user-data-export-result').fadeIn();
        await sleep(3000);
        $('#user-data-export-result').fadeOut();
      });
    } else {
      // We hide the export section on Cordova, because the function is not supported there.
      document.getElementById('info-popup-export').style.display = 'none';
    }

    uiHelper.configureButtonStyles('#info-popup-content');

    Mousetrap.bind('esc', () => { $('#info-popup').dialog("close"); });

    $('#info-popup').dialog("open");
  }

  async updateModuleSummary(moduleCode) {
    const moduleDescription = await swordModuleHelper.getModuleDescription(moduleCode);
    const moduleInfo = await swordModuleHelper.getModuleInfo(moduleCode, false, false);

    let moduleDescriptionContainer = document.querySelector('#app-info-module-description');
    let moduleInfoContainer = document.querySelector('#app-info-module-info');

    moduleDescriptionContainer.innerHTML = moduleDescription;
    moduleInfoContainer.innerHTML = moduleInfo;
  }

  enableCurrentAppInfoButton(tabIndex = undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var appInfoButton = currentVerseListMenu.find('.app-info-button');
    appInfoButton.removeClass('ui-state-disabled');

    var tabId = app_controller.tab_controller.getSelectedTabId(tabIndex);
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }
  }

  disableCurrentAppInfoButton() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var appInfoButton = currentVerseListMenu.find('.app-info-button');
    appInfoButton.addClass('ui-state-disabled');
  }
}

module.exports = InfoPopup;

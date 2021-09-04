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

const PlatformHelper = require('../../lib/platform_helper.js');
const { html } = require('../helpers/ezra_helper.js');

class InfoPopup {
  constructor() {
    this.platformHelper = new PlatformHelper();
    this.initAppInfoBoxDone = false;
    this.initAppInfoButton();
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

    var width = uiHelper.getMaxDialogWidth();

    $('#info-popup').dialog({
      width: width,
      height: 550,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  }

  async showAppInfo() {
    var CommitInfo = null;
    var gitCommit = "";

    try {
      CommitInfo = require('../../commit_info.js');
      gitCommit = CommitInfo.commit.slice(0, 8);
    } catch (e) {
      console.log("Did not find commit_info.js!");
    }

    this.initAppInfoBox();

    const currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

    var version = "";
    if (this.platformHelper.isElectron()) {
      version = app.getVersion();
    } else if (this.platformHelper.isCordova()) {
      version = await cordova.getAppVersion.getVersionNumber();
    }

    const swordVersion = await ipcNsi.getSwordVersion();
    const chromiumVersion = getChromiumVersion();
    const databasePath = await ipcDb.getDatabasePath();
    const configFilePath = await ipcSettings.getConfigFilePath();

    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    const moduleDescription = await swordModuleHelper.getModuleDescription(currentBibleTranslationId);
    const moduleInfo = await swordModuleHelper.getModuleInfo(currentBibleTranslationId, false, false);

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
        <li><a href='#app-info-tabs-2'>${i18n.t('general.sword-module-details')}</a></li>
        <li><a href='#app-info-tabs-3'>${i18n.t('general.application-info')}</a></li>
        <li><a href='#app-info-tabs-4'>${i18n.t('shortcuts.tab-title')}</a></li>
      </ul>

      <div id='app-info-tabs-1' class='info-tabs scrollable'>
        ${moduleDescription}
      </div>
      
      <div id='app-info-tabs-2' class='info-tabs scrollable'>
        ${moduleInfo}
      </div>

      <div id='app-info-tabs-3' class='info-tabs scrollable'>
        <h2>${i18n.t("general.developers")}</h2>
        <a class='external' href='https://github.com/tobias-klein'>Tobias Klein (Maintainer)</a><br>
        <a class='external' href='https://github.com/zhuiks'>Evgen Kucherov</a>

        <h2>${i18n.t("general.translators")}</h2>
        <a class='external' href='https://github.com/tobias-klein'>Tobias Klein (English, German)</a><br>
        <a class='external' href='https://gitlab.com/lafricain79'>Br Cyrille (French)</a><br>
        <a class='external' href='https://github.com/lemtom'>Tom Lemmens (French, Dutch)</a><br>
        <a class='external' href='https://github.com/reyespinosa1996'>Reinaldo R. Espinosa (Spanish)</a><br>
        <a class='external' href='https://github.com/MartinIIOT'>MartinIIOT (Slovakian)</a><br>
        <a class='external' href='https://github.com/zhuiks'>Evgen Kucherov (Ukrainian, Russian)</a><br>
        <a class='external' href='https://github.com/augustin-colesnic'>Augustin Colesnic (Romanian)</a><br>

        <h2>${i18n.t("general.versions-and-paths")}</h2>
        <table>
          <tr><td style='width: 15em;'>${i18n.t("general.application-version")}:</td><td>${version}</td></tr>
          <tr><td>${i18n.t("general.git-commit")}:</td><td>${gitCommit}</td></tr>
          <tr><td>${i18n.t("general.sword-version")}:</td><td>${swordVersion}</td></tr>
          <tr><td>${i18n.t("general.chromium-version")}:</td><td>${chromiumVersion}</td></tr>
          <tr><td>${i18n.t("general.database-path")}:</td><td>${databasePath}</td></tr>
          <tr><td>${i18n.t("general.config-file-path")}:</td><td>${configFilePath}</td></tr>
        </table>
      </div>

      <div id='app-info-tabs-4' class='info-tabs scrollable'>
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
          
          <tr><td>${i18n.t("shortcuts.summary.copy-selected-verses-to-clipboard")}</td><td><code>${i18n.t("shortcuts.shortcut.copy-selected-verses-to-clipboard")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.enable-dynamic-strongs-display")}</td><td><code>${i18n.t("shortcuts.shortcut.enable-dynamic-strongs-display")}</code></td></tr>
          <tr><td>${i18n.t("shortcuts.summary.open-new-tab")}</td><td><code>${i18n.t("shortcuts.shortcut.open-new-tab")}</code></td></tr>
          ${toggleFullScreenLine}
         
        </table>
      </div>
    </div>`;

    const width = uiHelper.getMaxDialogWidth();
    const offsetLeft = ($(window).width() - width)/2;

    $('#info-popup').dialog({
      width: width,
      title: i18n.t('general.module-application-info'),
      position: [offsetLeft, 120],
      resizable: false
    });

    $('#info-popup-content').empty();
    $('#info-popup-content').html(appInfo.innerHTML);
    $('#app-info-tabs').tabs({ heightStyle: "fill" });
    $('#info-popup').dialog("open");
  }

  enableCurrentAppInfoButton(tabIndex=undefined) {
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

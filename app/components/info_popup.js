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

const CommitInfo = require('../commit_info.js');
const PlatformHelper = require('../helpers/platform_helper.js');

class InfoPopup {
  constructor() {
    this.platformHelper = new PlatformHelper();
    this.initAppInfoBoxDone = false;
    this.initAppInfoButton();
  }

  initAppInfoButton() {
    $('.app-info-button').unbind('click');
    $('.app-info-button').bind('click', async () => {
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

    $('#bible-translation-info-box').dialog({
      width: width,
      height: 500,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  }

  async showAppInfo() {
    this.initAppInfoBox();

    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

    var version = "";
    if (this.platformHelper.isElectron()) {
      version = app.getVersion();
    } else if (this.platformHelper.isCordova()) {
      version = await cordova.getAppVersion.getVersionNumber();
    }

    var gitCommit = CommitInfo.commit.slice(0, 8);
    var swordVersion = await ipcNsi.getSwordVersion();
    var databasePath = await ipcDb.getDatabasePath();
    var configFilePath = await ipcSettings.getConfigFilePath();

    var appInfo = "";
    appInfo += "<div id='app-info-tabs'>";

    appInfo += "<ul>";
    appInfo += `<li><a href='#app-info-tabs-1'>${i18n.t('general.sword-module-description')}</a></li>`;
    appInfo += `<li><a href='#app-info-tabs-2'>${i18n.t('general.sword-module-details')}</a></li>`;
    appInfo += `<li><a href='#app-info-tabs-3'>${i18n.t('general.application-info')}</a></li>`;
    appInfo += "</ul>";

    appInfo += "<div id='app-info-tabs-1' class='info-tabs scrollable'>";
    var moduleInfo = await app_controller.translation_controller.getModuleDescription(currentBibleTranslationId);
    appInfo += moduleInfo;
    appInfo += "</div>";

    appInfo += "<div id='app-info-tabs-2' class='info-tabs scrollable'>";
    var moduleInfo = await app_controller.translation_controller.getModuleInfo(currentBibleTranslationId, false, false);
    appInfo += moduleInfo;
    appInfo += "</div>";

    appInfo += "<div id='app-info-tabs-3' class='info-tabs scrollable'>";
    appInfo += "<table>";
    appInfo += `<tr><td style='width: 11em;'>${i18n.t("general.application-version")}:</td><td>${version}</td></tr>`;
    appInfo += `<tr><td>${i18n.t("general.git-commit")}:</td><td>${gitCommit}</td></tr>`;
    appInfo += `<tr><td>${i18n.t("general.sword-version")}:</td><td>${swordVersion}</td></tr>`;
    appInfo += `<tr><td>${i18n.t("general.database-path")}:</td><td>${databasePath}</td></tr>`;
    appInfo += `<tr><td>${i18n.t("general.config-file-path")}:</td><td>${configFilePath}</td></tr>`;
    appInfo += "</table>";
    appInfo += "</div>";

    appInfo += "</div>";

    var offsetLeft = $(window).width() - 900;

    $('#bible-translation-info-box').dialog({
      title: i18n.t('general.module-application-info'),
      position: [offsetLeft, 120],
      resizable: false
    });

    $('#bible-translation-info-box-content').empty();
    $('#bible-translation-info-box-content').html(appInfo);
    $('#app-info-tabs').tabs({ heightStyle: "fill" });
    $('#bible-translation-info-box').dialog("open");
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
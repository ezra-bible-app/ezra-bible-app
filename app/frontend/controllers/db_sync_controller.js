/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const UiHelper = require('../helpers/ui_helper.js');
const uiHelper = new UiHelper();
const DROPBOX_TOKEN_SETTINGS_KEY = 'dropboxToken';

/**
 * This controller manages the settings for database synchronization. 
 * @module dbSyncController
 * @category Controller
 */

module.exports.showDbSyncConfigDialog = async function() {
  var dialogWidth = 450;
  var dialogHeight = 400;
  var draggable = true;
  var position = [55, 120];

  let dbSyncDialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
  dbSyncDialogOptions.title = i18n.t("general.setup-db-sync");
  dbSyncDialogOptions.buttons = {};

  let dropboxTokenValue = await ipcSettings.get(DROPBOX_TOKEN_SETTINGS_KEY, "");
  $('#dropbox-token').val(dropboxTokenValue);

  dbSyncDialogOptions.buttons[i18n.t("general.save")] = {
    id: 'save-db-sync-config-button',
    text: i18n.t("general.save"),
    click: () => {
      $('#db-sync-box').dialog("close");
      this.saveDbSyncConfiguration();
    }
  };

  dbSyncDialogOptions.buttons[i18n.t("general.cancel")] = {
    id: 'cancel-db-sync-config-button',
    text: i18n.t("general.cancel"),
    click: () => {
      $('#db-sync-box').dialog("close");
    }
  };

  $('#db-sync-box').dialog(dbSyncDialogOptions);
};

module.exports.saveDbSyncConfiguration = async function() {
  let dropboxTokenValue = $('#dropbox-token').val().trim();
  await ipcSettings.set(DROPBOX_TOKEN_SETTINGS_KEY, dropboxTokenValue);
};

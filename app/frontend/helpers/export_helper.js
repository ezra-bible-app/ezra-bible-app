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

module.exports.showSaveDialog = async function (fileLabel, fileExtension=undefined, dialogTitle=undefined) {
  if (platformHelper.isCordova()) return null; //TODO: figure out the way to save files in Cordova

  const dialog = require('@electron/remote').dialog;
  var dialogOptions = getExportDialogOptions(fileLabel, fileExtension, dialogTitle);

  return dialog.showSaveDialog(null, dialogOptions).then(result => {
    const exportFilePath = result.filePath;

    if (!result.canceled && exportFilePath != undefined) {
      return exportFilePath;
    } else {
      return null;
    }
  });
};

function getExportDialogOptions(fileLabel, fileExtension="out", dialogTitle="Export") {
  const app = require('@electron/remote').app;
  var today = new Date();
  var month = getPaddedNumber(today.getMonth() + 1);
  var day = getPaddedNumber(today.getDate());
  var date = today.getFullYear() + '_' + month + '_' + day;
  var fileName = date + '__' + fileLabel + '.' + fileExtension;

  var dialogOptions = {
    defaultPath: app.getPath('documents') + '/' + fileName,
    title: dialogTitle,
    buttonLabel: i18n.t("tags.run-export")
  };

  return dialogOptions;
}

function getPaddedNumber(number) {
  var paddedNumber = "" + number;
  if (number < 10) {
    paddedNumber = "0" + number;
  }
  return paddedNumber;
}

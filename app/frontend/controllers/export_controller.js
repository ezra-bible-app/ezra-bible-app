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

/**
 * The ExportController implements the export of certain verses with notes or tags into a Word document.
 *
 * @category Controller
 */


var exportFilePath = null;


module.exports.showSaveDialog = async function (fileTitle) {
  const dialog = require('electron').remote.dialog;
  var dialogOptions = getExportDialogOptions(fileTitle);

  return dialog.showSaveDialog(null, dialogOptions).then(result => {
    exportFilePath = result.filePath;

    if (!result.canceled && exportFilePath != undefined) {
      return exportFilePath;
    } else {
      return null;
    }
  });
};

function getExportDialogOptions(title) {
  const app = require('electron').remote.app;
  var today = new Date();
  var month = getPaddedNumber(today.getMonth() + 1);
  var day = getPaddedNumber(today.getDate());
  var date = today.getFullYear() + '_' + month + '_' + day;
  var fileName = date + '__' + title + '.docx';

  var dialogOptions = {
    defaultPath: app.getPath('documents') + '/' + fileName,
    title: i18n.t("tags.export-tagged-verse-list"),
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

/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

let sampleTextStylesheet = null;
let bibleTextStylesheet = null;

module.exports.init = async function() {
  let sampleTextStyleEl = $('<style id="sample-text-font" />');
  $("head").append(sampleTextStyleEl);
  sampleTextStylesheet = sampleTextStyleEl[0].sheet;

  let bibleTextStyleEl = $('<style id="bible-text-font" />');
  $("head").append(bibleTextStyleEl);
  bibleTextStylesheet = bibleTextStyleEl[0].sheet;

  const fontFamilySelect = document.getElementById('font-family-select');
  const systemFontSelect = document.getElementById('system-font-select');

  let systemFonts = [];

  if (platformHelper.isElectron()) {
    systemFonts = await ipcGeneral.getSystemFonts();
  } else if (platformHelper.isCordova()) {
    const customFontFamilyOption = document.getElementById('custom-font-family-option');
    customFontFamilyOption.setAttribute('disabled', 'disabled');
    fontFamilySelect.initSelectMenu();
  }

  for (let i = 0; i < systemFonts.length; i++) {
    const option = document.createElement('option');
    let currentSystemFont = systemFonts[i].replaceAll("\"", '');
    option.text = currentSystemFont;
    systemFontSelect.add(option);
  }

  await systemFontSelect.loadOptionFromSettings();
  systemFontSelect.initSelectMenu();

  fontFamilySelect.addEventListener('optionChanged', () => {
    let selectedFontFamily = fontFamilySelect.value;
    handleFontFamilyChange(selectedFontFamily);
  });

  systemFontSelect.addEventListener('optionChanged', () => {
    let selectedFont = systemFontSelect.value;
    applyFontChange(selectedFont, false);
  });

  let selectedFontFamily = fontFamilySelect.value;
  handleFontFamilyChange(selectedFontFamily, true, false);
};

async function initSampleText() {
  const currentTab = app_controller.tab_controller.getTab();
  const currentBibleTranslationId = currentTab.getBibleTranslationId();
  const verses = await ipcNsi.getBookText(currentBibleTranslationId, 'John', 1, 3);

  const sampleText = `<sup>1</sup>&nbsp;${verses[0].content}
                      <sup>2</sup>&nbsp;${verses[1].content}
                      <sup>3</sup>&nbsp;${verses[2].content}`;

  document.getElementById('bible-font-sample-text').innerHTML = sampleText;
}

module.exports.showTypeFaceSettingsDialog = function() {
  const fontFamilySelect = document.getElementById('font-family-select');
  let selectedFontFamily = fontFamilySelect.value;
  handleFontFamilyChange(selectedFontFamily);
  initSampleText();
  showDialog();
};

function handleFontFamilyChange(fontFamily, apply=false, persist=false) {
  let isCustomFontFamily = false;
  let isCustomFont = false;
  let cssFontFamily = "";

  switch (fontFamily) {
    case "system-default":
      break;
    case "sans-serif":
      isCustomFontFamily = true;
      cssFontFamily = "sans-serif";
      break;
    case "serif":
      isCustomFontFamily = true;
      cssFontFamily = "serif";
      break;
    case "custom":
      isCustomFont = true;
      break;
  }

  const systemFontSelect = document.getElementById('system-font-select');
  let selectedFont = systemFontSelect.value;

  if (isCustomFontFamily) {
    applyFontChange(cssFontFamily, apply);
  } else if (!isCustomFont) {
    // Reset to system default
    applyFontChange(undefined, apply);
  }

  if (isCustomFont) {
    systemFontSelect.removeAttribute('disabled');
    applyFontChange(selectedFont, apply);
  } else {
    systemFontSelect.setAttribute('disabled', 'disabled');
  }

  systemFontSelect.initSelectMenu();

  if (persist) {
    ipcSettings.set('bibleTextFontFamily', fontFamily);
    ipcSettings.set('bibleTextSystemFont', selectedFont);
  }
}

function applyFontChange(selectedFont=undefined, apply=false) {
  let sampleTextCss = undefined;
  let bibleTextCss = undefined;
  let sampleTextId = '#bible-font-sample-text';
  let bibleTextId = '.verse-text';

  if (selectedFont != null) {
    sampleTextCss = `${sampleTextId} { font-family: "${selectedFont}" }`;
    bibleTextCss = `${bibleTextId} { font-family: "${selectedFont}" }`;
  }

  saveCssRules(sampleTextStylesheet, sampleTextCss);

  if (apply) {
    saveCssRules(bibleTextStylesheet, bibleTextCss);
  }
}

function showDialog() {
  const $box = $('#config-typeface-box');
  const fontFamilySelect = document.getElementById('font-family-select');

  const width = 640;
  const height = 550;
  const draggable = false;

  let dialogOptions = uiHelper.getDialogOptions(width, height, draggable);

  dialogOptions.dialogClass = 'ezra-dialog config-typeface-dialog';
  dialogOptions.modal = true;
  dialogOptions.autoOpen = true;
  dialogOptions.title = i18n.t("general.type-face.configure-typeface");

  dialogOptions.buttons = {
    Cancel: function() {
      $(this).dialog("close");
    },
    Save: () => {
      let selectedFontFamily = fontFamilySelect.value;
      handleFontFamilyChange(selectedFontFamily, true, true);
      $box.dialog("close");
    }
  };

  $box.dialog(dialogOptions);
  uiHelper.fixDialogCloseIconOnAndroid('config-typeface-dialog');
}

function saveCssRules(stylesheet, cssRules=undefined) {
  while (stylesheet.cssRules.length > 0) {
    stylesheet.deleteRule(0);
  }

  if (cssRules != null && cssRules != "") {
    stylesheet.insertRule(cssRules, stylesheet.cssRules.length);
  }
}


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

let dynamicTextFontStylesheet = null;

module.exports.init = async function() {
  let styleEl = $('<style id="dynamic-text-font" />');
  $("head").append(styleEl);
  dynamicTextFontStylesheet = styleEl[0].sheet;

  const fontFamilySelect = document.getElementById('font-family-select');
  const systemFontSelect = document.getElementById('system-font-select');

  const systemFonts = await ipcGeneral.getSystemFonts();

  for (let i = 0; i < systemFonts.length; i++) {
    const option = document.createElement('option');
    let currentSystemFont = systemFonts[i].replaceAll("\"", '');
    option.text = currentSystemFont;
    systemFontSelect.add(option);
  }

  await systemFontSelect.loadOptionFromSettings();
  systemFontSelect.initSelectMenu();

  const currentTab = app_controller.tab_controller.getTab();
  const currentBibleTranslationId = currentTab.getBibleTranslationId();
  const verses = await ipcNsi.getBookText(currentBibleTranslationId, 'John', 1, 3);

  const sampleText = `<sup>1</sup>&nbsp;${verses[0].content}
                     <sup>2</sup>&nbsp;${verses[1].content}
                     <sup>3</sup>&nbsp;${verses[2].content}`;

  document.getElementById('bible-font-sample-text').innerHTML = sampleText;

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

module.exports.showTypeFaceSettingsDialog = function() {
  const fontFamilySelect = document.getElementById('font-family-select');
  let selectedFontFamily = fontFamilySelect.value;
  handleFontFamilyChange(selectedFontFamily);
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
  let cssRules = undefined;
  let cssClasses = apply ? '#bible-font-sample-text, .verse-text' : '#bible-font-sample-text';

  if (selectedFont != null) {
    cssRules = `${cssClasses} { font-family: "${selectedFont}" }`;
  }

  saveCssRules(cssRules);
}

function showDialog() {
  const $box = $('#config-typeface-box');
  const fontFamilySelect = document.getElementById('font-family-select');

  $box.dialog({
    width: 640,
    height: 550,
    autoOpen: true,
    modal: true,
    title: i18n.t("general.configure-typeface"),
    buttons: {
      Cancel: function() {
        $(this).dialog("close");
      },
      Save: () => {
        let selectedFontFamily = fontFamilySelect.value;
        handleFontFamilyChange(selectedFontFamily, true, true);
        $box.dialog("close");
      }
    }
  });
}

function saveCssRules(cssRules=undefined) {
  while (dynamicTextFontStylesheet.cssRules.length > 0) {
    dynamicTextFontStylesheet.deleteRule(0);
  }

  if (cssRules != null && cssRules != "") {
    dynamicTextFontStylesheet.insertRule(cssRules, dynamicTextFontStylesheet.cssRules.length);
  }
}


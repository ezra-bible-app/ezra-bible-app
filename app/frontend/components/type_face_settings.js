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
let fontsInitialized = false;

module.exports.showTypeFaceSettingsDialog = async function() {
  const box = $('#config-typeface-box');
  const systemFontSelect = document.getElementById('system-font-select');

  if (!fontsInitialized) {
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
    let verses = await ipcNsi.getBookText(currentBibleTranslationId, 'John', 1, 3);

    let sampleText = `<sup>1</sup>&nbsp;${verses[0].content}
                      <sup>2</sup>&nbsp;${verses[1].content}
                      <sup>3</sup>&nbsp;${verses[2].content}`;

    document.getElementById('bible-font-sample-text').innerHTML = sampleText;

    var styleEl = $('<style id="dynamic-text-font" />');
    $("head").append(styleEl);
    dynamicTextFontStylesheet = styleEl[0].sheet;

    systemFontSelect.addEventListener('optionChanged', () => {
      let selectedFont = systemFontSelect.value;

      let cssRules = `#bible-font-sample-text { font-family: "${selectedFont}" }`;
      saveCssRules(cssRules);
    });
    
    fontsInitialized = true;
  }

  box.dialog({
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
        let selectedFont = systemFontSelect.value;
        ipcSettings.set('bibleTextSystemFont', selectedFont);
        let cssRules = `#bible-font-sample-text, .verse-text { font-family: "${selectedFont}" }`;
        saveCssRules(cssRules);
        box.dialog("close");
      }
    }
  });
};

function saveCssRules(cssRules) {
  while (dynamicTextFontStylesheet.cssRules.length > 0) {
    dynamicTextFontStylesheet.deleteRule(0);
  }

  dynamicTextFontStylesheet.insertRule(cssRules, dynamicTextFontStylesheet.cssRules.length);
}


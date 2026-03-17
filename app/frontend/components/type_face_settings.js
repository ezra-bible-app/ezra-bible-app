/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const swordModuleHelper = require('../helpers/sword_module_helper.js');

let sampleTextStylesheet = null;
let textStylesheet = null;
let userContentSampleStylesheet = null;
let userContentStylesheet = null;

// Variables to hold the applier functions
let applyFontChange;
let applyUserContentFontChange;

// Helper function to initialize a stylesheet
function initStylesheet(id) {
  const styleEl = $('<style id="' + id + '" />');
  $('head').append(styleEl);
  return styleEl[0].sheet;
}

module.exports.init = async function() {
  // Initialize stylesheets using the helper function
  sampleTextStylesheet = initStylesheet('sample-text-font');
  textStylesheet = initStylesheet('text-font');
  userContentSampleStylesheet = initStylesheet('user-content-sample-text-font');
  userContentStylesheet = initStylesheet('user-content-text-font');

  // Create font change applier functions
  applyFontChange = createFontChangeApplier(
    sampleTextStylesheet, 
    textStylesheet, 
    '#bible-font-sample-text', 
    '.verse-text, .sword-section-title, .commentary-content, .commentary-name, .word-study-title, .dictionary-content, .book-intro'
  );
  
  applyUserContentFontChange = createFontChangeApplier(
    userContentSampleStylesheet, 
    userContentStylesheet, 
    '#user-content-sample-text', 
    '.tag, .verse-notes, .CodeMirror-lines'
  );

  // Get DOM elements
  const fontFamilySelect = document.getElementById('font-family-select');
  const systemFontSelect = document.getElementById('system-font-select');
  const userContentFontFamilySelect = document.getElementById('user-content-font-family-select');
  const userContentSystemFontSelect = document.getElementById('user-content-system-font-select');

  let systemFonts = [];

  if (platformHelper.isElectron()) {
    systemFonts = await ipcGeneral.getSystemFonts();
  } else if (platformHelper.isCordova()) {
    const customFontFamilyOption = document.getElementById('custom-font-family-option');
    customFontFamilyOption.setAttribute('disabled', 'disabled');
    fontFamilySelect.initSelectMenu();
    
    const customUserContentFontFamilyOption = document.getElementById('custom-user-content-font-family-option');
    customUserContentFontFamilyOption.setAttribute('disabled', 'disabled');
    userContentFontFamilySelect.initSelectMenu();
  }

  // Populate system fonts for both selects
  for (let i = 0; i < systemFonts.length; i++) {
    const option = document.createElement('option');
    const userContentOption = document.createElement('option');
    
    let currentSystemFont = systemFonts[i].replaceAll('"', '');
    
    option.text = currentSystemFont;
    userContentOption.text = currentSystemFont;
    
    systemFontSelect.add(option);
    userContentSystemFontSelect.add(userContentOption);
  }

  // Initialize selects
  await systemFontSelect.loadOptionFromSettings();
  systemFontSelect.initSelectMenu();
  
  await userContentSystemFontSelect.loadOptionFromSettings();
  userContentSystemFontSelect.initSelectMenu();

  // Set up event listeners for content font
  fontFamilySelect.addEventListener('optionChanged', () => {
    let selectedFontFamily = fontFamilySelect.value;
    handleFontFamilyChange(selectedFontFamily);
    
    // If user content is set to "same as content", update it too
    if (userContentFontFamilySelect.value === 'same-as-content') {
      applyUserContentFontChange(getEffectiveContentFont(), false);
    }
  });

  systemFontSelect.addEventListener('optionChanged', () => {
    let selectedFont = systemFontSelect.value;
    applyFontChange(selectedFont, false);
    
    // If user content is set to "same as content", update it too
    if (userContentFontFamilySelect.value === 'same-as-content') {
      applyUserContentFontChange(selectedFont, false);
    }
  });

  // Set up event listeners for user content font
  userContentFontFamilySelect.addEventListener('optionChanged', () => {
    let selectedFontFamily = userContentFontFamilySelect.value;
    handleUserContentFontFamilyChange(selectedFontFamily);
  });

  userContentSystemFontSelect.addEventListener('optionChanged', () => {
    let selectedFont = userContentSystemFontSelect.value;
    applyUserContentFontChange(selectedFont, false);
  });

  // Initial setup
  let selectedFontFamily = fontFamilySelect.value;
  handleFontFamilyChange(selectedFontFamily, true, false);
  
  let selectedUserContentFontFamily = userContentFontFamilySelect.value;
  handleUserContentFontFamilyChange(selectedUserContentFontFamily, true, false);
};

// Get the effective content font based on current settings
function getEffectiveContentFont() {
  const fontFamilySelect = document.getElementById('font-family-select');
  const systemFontSelect = document.getElementById('system-font-select');
  
  let fontFamily = fontFamilySelect.value;
  
  if (fontFamily === 'serif') {
    return 'serif';
  } else if (fontFamily === 'custom') {
    return systemFontSelect.value;
  } else {
    return undefined; // Default sans-serif
  }
}

// User content font family change handler
function handleUserContentFontFamilyChange(fontFamily, apply=false, persist=false) {
  let isCustomFontFamily = false;
  let isCustomFont = false;
  let isSameAsContent = false;
  let cssFontFamily = '';

  switch (fontFamily) {
    case 'sans-serif':
      break;
    case 'serif':
      isCustomFontFamily = true;
      cssFontFamily = 'serif';
      break;
    case 'custom':
      isCustomFont = true;
      break;
    case 'same-as-content':
      isSameAsContent = true;
      break;
  }

  const userContentSystemFontSelect = document.getElementById('user-content-system-font-select');
  let selectedFont = userContentSystemFontSelect.value;

  if (isCustomFontFamily) {
    applyUserContentFontChange(cssFontFamily, apply);
  } else if (isSameAsContent) {
    // Use the same font as content
    applyUserContentFontChange(getEffectiveContentFont(), apply);
  } else if (!isCustomFont) {
    // Reset to system default (sans-serif)
    applyUserContentFontChange(undefined, apply);
  }

  if (isCustomFont) {
    userContentSystemFontSelect.removeAttribute('disabled');
    applyUserContentFontChange(selectedFont, apply);
  } else {
    userContentSystemFontSelect.setAttribute('disabled', 'disabled');
  }

  userContentSystemFontSelect.initSelectMenu();

  if (persist) {
    ipcSettings.set('userContentTextFontFamily', fontFamily);
    ipcSettings.set('userContentTextSystemFont', selectedFont);
  }
}

// Create a font change applier function with preconfigured parameters
function createFontChangeApplier(sampleStylesheet, contentStylesheet, sampleTextId, textClasses) {
  return function(selectedFont=undefined, apply=false) {
    let sampleTextCss = undefined;
    let textCss = undefined;

    if (selectedFont != null) {
      sampleTextCss = `${sampleTextId} { font-family: '${selectedFont}' }`;
      textCss = `${textClasses} { font-family: '${selectedFont}' }`;
    }

    saveCssRules(sampleStylesheet, sampleTextCss);

    if (apply) {
      saveCssRules(contentStylesheet, textCss);
    }
  };
}

async function initSampleText() {
  // Initialize Bible text sample as before
  const currentTab = app_controller.tab_controller.getTab();
  const currentBibleTranslationId = currentTab.getBibleTranslationId();
  const moduleIsRightToLeft = await swordModuleHelper.moduleIsRTL(currentBibleTranslationId);

  let sampleText = '';

  if (currentBibleTranslationId != null) {
    const verses = await ipcNsi.getBookText(currentBibleTranslationId, 'John', 1, 3);

    if (verses.length == 3) {
      sampleText = `<sup>1</sup>&nbsp;${verses[0].content}
                    <sup>2</sup>&nbsp;${verses[1].content}
                    <sup>3</sup>&nbsp;${verses[2].content}`;
    }
  } else {
    sampleText = `<sup>1</sup>In the beginning was the Word, and the Word was with God, and the Word was God.
                  <sup>2</sup>He was in the beginning with God.
                  <sup>3</sup>All things came into being through Him, and apart from Him not even one thing came into being that has come into being.`;
  }

  let box = document.getElementById('bible-font-sample-text');

  if (moduleIsRightToLeft) {
    box.style.direction = 'rtl';
  } else {
    box.style.direction = 'unset';
  }

  box.innerHTML = sampleText;
  
  // Initialize user content sample text
  let userContentSample = document.getElementById('user-content-sample-text');
  userContentSample.innerHTML = `
    <div style="margin-top: 0.5em;">
      <p style="margin: 0;">This is a sample note with <strong>Markdown</strong> formatting. It shows how your notes will appear.</p>
    </div>
  `;
}

module.exports.showTypeFaceSettingsDialog = function() {
  const fontFamilySelect = document.getElementById('font-family-select');
  let selectedFontFamily = fontFamilySelect.value;
  handleFontFamilyChange(selectedFontFamily);
  
  const userContentFontFamilySelect = document.getElementById('user-content-font-family-select');
  let selectedUserContentFontFamily = userContentFontFamilySelect.value;
  handleUserContentFontFamilyChange(selectedUserContentFontFamily);
  
  initSampleText();
  showDialog();
};

function handleFontFamilyChange(fontFamily, apply=false, persist=false) {
  let isCustomFontFamily = false;
  let isCustomFont = false;
  let cssFontFamily = '';

  switch (fontFamily) {
    case 'sans-serif':
      break;
    case 'serif':
      isCustomFontFamily = true;
      cssFontFamily = 'serif';
      break;
    case 'custom':
      isCustomFont = true;
      break;
  }

  const systemFontSelect = document.getElementById('system-font-select');
  let selectedFont = systemFontSelect.value;

  if (isCustomFontFamily) {
    applyFontChange(cssFontFamily, apply);
  } else if (!isCustomFont) {
    // Reset to system default (sans-serif)
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
    ipcSettings.set('contentTextFontFamily', fontFamily);
    ipcSettings.set('contentTextSystemFont', selectedFont);
  }
}

function showDialog() {
  const $box = $('#config-typeface-box');
  const fontFamilySelect = document.getElementById('font-family-select');
  const userContentFontFamilySelect = document.getElementById('user-content-font-family-select');

  const width = 700; // Adjusted width for row-based layout
  const height = 570; // Adjusted height for row-based layout
  const draggable = false;

  let dialogOptions = uiHelper.getDialogOptions(width, height, draggable);

  dialogOptions.dialogClass = 'ezra-dialog config-typeface-dialog';
  dialogOptions.modal = true;
  dialogOptions.autoOpen = true;
  dialogOptions.title = i18n.t('general.type-face.configure-typeface');

  dialogOptions.buttons = {
    Cancel: function() {
      $(this).dialog('close');
    },
    Save: () => {
      // Apply content font settings
      let selectedFontFamily = fontFamilySelect.value;
      handleFontFamilyChange(selectedFontFamily, true, true);
      
      // Apply user content font settings
      let selectedUserContentFontFamily = userContentFontFamilySelect.value;
      handleUserContentFontFamilyChange(selectedUserContentFontFamily, true, true);
      
      $box.dialog('close');
    }
  };

  Mousetrap.bind('esc', () => { $box.dialog('close'); });
  $box.dialog(dialogOptions);
  uiHelper.fixDialogCloseIconOnCordova('config-typeface-dialog');
}

function saveCssRules(stylesheet, cssRules=undefined) {
  while (stylesheet.cssRules.length > 0) {
    stylesheet.deleteRule(0);
  }

  if (cssRules != null && cssRules != '') {
    stylesheet.insertRule(cssRules, stylesheet.cssRules.length);
  }
}


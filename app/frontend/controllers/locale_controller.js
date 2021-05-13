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

const AVAILABLE_LOCALES = ['de', 'en', 'nl', 'fr', 'es', 'sk', 'uk', 'ru'];
const FALLBACK_LOCALE = 'en';
const SETTINGS_KEY = 'appLocale';

const jqueryI18next = require('jquery-i18next');

const i18nextOptions = {
  debug: false,
  interpolation: {
    escapeValue: false
  },
  saveMissing: false,
  fallbackLng: FALLBACK_LOCALE,
  whitelist: AVAILABLE_LOCALES,
  react: {
    wait: false
  }
};

var systemLocale;

async function initI18N() {
  window.i18n = require('i18next');
  const I18nIpcBackend = require('../ipc/i18n_ipc_backend.js');

  const I18nHelper = require('../helpers/i18n_helper.js');
  window.i18nHelper = new I18nHelper();

let LanguageDetector = null;

  if (platformHelper.isElectron()) {
    LanguageDetector = require('i18next-electron-language-detector');
  } else {
    const _LanguageDetector = require('../platform/i18next_browser_language_detector.js');
    LanguageDetector = new _LanguageDetector();
  }

  await i18n
    .use(LanguageDetector)
    .use(I18nIpcBackend)
    .init(i18nextOptions);

  systemLocale = i18n.language;  

  jqueryI18next.init(i18n, $, {
    tName: 't', // --> appends $.t = i18next.t
    i18nName: 'i18n', // --> appends $.i18n = i18next
    handleName: 'localize', // --> appends $(selector).localize(opts);
    selectorAttr: 'i18n', // selector for translating elements
    targetAttr: 'i18n-target', // data-() attribute to grab target element to translate (if different than itself)
    optionsAttr: 'i18n-options', // data-() attribute that contains options, will load/set if useOptionsAttr = true
    useOptionsAttr: false, // see optionsAttr
    parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
  });

  if (await ipcSettings.has(SETTINGS_KEY)) {
    await i18n.changeLanguage(await ipcSettings.get(SETTINGS_KEY, FALLBACK_LOCALE));
  }

  if (platformHelper.isTest()) { // Use English for test mode
    await i18n.changeLanguage('en');
  }

  window.reference_separator = i18n.t('general.chapter-verse-separator');

}

async function changeLocale(newLlocale) {

  await i18n.changeLanguage(newLlocale);

  await ipcSettings.set(SETTINGS_KEY, newLlocale);

  $(document).localize();

  // Todo: Bind to event in respective dependent components instead
  window.reference_separator = i18n.t('general.chapter-verse-separator');
  await app_controller.book_selection_menu.localizeBookSelectionMenu();
  await app_controller.assign_last_tag_button.updateLabel();
  await app_controller.verse_selection.updateSelectedVersesLabel();
  await app_controller.tab_controller.updateTabTitleAfterLocaleChange();
  app_controller.tab_controller.localizeTemplate();
  await app_controller.updateTagsView(undefined, true);
  tags_controller.refreshTagDialogs();

}

async function detectLocale() {
  await changeLocale(systemLocale || FALLBACK_LOCALE);
}

function getAvailableLocales() {
  return AVAILABLE_LOCALES.sort();
}



module.exports.initI18N = initI18N;
module.exports.changeLocale = changeLocale;
module.exports.detectLocale = detectLocale;
module.exports.getAvailableLocales = getAvailableLocales;
/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

const PlatformHelper = require('../../lib/platform_helper.js');
const jqueryI18next = require('jquery-i18next');

const i18nextOptions = {
  debug: false,
  interpolation: {
    escapeValue: false
  },
  saveMissing: false,
  fallbackLng: 'en',
  whitelist: ['de', 'en', 'nl', 'fr', 'es', 'sk'],
  react: {
    wait: false
  }
};

class I18nHelper {
  constructor() {
    this._platformHelper = new PlatformHelper();
  }

  async init() {
    window.i18n = require('i18next');
    const I18nIpcBackend = require('../ipc/i18n_ipc_backend.js');

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
  }

  async getSwordTranslation(originalString) {
    return await ipcNsi.getSwordTranslation(originalString, i18n.language);
  }

  async getBookAbbreviation(bookCode) {
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    return await ipcNsi.getBookAbbreviation(currentBibleTranslationId, bookCode, i18n.language);
  }

  async getSpecificTranslation(lang, key) {
    var origLang = i18n.language;

    await i18n.changeLanguage(lang);
    var specificTranslation = i18n.t(key);
    await i18n.changeLanguage(origLang);

    return specificTranslation;
  }

  async getChapterTranslation(lang) {
    return await this.getSpecificTranslation(lang, 'bible-browser.chapter');
  }

  async getPsalmTranslation(lang) {
    return await this.getSpecificTranslation(lang, 'bible-browser.psalm');
  }

  getLocalizedDate(timestamp) {
    return new Date(Date.parse(timestamp)).toLocaleDateString(i18n.language);
  }
}

module.exports = I18nHelper;

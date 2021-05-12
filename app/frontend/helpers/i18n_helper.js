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

const PlatformHelper = require('../../lib/platform_helper.js');
class I18nHelper {
  constructor() {
    this._platformHelper = new PlatformHelper();
    this._isCordova = this._platformHelper.isCordova();
  }


  getLocale() {
    var lang = i18n.language;
    return lang.slice(0, 2); // just in case we got language region code (i.e "en-US") we want only language code ("en")
  }

  async getSwordTranslation(originalString) {
    return await ipcNsi.getSwordTranslation(originalString, i18n.language);
  }

  async getBookAbbreviation(bookCode) {
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    return await ipcNsi.getBookAbbreviation(currentBibleTranslationId, bookCode, this.getLocale());
  }

  async getSpecificTranslation(lang, key) {
    var specificTranslation = i18n.t(key, { lng: lang }); // https://www.i18next.com/translation-function/essentials

    return specificTranslation;
  }

  async getChapterTranslation(lang) {
    var language = lang || this.getLocale();

    return await this.getSpecificTranslation(language, 'bible-browser.chapter');
  }

  async getPsalmTranslation(lang) {
    var language = lang || this.getLocale();

    return await this.getSpecificTranslation(language, 'bible-browser.psalm');
  }

  getLocalizedDate(timestamp) {
    var language = this.getLocale();
    return new Date(Date.parse(timestamp)).toLocaleDateString(language);
  }

  getLocaleName(code, includeNativeName = false, currentLocale = null) {
    currentLocale = currentLocale || this.getLocale();
    const localeName = (new Intl.DisplayNames(currentLocale, { type: 'language' })).of(code);
    const titleCased = localeName.slice(0,1).toLocaleUpperCase() + localeName.slice(1);

    const langNative = includeNativeName && code !== currentLocale ? ` (${(new Intl.DisplayNames(code, { type: 'language' })).of(code)})` : '';
    return titleCased + langNative;
  }
}

module.exports = I18nHelper;

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
 * This module contains utility functions to get various locale specific data (internationalization functions)
 * @module i18NHelper
 * @category Utility
 */


const i18nController = require('../controllers/i18n_controller.js');
const languageMapper = require('../../lib/language_mapper.js');

module.exports.getReferenceSeparator = async function(moduleCode=undefined) {
  if (moduleCode == undefined) {
    
    return reference_separator;

  } else {
    var moduleReferenceSeparator = reference_separator;
    
    try {
      var localModule = await ipcNsi.getLocalModule(moduleCode);
      moduleReferenceSeparator = await this.getSpecificTranslation(localModule.language, 'general.chapter-verse-separator');
    } catch (e) {}
    
    return moduleReferenceSeparator;
  }
};

module.exports.getSwordTranslation = async function(originalString) {
  return await ipcNsi.getSwordTranslation(originalString, i18nController.getLocale());
};

module.exports.getBookAbbreviation = async function(bookCode) {
  var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  return await ipcNsi.getBookAbbreviation(currentBibleTranslationId, bookCode, i18nController.getLocale());
};

module.exports.getSpecificTranslation = async function(lang, key) {
  var specificTranslation = i18n.t(key, { lng: lang }); // https://www.i18next.com/translation-function/essentials

  return specificTranslation;
};

module.exports.getChapterTranslation = async function(lang) {
  var locale = lang || i18nController.getLocale();

  return await this.getSpecificTranslation(locale, 'bible-browser.chapter');
};

module.exports.getPsalmTranslation = async function(lang) {
  var language = lang || i18nController.getLocale();

  return await this.getSpecificTranslation(language, 'bible-browser.psalm');
};

module.exports.getLocalizedDate = function(timestamp) {
  var locale = i18nController.getLocale();
  return new Date(Date.parse(timestamp)).toLocaleDateString(locale);
};

/**
 * Function to get localized language name. Uses module:languageMapper.getLanguageName under the hood
 * @param {string} code 2-letter ISO 639-1 or 3-letter ISO 639-2/T  or 3-letter language code
 * @param {boolean} [includeNativeName=false] either to add an extra native name in parenthesis 
 * @param {string} [currentLocale=null] language code to return language name in (language name localization). If not provided uses current app locale
 * @returns {string} localized language name if available. Otherwise language name in default locale (English) or initial language code
 */
module.exports.getLanguageName = function(code, includeNativeName=false, currentLocale=null) {
  currentLocale = currentLocale || i18nController.getLocale();
  var localeName = languageMapper.getLanguageName(code, currentLocale);

  if (localeName) {
    const nativeLocaleName = includeNativeName && code !== currentLocale ? languageMapper.getLanguageName(code, code) : undefined;
    return localeName + (nativeLocaleName ? ` (${nativeLocaleName})` : '');
  }

  localeName = languageMapper.getLanguageName(code); // get locale name without localization

  return localeName || code;
};

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

/**
 * This module contains utility functions to get language name and details by ISO language code or vise versa
 * @module languageMapper
 * @category Utility
 */

var mappingExistsCache = {};

/**
 * Function to get language name based on ISO language code. Caches returned values by localeCode
 * @param {string} languageCode 2-letter ISO 639-1 or 3-letter ISO 639-2/T or 3-letter language code, might have optional sub-tags for Script and Region that won't be used. See getLanguageDetails
 * @param {string} [localeCode='en'] locale/language code to localize language name into
 * @returns {(string|undefined)} localized language name or undefined if there is no localization available
 */
module.exports.getLanguageName = (languageCode, localeCode='en') => {
  if (mappingExistsCache[languageCode] && mappingExistsCache[languageCode][localeCode]) {
    return mappingExistsCache[languageCode][localeCode];
  }

  const details = this.getLanguageDetails(languageCode, localeCode);
  const languageName = details.localized || localeCode === 'en' ? details.languageName : undefined;

  if (!mappingExistsCache[languageCode]) {
    mappingExistsCache[languageCode] = {};
  }
  mappingExistsCache[languageCode][localeCode] = languageName;

  return languageName;
};

/**
 * @typedef {Object} LanguageDetails
 * @property {string} languageCode Initial normalized 2-letter ISO 639-1 or 3-letter ISO 639-2/T or 3-letter ISO 639-3 language code (without Script or Region sub-tags)
 * @property {string} languageName Language name localized or in English
 * @property {(string|undefined)} languageScript Script name based on 4-letter ISO-15924 script sub-tag (i.e. Cyrillic, Arabic, Latin...)
 * @property {(string|undefined)} languageRegion Region name based on 2-letter ISO 3166-1 region sub-tag (i.e. US, GB...)
 * @property {boolean} localized Are languageName, languageScript, languageRegion localized
 * @property {string} type ISO 639-3 language type (i.e. 'living', 'historical', 'constructed')
 * @property {string} scope ISO 639-3 language scope (i.e. 'individual', 'macrolanguage') See https://en.wikipedia.org/wiki/ISO_639:a
 * @property {(string|undefined)} iso6393 ISO 693-3 3-letter language code
 * @property {(string|undefined)} iso6392B ISO 693-2/B 3-letter language code
 * @property {(string|undefined)} iso6392T ISO 693-2/T 3-letter language code
 * @property {(string|undefined)} iso6391 ISO 693-1 2-letter language code
 */

/**
 * Function to get various language details
 * @param {string} languageCode Language identifier is a combination of sub-tags (Language[-Script][-Region]) for Language and optionally Script, and/or Region, according to BCP 47 and RFC 4647
 * @param {string} [localeCode='en'] Locale/Language code to localize language information into
 * @returns {LanguageDetails} details Language details 
 */
module.exports.getLanguageDetails = function (languageCode, localeCode='en') {

  var [normalizedCode, scriptCode, regionCode] = languageCode.split('-');
  if (scriptCode && scriptCode.length < 4) { // if a only a regionCode
    regionCode = scriptCode;
    scriptCode = undefined;
  }

  const details = getDetailsByCode(normalizedCode);
  if (!details) {
    console.log(`Can't find details for the "${languageCode}" (${normalizedCode}) language`);
    return {};
  }

  var languageName;
  var localized = false;

  if (languageCode === localeCode && regionCode && details.regions && details.regions[regionCode]) {
    languageName = details.regions[regionCode].name;
    localized = true;
  } else if (details[localeCode]) {
    languageName = details[localeCode];
    localized = true;
  } else {
    languageName = details.en && details.name && details.en != details.name ? `${details.en} (${details.name})` : details.en || details.name;
  }
  languageName = languageName.replace("(individual language)", "").trim(); // this phrase is not useful in the Install Assistant language list


  var languageScript;
  if (scriptCode) {
    const scriptDetails = getDetailsByCode(scriptCode);

    if (scriptDetails) {
      languageScript = scriptDetails[localeCode] || scriptDetails["en"];
    } else {
      console.log(`Can't retrieve script details for ${scriptCode}.`);
    }
  }

  var languageRegion;
  if (regionCode) {
    if (details.regions && details.regions[regionCode]) {
      languageRegion = details.regions[regionCode][localeCode];
    } else {
      console.log(`Can't map ${normalizedCode}-${regionCode} region`, details);
    }
  }

  return {
    ...details,
    localized,
    languageCode: normalizedCode,
    languageName,
    languageScript,
    languageRegion,
  };
};

var langData;
function getDetailsByCode(code) {
  if (!langData) {
    langData = require('../../lib/languages.json');
  }
  return langData[code];
}

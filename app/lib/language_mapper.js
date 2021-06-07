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


const hasIntlDisplayNames = Intl && typeof Intl === "object" && typeof Intl.DisplayNames === "function";

var mappingExistsCache = {};
module.exports.getLanguageName = (languageCode, localeCode = 'en') => {
  if (mappingExistsCache[languageCode] && mappingExistsCache[languageCode][localeCode]) {
    return mappingExistsCache[languageCode][localeCode];
  }

  const { languageName } = this.getLanguageDetails(languageCode, localeCode);

  if (!mappingExistsCache[languageCode]) {
    mappingExistsCache[languageCode] = {};
  }
  mappingExistsCache[languageCode][localeCode] = languageName;

  return languageName;
};

module.exports.getLanguageDetails = function (languageCode, localeCode = 'en') {

  var [normalizedCode, scriptCode, regionCode] = languageCode.split('-');
  if (scriptCode && scriptCode.length < 4) { // if a only a regionCode
    regionCode = scriptCode;
    scriptCode = undefined;
  }

  const details = findLanguage(normalizedCode);

  var languageName;
  var localized = false;
  // Try to get localized name through standard Internationalization API
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/of
  if (hasIntlDisplayNames) {
    languageName = (new Intl.DisplayNames(localeCode, { type: 'language', fallback: 'none' })).of(normalizedCode);
  }
  if (!languageName) { // fallback to ISO-693.3 name
    languageName = details.name;
  } else {
    languageName = toTitleCase(languageName);
    localized = true;
  }

  var languageScript;
  if (scriptCode && hasIntlDisplayNames) {
    languageScript = (new Intl.DisplayNames(localeCode, { type: 'script', fallback: 'none' })).of(scriptCode);
  }

  var languageRegion;
  if (regionCode && hasIntlDisplayNames) {
    languageScript = (new Intl.DisplayNames(localeCode, { type: 'region', fallback: 'none' })).of(regionCode);
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

module.exports.getLanguageCode = function(languageName) {
  var langs = getLangs();

  for (var i = 0; i < langs.length; i++) {
    var currentLang = langs[i];

    if (currentLang.name == languageName) {
      if (currentLang.iso6391 != null) {
        return currentLang.iso6391;
      }

      if (currentLang.iso6392T != null) {
        return currentLang.iso6392T;
      }

      if (currentLang.iso6392B != null) {
        return currentLang.iso6392B;
      }

      if (currentLang.iso6393 != null) {
        return currentLang.iso6393;
      }
    }
  }

  return null;
};

function findLanguage(normalizedCode) {
  const langs = getLangs();

  for (let i = 0; i < langs.length; i++) {
    const currentLang = langs[i];
    if (mappingMatchesCode(currentLang, normalizedCode)) {
      return currentLang;
    }
  }
  return {};
}

var langs = null;
function getLangs() {
  if (langs == null) {
    langs = require('iso-639-3');
  }

  return langs;
}

function mappingMatchesCode(mapping, languageCode) {
  return (languageCode == mapping.iso6393 ||
    languageCode == mapping.iso6392B ||
    languageCode == mapping.iso6392T ||
    languageCode == mapping.iso6391);
}

function toTitleCase(str) {
  return str.slice(0, 1).toLocaleUpperCase() + str.slice(1);
}

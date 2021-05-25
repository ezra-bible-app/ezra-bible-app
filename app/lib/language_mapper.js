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

function normalizeLanguageCode(languageCode) {
  var normalizedCode = languageCode.split('-');
  return normalizedCode[0];
}

var mappingExistsCache = {};
module.exports.mappingExists = function (languageCode) {
  if (languageCode in mappingExistsCache) {
    return mappingExistsCache[languageCode];

  } else {
    mappingExistsCache[languageCode] = this.getLanguageName(languageCode);

    return mappingExistsCache[languageCode];
  }
}

function toTitleCase(str) {
  return str.slice(0, 1).toLocaleUpperCase() + str.slice(1);
}

module.exports.getLanguageName = function (languageCode, localeCode = 'en') {
  if (mappingExistsCache[languageCode] && mappingExistsCache[languageCode][localeCode]) {
    return mappingExistsCache[languageCode][localeCode];
  }
  
  var languageName = "";
  if (Intl && typeof Intl === "object") {
    languageName = (new Intl.DisplayNames(localeCode, { type: 'language' })).of(languageCode);
  }

  let languageNameParts = languageName.split(' '); // Intl.DisplayName might know only second script part
  const normalizedCode = normalizeLanguageCode(languageCode);
  if (languageNameParts[0].length && normalizedCode !== languageNameParts[0]) { // If the first part is not a code
    languageName = toTitleCase(languageName);
  } else {

    const langs = getLangs();

    for (let i = 0; i < langs.length; i++) {
      const currentLang = langs[i];
      if (mappingMatchesCode(currentLang, normalizedCode)) {
        languageNameParts[0] = currentLang.name;
        return languageNameParts.join(' ');
      }
    }
  }
  if (!mappingExistsCache[languageCode]) {
    mappingExistsCache[languageCode] = {};
  } 
  mappingExistsCache[languageCode][localeCode] = languageName;
  return languageName;
}

module.exports.getLanguageCode = function (languageName) {
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
}


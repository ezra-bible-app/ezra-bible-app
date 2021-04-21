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

class LanguageMapper {
  constructor() {
    this.mappingExistsCache = {};
    this.langs = null;
  }

  getLangs() {
    if (this.langs == null) {
      this.langs = require('iso-639-3');
    }

    return this.langs;
  }

  mappingMatchesCode(mapping, languageCode) {
    return (languageCode == mapping.iso6393 ||
            languageCode == mapping.iso6392B ||
            languageCode == mapping.iso6392T ||
            languageCode == mapping.iso6391);
  }

  normalizeLanguageCode(languageCode) {
    var normalizedCode = languageCode.split('-');
    return normalizedCode[0];
  }

  mappingExists(languageCode) {
    if (languageCode in this.mappingExistsCache) {

      return this.mappingExistsCache[languageCode];

    } else {
      var normalizedCode = this.normalizeLanguageCode(languageCode);

      var langs = this.getLangs();
      for (var i = 0; i < langs.length; i++) {
        var currentLang = langs[i];

        if (this.mappingMatchesCode(currentLang, normalizedCode)) {
          this.mappingExistsCache[languageCode] = true;
          return true;
        }
      }

      this.mappingExistsCache[languageCode] = false;
      return false;
    }
  }

  getLanguageName(languageCode) {
    var normalizedCode = this.normalizeLanguageCode(languageCode);
    var langs = this.getLangs();

    for (var i = 0; i < langs.length; i++) {
      var currentLang = langs[i];
      if (this.mappingMatchesCode(currentLang, normalizedCode)) {
        return currentLang.name;
      }
    }

    return null;
  }

  getLanguageCode(languageName) {
    var langs = this.getLangs();

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
}

module.exports = LanguageMapper;

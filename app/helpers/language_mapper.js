/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

const langs = require('iso-639-3');
   
class LanguageMapper {
  constructor() {
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
    var normalizedCode = this.normalizeLanguageCode(languageCode);

    for (var i = 0; i < langs.length; i++) {
      var currentLang = langs[i];

      if (this.mappingMatchesCode(currentLang, normalizedCode)) {
        return true;
      }
    }

    return false;
  }

  getLanguageName(languageCode) {
    var normalizedCode = this.normalizeLanguageCode(languageCode);

    for (var i = 0; i < langs.length; i++) {
      var currentLang = langs[i];
      if (this.mappingMatchesCode(currentLang, normalizedCode)) {
        return currentLang.name;
      }
    }

    return null;
  }

  getLanguageCode(languageName) {
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
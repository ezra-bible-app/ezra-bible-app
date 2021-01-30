/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

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

class I18NextBrowserLanguageDetector {
  constructor() {
    this.type = 'languageDetector';
    this.async = false;
  }

  init(services, detectorOptions, i18nextOptions) {
    /* use services and options */
  }

  detect(callback) { // You'll receive a callback if you passed async true
    /* return detected language */
    // callback('de'); if you used the async flag

    var navigatorLanguage = navigator.language;

    if (navigatorLanguage.indexOf('-') != -1) {
      navigatorLanguage = navigatorLanguage.split('-')[0];
    }
    
    return navigatorLanguage;
  }

  cacheUserLanguage(lng) {
    /* cache language */
  }
}

module.exports = I18NextBrowserLanguageDetector;
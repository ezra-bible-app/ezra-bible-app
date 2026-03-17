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

const locales = require('../../../locales/locales.json');

function detect() {
  var locale; // this can be either 4 letter (en-US) or 2 letter (en)

  if (platformHelper.isElectronRenderer()) {
    const app = require('@electron/remote').app;
    locale = app.getLocale();

  } else if (platformHelper.isElectronMain()) {    
    const app = require('electron');
    locale = app.getLocale();

  } else {
    locale = navigator.language;
  }
  
  // match detected locale to the list of available locales
  
  // if full match
  if (locales.available.includes(locale)) { 
    return locale;
  }

  // if only language match, e.g. "en"
  const firstPart = locale.split('-')[0];
  if (locales.available.includes(firstPart)) {
    return firstPart;
  }

  const sameLangDiffRegions = locales.available.find(l => l.split('-')[0] === firstPart);
  if (sameLangDiffRegions) {
    return sameLangDiffRegions;
  }

  //if no match return detected locale
  return locale;
}

module.exports = {
  'init': Function.prototype,
  'type': 'languageDetector',
  'detect': detect,
  'cacheUserLanguage': Function.prototype
};

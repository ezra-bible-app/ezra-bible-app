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

const IpcRenderer = require('./ipc_renderer.js');
const PlatformHelper = require('../../lib/platform_helper.js');

const TRANSLATION_CACHE_PREFIX = 'ezra.i18nTranslationCache.';

class IpcI18n {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
    this._platformHelper = new PlatformHelper();
    this._isCordova = this._platformHelper.isCordova();
  }

  async getTranslation(language) {
    // On Cordova, return the cached translation immediately if available so that
    // i18n initialization can proceed without waiting on the (possibly not-yet-ready)
    // node backend. The cache is refreshed in the background via refreshTranslation()
    // once the backend is responsive (see cordova_platform.js).
    if (this._isCordova) {
      const cached = this._readCachedTranslation(language);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Reading the translation file from the disk may take a while on slower/older devices ...
    // That's why we change the default timeout to 20s (instead of just 2s)
    var timeoutMs = 20000;

    if (this._isCordova) console.time('getTranslation');

    var translationObject = await this._ipcRenderer.callWithTimeout('i18n_get_translation', timeoutMs, language);

    if (this._isCordova) console.timeEnd('getTranslation');

    if (this._isCordova && translationObject) {
      this._writeCachedTranslation(language, translationObject);
    }

    return translationObject;
  }

  /**
   * Force a fresh fetch of the translation for the given language and update the
   * localStorage cache. Intended to be called after the node backend is fully
   * initialized (e.g. on Cordova in the on-startup-completed handler) so that the
   * next app launch picks up the latest translation.
   */
  async refreshTranslation(language) {
    var timeoutMs = 20000;
    try {
      const translationObject = await this._ipcRenderer.callWithTimeout('i18n_get_translation', timeoutMs, language);
      if (translationObject) {
        this._writeCachedTranslation(language, translationObject);
      }
      return translationObject;
    } catch (e) {
      console.warn('refreshTranslation failed for', language, e);
      return null;
    }
  }

  _readCachedTranslation(language) {
    try {
      const raw = localStorage.getItem(TRANSLATION_CACHE_PREFIX + language);
      if (raw === null) return undefined;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to read cached translation for', language, e);
      return undefined;
    }
  }

  _writeCachedTranslation(language, translationObject) {
    try {
      localStorage.setItem(TRANSLATION_CACHE_PREFIX + language, JSON.stringify(translationObject));
    } catch (e) {
      console.warn('Failed to cache translation for', language, e);
    }
  }
}

module.exports = IpcI18n;
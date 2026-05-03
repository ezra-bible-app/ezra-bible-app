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

const eventController = require('../controllers/event_controller.js');

const LOCAL_STARTUP_CACHE_KEY = 'ezra.dbStartupCache';
const LOCAL_STARTUP_CACHE_VERSION = 1;
const DB_STARTUP_CACHE_EVENTS = [
  'on-tag-created',
  'on-tag-deleted',
  'on-tag-renamed',
  'on-note-file-changed',
  'on-note-file-deleted',
  'on-db-refresh'
];

class DbStartupCacheHelper {
  constructor(ipcRenderer, enabled = false) {
    this._ipcRenderer = ipcRenderer;
    this._enabled = enabled;
    this._cache = this._createDefaultCache();
    this._refreshPromise = null;
    this._refreshInitialized = false;

    if (this._enabled) {
      this._cache = this._readCache();
    }
  }

  // ---------------------------------------------------------------------------
  // Tag list
  // ---------------------------------------------------------------------------

  /** Returns the cached tag list, or undefined when there is no valid cache entry. */
  getCachedTagList() {
    if (!this._enabled) return undefined;
    const list = this._cache.tagList;
    return Array.isArray(list) ? list : undefined;
  }

  /** Returns the number of cached tags, or undefined when there is no valid cache entry. */
  getCachedTagCount() {
    const list = this.getCachedTagList();
    return list !== undefined ? list.length : undefined;
  }

  /** Persist the given tag list to localStorage. */
  cacheTagList(list) {
    if (!this._enabled) return;
    this._storeCache({ ...this._cache, tagList: Array.isArray(list) ? list : [] });
  }

  // ---------------------------------------------------------------------------
  // Note files
  // ---------------------------------------------------------------------------

  /** Returns the cached note-file list, or undefined when there is no valid cache entry. */
  getCachedNoteFiles() {
    if (!this._enabled) return undefined;
    const files = this._cache.noteFiles;
    return Array.isArray(files) ? files : undefined;
  }

  /** Persist the given note-file list to localStorage. */
  cacheNoteFiles(files) {
    if (!this._enabled) return;
    this._storeCache({ ...this._cache, noteFiles: Array.isArray(files) ? files : [] });
  }

  // ---------------------------------------------------------------------------
  // Bible books
  // ---------------------------------------------------------------------------

  /** Returns the cached bible-book for the given shortTitle, or undefined on cache miss. */
  getCachedBibleBook(shortTitle) {
    if (!this._enabled) return undefined;
    const map = this._cache.bibleBooksByShortTitle;
    if (map && Object.prototype.hasOwnProperty.call(map, shortTitle)) {
      return map[shortTitle];
    }
    return undefined;
  }

  /** Persist a single bible-book entry to the localStorage cache. */
  cacheBibleBook(shortTitle, book) {
    if (!this._enabled) return;
    const updatedMap = { ...this._cache.bibleBooksByShortTitle, [shortTitle]: book };
    this._storeCache({ ...this._cache, bibleBooksByShortTitle: updatedMap });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle helpers
  // ---------------------------------------------------------------------------

  /** Remove all cached data (force a cold start on next launch). */
  invalidate() {
    if (!this._enabled) return;
    this._cache = this._createDefaultCache();
    this._removeCache();
  }

  initRefresh() {
    if (!this._enabled || this._refreshInitialized) {
      return;
    }

    eventController.subscribeMultiple(DB_STARTUP_CACHE_EVENTS, async () => {
      const bibleBookKeys = Object.keys(this._cache.bibleBooksByShortTitle);
      this.invalidate();
      await this.refresh(bibleBookKeys);
    });

    this._refreshInitialized = true;
  }

  async refresh(bibleBookKeys = Object.keys(this._cache.bibleBooksByShortTitle)) {
    if (!this._enabled) {
      return this._cache;
    }

    if (typeof window !== 'undefined' && !window.dbInitialized) {
      return this._cache;
    }

    if (this._refreshPromise != null) {
      return await this._refreshPromise;
    }

    this._refreshPromise = this._rebuildCache(bibleBookKeys);

    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  async _rebuildCache(bibleBookKeys = []) {
    try {
      const snapshot = this._createDefaultCache();
      const tagList = await this._ipcRenderer.call('db_getAllTags', 0, false, false);
      const noteFiles = await this._ipcRenderer.call('db_getAllNoteFiles');

      snapshot.tagList = Array.isArray(tagList) ? tagList : [];
      snapshot.noteFiles = Array.isArray(noteFiles) ? noteFiles : [];

      const uniqueBibleBookKeys = Array.from(new Set((Array.isArray(bibleBookKeys) ? bibleBookKeys : [])
        .filter(shortTitle => typeof shortTitle === 'string' && shortTitle.length > 0)));

      const bibleBooks = await Promise.all(uniqueBibleBookKeys.map(async (shortTitle) => {
        const book = await this._ipcRenderer.call('db_getBibleBook', shortTitle);
        return [shortTitle, book];
      }));

      snapshot.bibleBooksByShortTitle = Object.fromEntries(
        bibleBooks.filter(([, book]) => book != null)
      );

      this._storeCache(snapshot);
      return snapshot;
    } catch (error) {
      console.log('DbStartupCacheHelper: could not refresh cache:', error);
      this.invalidate();
      throw error;
    }
  }

  _createDefaultCache() {
    return {
      version: LOCAL_STARTUP_CACHE_VERSION,
      tagList: [],
      noteFiles: [],
      bibleBooksByShortTitle: {}
    };
  }

  _getLocalStorage() {
    if (typeof window === 'undefined' || window.localStorage == null) return null;
    return window.localStorage;
  }

  _readCache() {
    const ls = this._getLocalStorage();
    if (ls == null) return this._createDefaultCache();

    try {
      const json = ls.getItem(LOCAL_STARTUP_CACHE_KEY);
      if (json == null) return this._createDefaultCache();

      const parsed = JSON.parse(json);
      if (parsed == null || parsed.version !== LOCAL_STARTUP_CACHE_VERSION) {
        return this._createDefaultCache();
      }

      const cache = this._createDefaultCache();
      cache.tagList = Array.isArray(parsed.tagList) ? parsed.tagList : [];
      cache.noteFiles = Array.isArray(parsed.noteFiles) ? parsed.noteFiles : [];
      cache.bibleBooksByShortTitle =
        (parsed.bibleBooksByShortTitle && typeof parsed.bibleBooksByShortTitle === 'object')
          ? parsed.bibleBooksByShortTitle
          : {};
      return cache;
    } catch (e) {
      console.log('DbStartupCacheHelper: could not read cache:', e);
      this._removeCache();
      return this._createDefaultCache();
    }
  }

  _storeCache(cache) {
    this._cache = cache;
    const ls = this._getLocalStorage();
    if (ls == null) return;

    try {
      ls.setItem(LOCAL_STARTUP_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.log('DbStartupCacheHelper: could not write cache:', e);
    }
  }

  _removeCache() {
    const ls = this._getLocalStorage();
    if (ls == null) return;

    try {
      ls.removeItem(LOCAL_STARTUP_CACHE_KEY);
    } catch (e) {
      console.log('DbStartupCacheHelper: could not remove cache:', e);
    }
  }
}

module.exports = DbStartupCacheHelper;

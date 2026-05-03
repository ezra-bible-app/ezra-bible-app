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

const LOCAL_MODULE_SNAPSHOT_KEY = 'ezra.localModuleSnapshot';
const LOCAL_MODULE_SNAPSHOT_VERSION = 1;
const LOCAL_MODULE_TYPES = ['BIBLE', 'DICT', 'COMMENTARY'];
const LOCAL_MODULE_SNAPSHOT_EVENTS = [
  'on-translation-added',
  'on-translation-removed',
  'on-all-translations-removed',
  'on-dictionary-added',
  'on-dictionary-removed',
  'on-commentary-added',
  'on-commentary-removed'
];

class LocalModuleSnapshotHelper {
  constructor(ipcRenderer) {
    this._ipcRenderer = ipcRenderer;
    this._localModuleSnapshot = this._readLocalModuleSnapshot();
    this._localModuleSnapshotRefreshPromise = null;
    this._localModuleSnapshotRefreshInitialized = false;
  }

  initRefresh() {
    if (this._localModuleSnapshotRefreshInitialized) {
      return;
    }

    eventController.subscribeMultiple(LOCAL_MODULE_SNAPSHOT_EVENTS, async () => {
      this.invalidate();
      await this.refresh();
    });

    this._localModuleSnapshotRefreshInitialized = true;
  }

  invalidate() {
    this._localModuleSnapshot = this._createDefaultLocalModuleSnapshot();
    this._removeLocalModuleSnapshot();
  }

  async refresh() {
    if (this._localModuleSnapshotRefreshPromise != null) {
      return await this._localModuleSnapshotRefreshPromise;
    }

    this._localModuleSnapshotRefreshPromise = this._rebuildLocalModuleSnapshot();

    try {
      return await this._localModuleSnapshotRefreshPromise;
    } finally {
      this._localModuleSnapshotRefreshPromise = null;
    }
  }

  getCachedLocalModules(moduleType) {
    if (Object.prototype.hasOwnProperty.call(this._localModuleSnapshot.modulesByType, moduleType)) {
      return this._localModuleSnapshot.modulesByType[moduleType];
    }

    return undefined;
  }

  getCachedLocalModuleIds(moduleType) {
    const cachedModules = this.getCachedLocalModules(moduleType);

    if (cachedModules !== undefined) {
      return cachedModules.map(module => module.name);
    }

    if (Object.prototype.hasOwnProperty.call(this._localModuleSnapshot.moduleIdsByType, moduleType)) {
      return this._localModuleSnapshot.moduleIdsByType[moduleType];
    }

    return undefined;
  }

  cacheLocalModules(moduleType, modules) {
    const snapshot = {
      ...this._localModuleSnapshot,
      modulesByType: {
        ...this._localModuleSnapshot.modulesByType,
        [moduleType]: modules
      },
      moduleIdsByType: {
        ...this._localModuleSnapshot.moduleIdsByType,
        [moduleType]: modules.map(module => module.name)
      }
    };

    this._storeLocalModuleSnapshot(snapshot);
  }

  cacheLocalModuleIds(moduleType, moduleIds) {
    const snapshot = {
      ...this._localModuleSnapshot,
      moduleIdsByType: {
        ...this._localModuleSnapshot.moduleIdsByType,
        [moduleType]: moduleIds
      }
    };

    this._storeLocalModuleSnapshot(snapshot);
  }

  getCachedModuleApocrypha(moduleCode) {
    if (Object.prototype.hasOwnProperty.call(this._localModuleSnapshot.apocryphaByModule, moduleCode)) {
      return this._localModuleSnapshot.apocryphaByModule[moduleCode];
    }

    return undefined;
  }

  cacheModuleApocrypha(moduleCode, hasApocrypha) {
    const snapshot = {
      ...this._localModuleSnapshot,
      apocryphaByModule: {
        ...this._localModuleSnapshot.apocryphaByModule,
        [moduleCode]: hasApocrypha
      }
    };

    this._storeLocalModuleSnapshot(snapshot);
  }

  hasCachedStrongsAvailable() {
    return this._localModuleSnapshot.strongsAvailableKnown;
  }

  getCachedStrongsAvailable() {
    return this._localModuleSnapshot.strongsAvailable;
  }

  cacheStrongsAvailable(strongsAvailable) {
    const snapshot = {
      ...this._localModuleSnapshot,
      strongsAvailable,
      strongsAvailableKnown: true
    };

    this._storeLocalModuleSnapshot(snapshot);
  }

  async _rebuildLocalModuleSnapshot() {
    try {
      const modulesByTypeEntries = await Promise.all(
        LOCAL_MODULE_TYPES.map(async (moduleType) => {
          const modules = await this._ipcRenderer.call('nsi_getAllLocalModules', moduleType);
          return [moduleType, Array.isArray(modules) ? modules : []];
        })
      );

      const modulesByType = Object.fromEntries(modulesByTypeEntries);
      const bibleModules = modulesByType.BIBLE || [];
      const bibleModuleIds = bibleModules.map(module => module.name);
      const apocryphaEntries = await Promise.all(
        bibleModuleIds.map(async (moduleCode) => {
          const hasApocrypha = await this._ipcRenderer.call('nsi_moduleHasApocryphalBooks', moduleCode);
          return [moduleCode, hasApocrypha];
        })
      );

      const snapshot = this._createDefaultLocalModuleSnapshot();
      snapshot.modulesByType = modulesByType;
      snapshot.moduleIdsByType = this._buildModuleIdMap(modulesByType);
      snapshot.apocryphaByModule = Object.fromEntries(apocryphaEntries);
      snapshot.strongsAvailable = await this._ipcRenderer.call('nsi_strongsAvailable');
      snapshot.strongsAvailableKnown = true;

      this._storeLocalModuleSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      console.log('Could not refresh local module snapshot:', error);
      this.invalidate();
      throw error;
    }
  }

  _createDefaultLocalModuleSnapshot() {
    return {
      version: LOCAL_MODULE_SNAPSHOT_VERSION,
      modulesByType: {},
      moduleIdsByType: {},
      apocryphaByModule: {},
      strongsAvailable: false,
      strongsAvailableKnown: false
    };
  }

  _getLocalStorage() {
    if (typeof window === 'undefined' || window.localStorage == null) {
      return null;
    }

    return window.localStorage;
  }

  _readLocalModuleSnapshot() {
    const localStorage = this._getLocalStorage();

    if (localStorage == null) {
      return this._createDefaultLocalModuleSnapshot();
    }

    try {
      const snapshotJson = localStorage.getItem(LOCAL_MODULE_SNAPSHOT_KEY);

      if (snapshotJson == null) {
        return this._createDefaultLocalModuleSnapshot();
      }

      const parsedSnapshot = JSON.parse(snapshotJson);

      if (parsedSnapshot == null || parsedSnapshot.version !== LOCAL_MODULE_SNAPSHOT_VERSION) {
        return this._createDefaultLocalModuleSnapshot();
      }

      const snapshot = this._createDefaultLocalModuleSnapshot();
      snapshot.modulesByType = parsedSnapshot.modulesByType || {};
      snapshot.moduleIdsByType = parsedSnapshot.moduleIdsByType || {};
      snapshot.apocryphaByModule = parsedSnapshot.apocryphaByModule || {};
      snapshot.strongsAvailable = parsedSnapshot.strongsAvailable === true;
      snapshot.strongsAvailableKnown = parsedSnapshot.strongsAvailableKnown === true;

      return snapshot;
    } catch (error) {
      console.log('Could not read local module snapshot:', error);
      this._removeLocalModuleSnapshot();
      return this._createDefaultLocalModuleSnapshot();
    }
  }

  _storeLocalModuleSnapshot(snapshot) {
    const localStorage = this._getLocalStorage();
    this._localModuleSnapshot = snapshot;

    if (localStorage == null) {
      return;
    }

    try {
      localStorage.setItem(LOCAL_MODULE_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.log('Could not store local module snapshot:', error);
    }
  }

  _removeLocalModuleSnapshot() {
    const localStorage = this._getLocalStorage();

    if (localStorage == null) {
      return;
    }

    try {
      localStorage.removeItem(LOCAL_MODULE_SNAPSHOT_KEY);
    } catch (error) {
      console.log('Could not remove local module snapshot:', error);
    }
  }

  _buildModuleIdMap(modulesByType) {
    const moduleIdsByType = {};

    for (const moduleType of Object.keys(modulesByType)) {
      const modules = Array.isArray(modulesByType[moduleType]) ? modulesByType[moduleType] : [];
      moduleIdsByType[moduleType] = modules.map(module => module.name);
    }

    return moduleIdsByType;
  }
}

module.exports = LocalModuleSnapshotHelper;
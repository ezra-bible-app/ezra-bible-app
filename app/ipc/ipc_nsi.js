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

const IpcRenderer = require('./ipc_renderer.js');

class IpcNsi {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
  }

  async repositoryConfigExisting() {
    return await this._ipcRenderer.call('nsi_repositoryConfigExisting');
  }

  async updateRepositoryConfig(progressCallback) {
    return await this._ipcRenderer.callWithProgressCallback('nsi_updateRepositoryConfig',
                                                            'nsi_updateRepoConfigProgress',
                                                            progressCallback);
  }

  async getRepoNames() {
    return await this._ipcRenderer.call('nsi_getRepoNames');
  }

  async getRepoLanguages(repositoryName, moduleType) {
    return await this._ipcRenderer.call('nsi_getRepoLanguages', repositoryName, moduleType);
  }

  async getAllRepoModules(repositoryName, moduleType) {
    return await this._ipcRenderer.call('nsi_getAllRepoModules', repositoryName, moduleType);
  }

  async getRepoModulesByLang(repositoryName,
                             language,
                             moduleType,
                             headersFilter,
                             strongsFilter,
                             hebrewStrongsKeys,
                             greekStrongsKeys) {

    return await this._ipcRenderer.call('nsi_getRepoModulesByLang',
                                        repositoryName,
                                        language,
                                        moduleType,
                                        headersFilter,
                                        strongsFilter,
                                        hebrewStrongsKeys,
                                        greekStrongsKeys);
  }

  async getRepoModule(moduleCode) {
    return await this._ipcRenderer.call('nsi_getRepoModule', moduleCode);
  }

  async getAllLocalModules(moduleType='BIBLE') {
    return await this._ipcRenderer.call('nsi_getAllLocalModules', moduleType);
  }

  async getRepoLanguageModuleCount(repositoryName, language, moduleType='BIBLE') {
    return await this._ipcRenderer.call('nsi_getRepoLanguageModuleCount', repositoryName, language, moduleType);
  }

  async installModule(moduleCode, progressCallback=undefined) {
    return await this._ipcRenderer.callWithProgressCallback('nsi_installModule',
                                                            'nsi_updateInstallProgress',
                                                            progressCallback,
                                                            moduleCode);
  }

  async cancelInstallation() {
    return await this._ipcRenderer.call('nsi_cancelInstallation');
  }

  async uninstallModule(moduleCode) {
    return await this._ipcRenderer.call('nsi_uninstallModule', moduleCode);
  }

  async saveModuleUnlockKey(moduleCode, key) {
    return await this._ipcRenderer.call('nsi_saveModuleUnlockKey', moduleCode, key);
  }

  async isModuleReadable(moduleCode) {
    return await this._ipcRenderer.call('nsi_isModuleReadable', moduleCode);
  }

  async getRawModuleEntry(moduleCode, key) {
    return await this._ipcRenderer.call('nsi_getRawModuleEntry', moduleCode, key);
  }

  async getChapterText(moduleCode, bookCode, chapter) {
    return await this._ipcRenderer.call('nsi_getChapterText', moduleCode, bookCode, chapter);
  }

  async getBookText(moduleCode, bookCode, startVerseNr=-1, verseCount=-1) {
    return await this._ipcRenderer.call('nsi_getBookText', moduleCode, bookCode, startVerseNr, verseCount);
  }

  async getVersesFromReferences(moduleCode, references) {
    return await this._ipcRenderer.call('nsi_getVersesFromReferences', moduleCode, references);
  }

  async getReferencesFromReferenceRange(referenceRange) {
    return await this._ipcRenderer.call('nsi_getReferencesFromReferenceRange', referenceRange);
  }

  async getBookList(moduleCode) {
    return await this._ipcRenderer.call('nsi_getBookList', moduleCode);
  }

  async getBookChapterCount(moduleCode, bookCode) {
    return await this._ipcRenderer.call('nsi_getBookChapterCount', moduleCode, bookCode);
  }

  async getChapterVerseCount(moduleCode, bookCode, chapter) {
    return await this._ipcRenderer.call('nsi_getChapterVerseCount', moduleCode, bookCode, chapter);
  }

  async getBookIntroduction(moduleCode, bookCode) {
    return await this._ipcRenderer.call('nsi_getBookIntroduction', moduleCode, bookCode);
  }

  async getModuleSearchResults(progressCB,
                               moduleCode,
                               searchTerm,
                               searchType,
                               isCaseSensitive,
                               useExtendedVerseBoundaries) {

    return await this._ipcRenderer.callWithProgressCallback('nsi_getModuleSearchResults',
                                                            'nsi_updateSearchProgress',
                                                            progressCB,
                                                            moduleCode,
                                                            searchTerm,
                                                            searchType,
                                                            isCaseSensitive,
                                                            useExtendedVerseBoundaries);
  }

  async hebrewStrongsAvailable() {
    return await this._ipcRenderer.call('nsi_hebrewStrongsAvailable');
  }

  async greekStrongsAvailable() {
    return await this._ipcRenderer.call('nsi_greekStrongsAvailable');
  }

  async strongsAvailable() {
    return await this._ipcRenderer.call('nsi_strongsAvailable');
  }

  async getStrongsEntry(strongsKey) {
    return await this._ipcRenderer.call('nsi_getStrongsEntry', strongsKey);
  }

  async getLocalModule(moduleCode) {
    return await this._ipcRenderer.call('nsi_getLocalModule', moduleCode);
  }

  async isModuleInUserDir(moduleCode) {
    return await this._ipcRenderer.call('nsi_isModuleInUserDir', moduleCode);
  }

  async getSwordTranslation(originalString, localeCode) {
    return await this._ipcRenderer.call('nsi_getSwordTranslation', originalString, localeCode);
  }

  async getBookAbbreviation(moduleCode, bookCode, localeCode) {
    return await this._ipcRenderer.call('nsi_getBookAbbreviation', moduleCode, bookCode, localeCode);
  }

  async getSwordVersion() {
    return await this._ipcRenderer.call('nsi_getSwordVersion');
  }
}

module.exports = IpcNsi;
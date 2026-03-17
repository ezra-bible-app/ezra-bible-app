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

const eventController = require('../../controllers/event_controller.js');

var state = {
  allRepositories: [],
  installedModules: [],
  selectedLanguages: new Set(),
  selectedRepositories: new Set(),
  selectedModules: new Map(),
  moduleType: null, 
  reposUpdated: null,
  languageRepositories: {},
};

const stateSetItems = new Set(['selectedLanguages', 'selectedRepositories']);

module.exports.initState = async function(moduleType) {
  if(moduleType !== 'BIBLE' && moduleType !== 'DICT' && moduleType !== 'COMMENTARY') {
    console.log('ERROR: addModuleAssistant.initState: unable to recognize module type', moduleType);
    return false;
  }
  state.moduleType = moduleType;

  for(const item of stateSetItems) {
    state[item].clear();
  }
  state.selectedModules.clear();

  state.installedModules = await app_controller.translation_controller.getInstalledModules(moduleType);

  const lastUpdate = Date.parse(await ipcSettings.get('lastSwordRepoUpdate', null));
  const repositoriesAvailable = lastUpdate && await ipcNsi.repositoryConfigExisting();

  if (repositoriesAvailable) {
    state.allRepositories = await ipcNsi.getRepoNames();
    state.reposUpdated = new Date(lastUpdate);
  }
  this.resetRepositoryUpdateSubscribers();

  await restoreSelected('Languages');
  await restoreSelected('Repositories');
};


// *** Modify state functions ****************************

module.exports.get = (key) => state[key];

module.exports.init = (key, arr) => {
  if (key === 'installedModules') {
    state['installedModules'] = arr;
    return;
  } else if (key === 'languageRepositories') {
    state['languageRepositories'] = arr;
    return;
  } else if (key === 'selectedModules') {
    state['selectedModules'] = new Map();
    return;
  }

  if (!stateSetItems.has(key)) {
    return;
  }
  state[key] = new Set(arr);
};

module.exports.add = (key, value, extraData) => {
  if (key === 'selectedModules') {
    state.selectedModules.set(value, extraData);
    return;
  }
  if (!stateSetItems.has(key)) {
    return;
  }
  state[key].add(value);
};

module.exports.remove = (key, value) => {
  if (key === 'selectedModules') {
    state.selectedModules.delete(value);
    return;
  }
  if (!stateSetItems.has(key)) {
    return;
  }
  state[key].delete(value);
};


// *** Functions to restore/save selected state ****************************

async function restoreSelected(key) {
  key = `selected${key}`;
  let ipcSettingsValue = await ipcSettings.get(key, []);

  if (Array.isArray(ipcSettingsValue)) {
    state[key] = new Set(ipcSettingsValue);
  }
}

async function saveSelected(key) {
  key = `selected${key}`;
  await ipcSettings.set(key, [...state[key]]);
}

var selectedLanguagesTemp;
var selectedRepositoriesTemp;
function preserveSelectedState() {
  selectedLanguagesTemp = state.selectedLanguages;
  state.selectedLanguages = new Set();
  selectedRepositoriesTemp = state.selectedRepositories;
  state.selectedRepositories = new Set();
}
function restoreSelectedState() {
  state.selectedLanguages = selectedLanguagesTemp;
  state.selectedRepositories = selectedRepositoriesTemp;
}

module.exports.saveSelectedLanguages = async () => saveSelected('Languages');
module.exports.saveSelectedRepositories = async () => saveSelected('Repositories');


// *** Functions to save and apply module unlock keys ****************************

var unlockKeys = {};
module.exports.setUnlockKey = (moduleId, unlockKey) => unlockKeys[moduleId] = unlockKey;

module.exports.applyUnlockKey = async (moduleId) => {
  // console.log("Module is locked ... saving unlock key");
  const unlockKey = unlockKeys[moduleId];
  await ipcNsi.saveModuleUnlockKey(moduleId, unlockKey);
  const moduleReadable = await ipcNsi.isModuleReadable(moduleId);
  return moduleReadable;
};


// *** Functions to track installation progress ****************************

var moduleInstallStatus = 'DONE';
module.exports.isInstallCompleted = () => moduleInstallStatus !== 'IN_PROGRESS'; 
module.exports.setInstallInProgress = () => moduleInstallStatus = 'IN_PROGRESS';
module.exports.setInstallDone = () => moduleInstallStatus = 'DONE';


// *** Functions to deal with repository data update ****************************

module.exports.resetRepositoryUpdateSubscribers = function() {
  eventController.unsubscribeAll(/on-repo-update-.+$/);
};


var updateInProgress = false;
module.exports.updateRepositories = async function() {
  if (updateInProgress) {
    return;
  }

  updateInProgress = true;  
  preserveSelectedState();
  await eventController.publishAsync('on-repo-update-started');

  const MAX_FAILED_UPDATE_COUNT = 2;
  var failedUpdateCount = 0;
  var successfulUpdateCount = 0;
  const repoUpdateStatus = await ipcNsi.updateRepositoryConfig(async (progress) => { 
    await eventController.publishAsync('on-repo-update-progress', progress);
  });

  for (let key in repoUpdateStatus) {
    if (key != 'result') {
      if (repoUpdateStatus[key] == false) {
        failedUpdateCount += 1;
        console.warn("Repo update failed for " + key);
      } else {
        successfulUpdateCount += 1;
      }
    }
  }

  if (failedUpdateCount > 0) {
    console.warn("Total failed updates: " + failedUpdateCount);
  }

  var overallStatus = 0;

  if (successfulUpdateCount == 0 || // This happens when there is no internet connection
      failedUpdateCount > MAX_FAILED_UPDATE_COUNT) // This happens when too many individual repositories are offline
  {
    overallStatus = -1;
  }

  if (overallStatus == 0) {
    restoreSelectedState();
    const today = new Date();
    state.reposUpdated = today;
    state.allRepositories = await ipcNsi.getRepoNames();
    await ipcSettings.set('lastSwordRepoUpdate', today);
  } else {
    state.allRepositories = [];
  }

  await eventController.publishAsync('on-repo-update-completed', overallStatus);
  updateInProgress = false;
};

module.exports.notifyRepositoriesAvailable = async () => {
  if (!updateInProgress) {
    await eventController.publishAsync('on-repo-update-completed', 0);
  }
};

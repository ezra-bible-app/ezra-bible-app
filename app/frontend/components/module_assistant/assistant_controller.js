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

var state = {
  allRepositories: [],
  installedModules: [],
  selectedLanguages: new Set(),
  selectedRepositories: new Set(),
  selectedModules: new Set(),
  moduleType: null, 
  moduleTypeText: "",
  reposUpdated: null,
};

const stateSetItems = new Set(['selectedLanguages', 'selectedRepositories', 'selectedModules']);

module.exports.initState = async function(moduleType) {
  console.log('assistantController.initState', moduleType);
  if(moduleType !== 'BIBLE' && moduleType !== 'DICT') {
    console.log('ERROR: addModuleAssistant.initState: unable to recognize module type', moduleType);
    return false;
  }
  state.moduleType = moduleType;
  if (moduleType == "BIBLE") {
    state.moduleTypeText = i18n.t("module-assistant.module-type-bible");
  } else if (moduleType == "DICT") {
    state.moduleTypeText = i18n.t("module-assistant.module-type-dict");
  } 

  for(const item of stateSetItems) {
    state[item].clear();
  }

  state.installedModules = await app_controller.translation_controller.getInstalledModules(moduleType);

  const lastUpdate = await ipcSettings.get('lastSwordRepoUpdate', null);
  const repositoriesAvailable = lastUpdate && await ipcNsi.repositoryConfigExisting();

  if (repositoriesAvailable) {
    state.reposUpdated = new Date(Date.parse(lastUpdate));
    state.allRepositories = await ipcNsi.getRepoNames();
  }
  this.resetRepositoryUpdateSubscribers();
};

module.exports.get = (key) => state[key];

module.exports.init = (key, arr) => {
  if (key === 'installedModules') {
    state['installedModules'] = arr;
    return;
  }

  if (!stateSetItems.has(key)) {
    return;
  }
  state[key] = new Set(arr);
};

module.exports.add = (key, value) => {
  if (!stateSetItems.has(key)) {
    return;
  }
  state[key].add(value);
};

module.exports.remove = (key, value) => {
  if (!stateSetItems.has(key)) {
    return;
  }
  state[key].delete(value);
};


var unlockKeys = {};
module.exports.setUnlockKey = (moduleId, unlockKey) => unlockKeys[moduleId] = unlockKey;

module.exports.applyUnlockKey = async (moduleId) => {
  console.log("Module is locked ... saving unlock key");
  const unlockKey = unlockKeys[moduleId];
  await ipcNsi.saveModuleUnlockKey(moduleId, unlockKey);
  const moduleReadable = await ipcNsi.isModuleReadable(moduleId);
  return moduleReadable;
};

var moduleInstallStatus = 'DONE';
module.exports.isInstallCompleted = () => moduleInstallStatus !== 'IN_PROGRESS'; 
module.exports.setInstallInProgress = () => moduleInstallStatus = 'IN_PROGRESS';
module.exports.setInstallDone = () => moduleInstallStatus = 'DONE';


var updatingRepositoriesEvents;
module.exports.resetRepositoryUpdateSubscribers = function() {
  updatingRepositoriesEvents = {
    startUpdate: [],
    progressUpdate: [],
    completedUpdate: [
      async result => state.allRepositories = result == 0 ? await ipcNsi.getRepoNames() : []
    ],
  };
};

function addUpdateSubscriber(event, callback) {
  updatingRepositoriesEvents[event].push(callback);
}
async function notifySubscribers(event, payload=undefined) {
  for (let subscriberCallback of updatingRepositoriesEvents[event]) {
    if (typeof subscriberCallback === 'function') {
      await subscriberCallback(payload);
    }
  }
}
module.exports.onStartRepositoriesUpdate = callback => addUpdateSubscriber('startUpdate', callback);
module.exports.onProgressRepositoriesUpdate = callback => addUpdateSubscriber('progressUpdate', callback);
module.exports.onCompletedRepositoriesUpdate = callback => addUpdateSubscriber('completedUpdate', callback);

module.exports.updateRepositories = async function() {
  await notifySubscribers('startUpdate');
  const result = await ipcNsi.updateRepositoryConfig(process => notifySubscribers('progressUpdate', process));
  if (result == 0) {
    const today = new Date();
    state.reposUpdated = today;
    await ipcSettings.set('lastSwordRepoUpdate', today);
  }
  await notifySubscribers('completedUpdate', result);
};


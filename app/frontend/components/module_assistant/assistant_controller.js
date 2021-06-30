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
  selectedRepositories: [],
  selectedModules: [],
  moduleType: null, 
  repositoriesAvailable: false,
};

const stateSetItems = new Set(['selectedLanguages']);

module.exports.initState = async function(moduleType) {
  console.log('assistantController.initState', moduleType);
  if(moduleType !== 'BIBLE' && moduleType !== 'DICT') {
    console.log('ERROR: addModuleAssistant.initState: unable to recognize module type', moduleType);
    return false;
  }
  state.moduleType = moduleType;

  state.installedModules = await app_controller.translation_controller.getInstalledModules(moduleType);

  state.repositoriesAvailable = await ipcNsi.repositoryConfigExisting();
  console.log('assistantController repositoriesAvailable', state.repositoriesAvailable);
  waitUntilRepositoriesAvailable();  
};

async function waitUntilRepositoriesAvailable() {
  state.allRepositories = await new Promise(resolve => {
    const intervalId = setInterval(() => {
      if (state.repositoriesAvailable) {
        clearInterval(intervalId);
        console.log('assistantController resolving repositories', state.repositoriesAvailable);
        resolve(ipcNsi.getRepoNames());
      }
    }, 200);
  });
}

module.exports.pendingAllRepositoryData = async () => {
  state.repositoriesAvailable = false;
  console.log('assistantController pending repositories', state.repositoriesAvailable);
  waitUntilRepositoriesAvailable();
};

module.exports.resolveAllRepositoryData = async () => {
  state.repositoriesAvailable = true;
};

module.exports.get = (key) => state[key];

module.exports.init = (key, arr) => {
  if (!stateSetItems.has(key)) {
    return;
  }

  state[key] = new Set(arr);
}

module.exports.add = (key, value) => {
  if (!stateSetItems.has(key)) {
    return;
  }

  state[key].add(value);

}

module.exports.set = (key, value) => {
  var oldValue;
  if (key in state) {
    oldValue = state[key];
    state[key] = value;
  } else {
    console.log('ERROR: addModuleAssistant.set: trying to set unrecognized property', key);
  }
  return oldValue;
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
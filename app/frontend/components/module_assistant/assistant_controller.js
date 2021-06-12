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
  selectedLanguages: [],
  selectedRepositories: [],
  selectedModules: [],
  moduleType: null, 
};

module.exports.initState = async function(moduleType) {
  console.log('addModuleAssistant.initState', moduleType);
  if(moduleType !== 'BIBLE' && moduleType !== 'DICT') {
    console.log('ERROR: addModuleAssistant.initState: unable to recognize module type', moduleType);
    return false;
  }
  state.moduleType = moduleType;

  state.installedModules = await app_controller.translation_controller.getInstalledModules(moduleType);

  await this.updateAllRepositoryData();
};

module.exports.updateAllRepositoryData = async () => {
  state.allRepositories = await ipcNsi.getRepoNames();
};

module.exports.get = (key) => state[key];

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
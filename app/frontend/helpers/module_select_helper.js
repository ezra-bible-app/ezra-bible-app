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

const swordModuleHelper = require('./sword_module_helper.js');
const i18nHelper = require('../helpers/i18n_helper.js');

module.exports.addLanguageGroupsToModuleSelectMenu = async function(selectElement, localModules=undefined) {
  if (selectElement == null) {
    return;
  }

  const languages = await swordModuleHelper.getLanguages('BIBLE', localModules);

  for (let i = 0; i < languages.length; i++) {
    const currentLang = languages[i];

    let newOptGroup = "<optgroup class='module-select-" + currentLang.languageCode + "-modules' label='" + currentLang.languageName + "'></optgroup>";
    $(selectElement).append(newOptGroup);
  }
};

module.exports.addModulesToModuleSelectMenu = function(tabIndex, moduleSelect, modules, currentModuleId=undefined) {
  if (moduleSelect == null) {
    return;
  }

  const currentTab = app_controller.tab_controller.getTab(tabIndex);

  if (currentTab != null && currentModuleId == null) {
    currentModuleId = currentTab.getBibleTranslationId();
  }

  for (var module of modules) {
    var currentModuleEl = document.createElement('option');
    currentModuleEl.value = module.name;

    if (platformHelper.isSmallScreen()) {
      currentModuleEl.innerText = module.name;
    } else {
      currentModuleEl.innerText = module.description;
    }

    if (currentModuleId == module.name) {
      currentModuleEl.selected = "selected";
    }

    var optGroup = moduleSelect.querySelector('.module-select-' + module.language + '-modules');
    optGroup.append(currentModuleEl);
  }
};

module.exports.updateModuleSelectLanguages = function(localeCode, moduleSelect) {
  if (moduleSelect === null) {
    return;
  }

  let optGroups = moduleSelect.find('optgroup');

  for (let i = 0; i < optGroups.length; i++) {
    let optgroup = optGroups[i];
    const code = optgroup.getAttribute('class').split('-')[2];
    optgroup.setAttribute('label', i18nHelper.getLanguageName(code, false, localeCode));
  }

  // Refresh the selectmenu widget
  moduleSelect.selectmenu();
};

module.exports.initModuleSelect = async function(moduleSelectEl, currentModuleId, moduleSelectWidth, onChange) {
  var bibleModules = await ipcNsi.getAllLocalModules('BIBLE');
  var dictModules = await ipcNsi.getAllLocalModules('DICT');
  var commentaryModules = await ipcNsi.getAllLocalModules('COMMENTARY');

  if (bibleModules == null) bibleModules = [];
  if (dictModules == null) dictModules = [];
  if (commentaryModules == null) commentaryModules = [];

  var allModules = [...bibleModules, ...dictModules, ...commentaryModules];

  allModules.sort(swordModuleHelper.sortModules);

  await this.addLanguageGroupsToModuleSelectMenu(moduleSelectEl, allModules);
  this.addModulesToModuleSelectMenu(undefined, moduleSelectEl, allModules, currentModuleId);

  if (platformHelper.isMobile()) {
    moduleSelectWidth = 110;
  }

  $(moduleSelectEl).selectmenu({
    width: moduleSelectWidth,
    change: () => {
      let selectedModuleCode = moduleSelectEl.value;
      onChange(selectedModuleCode);
    }
  });
};

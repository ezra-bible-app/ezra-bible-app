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

const assistantController = require('./assistant_controller.js');
const assistantHelper = require('./assistant_helper.js');
require('./step_update_repositories.js');
require('./step_languages.js');
require('./step_repositories.js');
require('./step_modules.js');
require('./step_install.js');
require('./unlock_dialog.js');

/**
 * The InstallModuleAssistant component implements the dialog that handles module installations.
 * 
 * @category Component
 */

const UPDATE_REPOSITORIES_INDEX = 0;
const LANGUAGES_INDEX = 1;
const REPOSITORIES_INDEX = 2;
const MODULES_INDEX = 3;
const INSTALL_INDEX = 4;

class InstallModuleAssistant {
  constructor() {
    this._addModuleAssistantOriginalContent = undefined;

    var addButton = $('#add-modules-button');
    addButton.bind('click', () => this.openAddModuleAssistant());
  }

  async openAssistant(moduleType) {
    await assistantController.initState(moduleType);

    var appContainerWidth = $(window).width() - 10;
    var wizardWidth = null;

    if (appContainerWidth < 1100) {
      wizardWidth = appContainerWidth;
    } else {
      wizardWidth = 1100;
    }

    var offsetLeft = appContainerWidth - wizardWidth - 100;
    var offsetTop = 20;

    $('#module-settings-assistant-add').hide();
    $('#module-settings-assistant-remove').hide();
    $('#module-settings-assistant-init').show();

    const modules = await assistantController.get('installedModules');

    $('#add-modules-button').removeClass('ui-state-disabled');

    if (modules.length > 0) {
      $('#remove-modules-button').removeClass('ui-state-disabled');
    } else {
      $('#remove-modules-button').addClass('ui-state-disabled');
    }

    uiHelper.configureButtonStyles('#module-settings-assistant-init');

    var title = "";
    var addModuleText = "";
    var removeModuleText = "";

    if (moduleType == "BIBLE") {
      title = i18n.t("module-assistant.bible-header");
      this._moduleTypeText = i18n.t("module-assistant.module-type-bible");
      addModuleText = i18n.t("module-assistant.add-translations");
      removeModuleText = i18n.t("module-assistant.remove-translations");
    } else if (moduleType == "DICT") {
      title = i18n.t("module-assistant.dict-header");
      this._moduleTypeText = i18n.t("module-assistant.module-type-dict");
      addModuleText = i18n.t("module-assistant.add-dicts");
      removeModuleText = i18n.t("module-assistant.remove-dicts");
    } else {
      console.error("InstallModuleAssistant: Unknown module type!");
    }

    var internetUsageNote = i18n.t("module-assistant.internet-usage-note", { module_type: this._moduleTypeText });
    $('#module-settings-assistant-internet-usage').html(internetUsageNote);
    $('#add-modules-button').html(addModuleText);
    $('#remove-modules-button').html(removeModuleText);

    $('#module-settings-assistant').dialog({
      position: [offsetLeft, offsetTop],
      modal: true,
      title: title,
      dialogClass: 'ezra-dialog module-assistant-dialog',
      width: wizardWidth,
      minHeight: 280
    });

    assistantHelper.unlockDialog();
  }

  async openAddModuleAssistant() {
    $('#module-settings-assistant-init').hide();
    this.initAddModuleAssistant();
    $('#module-settings-assistant-add').show();

    await this.initUpdateRepoConfigPage();
  }

  initAddModuleAssistant() {
    if (this._addModuleAssistantOriginalContent != undefined) {
      $('#module-settings-assistant-add').steps("destroy");
      $('#module-settings-assistant-add').html(this._addModuleAssistantOriginalContent);
    } else {
      this._addModuleAssistantOriginalContent = $('#module-settings-assistant-add').html();
    }

    $('.module-settings-assistant-section-header-module-type').html(this._moduleTypeText);

    $('#module-settings-assistant-add').steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-assistant-add",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this.addModuleAssistantStepChanging(event, currentIndex, newIndex),
      onStepChanged: async (event, currentIndex, priorIndex) => this.addModuleAssistantStepChanged(event, currentIndex, priorIndex),
      onFinishing: (event, currentIndex) => assistantController.isInstallCompleted(),
      onFinished: (event, currentIndex) => this.addModuleAssistantFinished(event, currentIndex),
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });
  }

  addModuleAssistantStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == UPDATE_REPOSITORIES_INDEX && newIndex == LANGUAGES_INDEX) {
      return assistantController.get('allRepositories').length > 0;
    } else if (currentIndex == LANGUAGES_INDEX && newIndex == REPOSITORIES_INDEX) { // Changing from Languages to Repositories
      const selectedLanguages = this.languagesStep.languages;
      assistantController.set('selectedLanguages', selectedLanguages);
      return selectedLanguages.length > 0;
    } else if (currentIndex == REPOSITORIES_INDEX && newIndex == MODULES_INDEX) { // Changing from Repositories to Modules 
      const selectedRepositories = this.repositoriesStep.repositories;
      assistantController.set('selectedRepositories', selectedRepositories);
      return selectedRepositories.length > 0;
    } else if (currentIndex == MODULES_INDEX && newIndex == INSTALL_INDEX) { // Changing from Modules to Installation
      const selectedModules = this.modulesStep.modules;
      assistantController.set('selectedModules', selectedModules);
      return selectedModules.length > 0;
    } else if (currentIndex == INSTALL_INDEX && newIndex != INSTALL_INDEX) {
      return false;
    }

    return true;
  }

  async addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == UPDATE_REPOSITORIES_INDEX && currentIndex == LANGUAGES_INDEX) {
      await this.initLanguagesPage();
    } else if (priorIndex == LANGUAGES_INDEX && currentIndex == REPOSITORIES_INDEX) {
      await this.initRepositoryPage();
    } else if (priorIndex == REPOSITORIES_INDEX && currentIndex == MODULES_INDEX) {
      this.initModulesPage();
    } else if (currentIndex == INSTALL_INDEX) {
      this.initInstallPage();
    }
  }

  async addModuleAssistantFinished(event, currentIndex) {
    $('#module-settings-assistant').dialog('close');
    assistantController.set('installedModules', await app_controller.translation_controller.getInstalledModules());

    if (assistantController.get('moduleType') == 'BIBLE') {
      await app_controller.translation_controller.initTranslationsMenu();
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }
  }

  // This is only for testing!!
  /** @deprecated */
  resetInstalledModules() {
    this._installedModules = [];
  }

  async initUpdateRepoConfigPage() {
    this.updateConfigStep = document.createElement('step-update-repositories');

    const wizardPage = $('#module-settings-assistant-add-p-'+UPDATE_REPOSITORIES_INDEX);
    wizardPage.empty();

    wizardPage.append(this.updateConfigStep);
  }

  async initLanguagesPage() {
    this.languagesStep = document.createElement('step-languages');

    const wizardPage = $('#module-settings-assistant-add-p-'+LANGUAGES_INDEX);
    wizardPage.empty();

    wizardPage.append(this.languagesStep);
  }

  async initRepositoryPage() {
    this.repositoriesStep = document.createElement('step-repositories');

    const wizardPage = $('#module-settings-assistant-add-p-'+REPOSITORIES_INDEX);
    wizardPage.empty();

    wizardPage.append(this.repositoriesStep);
  }

  async initModulesPage() {
    this.unlockDialog = document.createElement('unlock-dialog');
    document.body.appendChild(this.unlockDialog);

    this.modulesStep = document.createElement('step-modules');
    this.modulesStep.unlockDialog = this.unlockDialog;

    const wizardPage = $('#module-settings-assistant-add-p-'+MODULES_INDEX);
    wizardPage.empty();

    wizardPage.append(this.modulesStep);
  }

  async initInstallPage() {
    // Bible modules have been selected
    this.installStep = document.createElement('step-install');
    this.installStep.unlockDialog = this.unlockDialog;

    const wizardPage = $('#module-settings-assistant-add-p-'+INSTALL_INDEX);
    wizardPage.empty();

    wizardPage.append(this.installStep);
  }

}

module.exports = InstallModuleAssistant;

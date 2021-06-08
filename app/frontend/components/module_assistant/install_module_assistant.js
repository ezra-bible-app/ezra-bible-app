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
require('./step_languages.js');
require('./step_repositories.js');
require('./step_modules.js');
require('./step_install.js');

/**
 * The InstallModuleAssistant component implements the dialog that handles module installations.
 * 
 * @category Component
 */
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

  async init(moduleType) {
    this._installedModules = null;
    this._moduleInstallStatus = 'DONE';
    this._translationRemovalStatus = 'DONE';
    this._unlockKeys = {};
    this._unlockDialogOpened = false;
    this._unlockCancelled = false;
    this._currentModuleType = moduleType;
    this._moduleInstallationCancelled = false;
  }

  async openAddModuleAssistant() {
    $('#module-settings-assistant-init').hide();
    this.initAddModuleAssistant();
    $('#module-settings-assistant-add').show();

    await this.initLanguagesPage();
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
    if (currentIndex == 0 && newIndex == 1) { // Changing from Languages (1) to Repositories (2)
      const selectedLanguages = this.languagesStep.languages;
      assistantController.set('selectedLanguages', selectedLanguages);
      return selectedLanguages.length > 0;
    } else if (currentIndex == 1 && newIndex == 2) { // Changing from Repositories (2) to Modules (3)
      const selectedRepositories = this.repositoriesStep.repositories;
      assistantController.set('selectedRepositories', selectedRepositories);
      return selectedRepositories.length > 0;
    } else if (currentIndex == 2 && newIndex == 3) { // Changing from Modules (3) to Installation (4)
      const selectedModules = this.modulesStep.modules;
      assistantController.set('selectedModules', selectedModules);
      return selectedModules.length > 0;
    } else if (currentIndex == 3 && newIndex != 3) {
      return false;
    }

    return true;
  }

  async addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0 && currentIndex == 1) {
      await this.initRepositoryPage();

    } else if (priorIndex == 1 && currentIndex == 2) {
      this.initModulesPage();

    } else if (currentIndex == 3) {

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
  resetInstalledModules() {
    this._installedModules = [];
  }

  async initLanguagesPage() {
    this.languagesStep = document.createElement('step-languages');

    const wizardPage = $('#module-settings-assistant-add-p-0');
    wizardPage.empty();

    wizardPage.append(this.languagesStep);

  }

  async initRepositoryPage() {
    this.repositoriesStep = document.createElement('step-repositories');
    console.log('ASSISTANT: set repoStep props');
    this.repositoriesStep.moduleType = this._currentModuleType;
    this.repositoriesStep.languages = this._selectedLanguages;
    this.repositoriesStep.allRepositories = this.allRepositories;

    const wizardPage = $('#module-settings-assistant-add-p-1');
    wizardPage.empty();

    wizardPage.append(this.repositoriesStep);
  }

  async initModulesPage() {
    this.modulesStep = document.createElement('step-modules');
    this.modulesStep.moduleType = this._currentModuleType;
    this.modulesStep.languages = this._selectedLanguages;
    this.modulesStep.repositories = this._selectedRepositories;

    const wizardPage = $('#module-settings-assistant-add-p-2');
    wizardPage.empty();

    wizardPage.append(this.modulesStep);
  }

  async initInstallPage() {
    // Bible modules have been selected

    assistantHelper.lockDialogForAction('module-settings-assistant-add');

    this._moduleInstallStatus = 'IN_PROGRESS';

    this.installStep = document.createElement('step-install');
    this.installStep.moduleType = this._currentModuleType;
    this.installStep.modules = this.selectedModules;

    const wizardPage = $('#module-settings-assistant-add-p-3');
    wizardPage.empty();

    wizardPage.append(this.installStep);

    this._moduleInstallStatus = 'DONE';
    assistantHelper.unlockDialog('module-settings-assistant-add');
  }

  showUnlockDialog(swordModule, checkbox=undefined) {
    this._unlockDialogOpened = true;
    this._unlockCancelled = false;

    if (swordModule.unlockInfo != "") {
      $('#dialog-unlock-info').html(swordModule.unlockInfo);
    }

    var unlockDialog = $('#module-settings-assistant-unlock-dialog');
    var unlockFailedMsg = $('#unlock-failed-msg');

    if (checkbox === undefined) {
      unlockFailedMsg.show();
    } else {
      unlockFailedMsg.hide();
    }

    var unlockDialogOptions = {
      modal: true,
      title: i18n.t("module-assistant.enter-unlock-key", { moduleId: swordModule.name }),
      dialogClass: 'ezra-dialog',
      width: 450,
      minHeight: 200
    };

    unlockDialogOptions.buttons = {};    
    unlockDialogOptions.buttons[i18n.t("general.cancel")] = (event) => {
      unlockDialog.dialog("close");
      this._unlockDialogOpened = false;
      this._unlockCancelled = true;
    };

    unlockDialogOptions.buttons[i18n.t("general.ok")] = (event) => {
      var unlockKey = $('#unlock-key-input').val().trim();

      if (unlockKey.length > 0) {
        this._unlockKeys[swordModule.name] = unlockKey;

        if (checkbox !== undefined) {
          checkbox.prop('checked', true);
        }

        unlockDialog.dialog("close");
        this._unlockDialogOpened = false;
      }
    };
    
    unlockDialog.dialog(unlockDialogOptions);
    $('#unlock-key-input').focus();
  }

}

module.exports = InstallModuleAssistant;

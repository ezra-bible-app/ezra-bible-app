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


const { html } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const assistantHelper = require('./assistant_helper.js');
const StepUpdateRepositories = require('./step_update_repositories.js');
const StepLanguages = require('./step_languages.js');
const StepRepositories = require('./step_repositories.js');
const StepModules = require('./step_modules.js');
const StepInstall = require('./step_install.js');
const UnlockDialog = require('./unlock_dialog.js');

const template = html`
<style>
</style>

<div id="module-settings-assistant-add" style="display: none;">
</div>

<unlock-dialog></unlock-dialog>
`;

const templateAddSteps = html`
  <h3 i18n="module-assistant.update-repository-data"></h3>
  <section id="module-update-repositories" class="module-assistant-step">
    <!-- <step-update-repositories></step-update-repositories> -->
  </section>

  <h3 i18n="module-assistant.languages"></h3>
  <section id="module-languages" class="module-assistant-step scrollable">
    <!-- <step-languages></step-languages> -->
  </section>

  <h3 i18n="module-assistant.repositories"></h3>
  <section id="module-repositories" class="module-assistant-step scrollable">
    <!-- <step-repositories></step-repositories> -->
  </section>

  <h3 class="module-settings-assistant-section-header-module-type"></h3>
  <section id="module-list" class="module-assistant-step">
    <!-- <step-modules></step-modules> -->
  </section>

  <h3 i18n="module-assistant.installation"></h3>
  <section id="install" class="module-assistant-step scrollable">
    <!-- <step-install></step-install> -->
  </section>
`;

const UPDATE_REPOSITORIES_INDEX = 0;
const LANGUAGES_INDEX = 1;
const REPOSITORIES_INDEX = 2;
const MODULES_INDEX = 3;
const INSTALL_INDEX = 4;


class ModuleAssistant extends HTMLElement {
  constructor() {
    super();
    console.log('ASSISTANT: step constructor');
    this._jQueryStepsInitialized = false;
    this._initialized = false;
  }

  async connectedCallback() {
    console.log('ASSISTANT: started connectedCallback');
    if (!this._initialized) {
      this.appendChild(template.content);
    }
  }

  async initAddModuleAssistant() {
    var addModuleAssistantContainer = this.querySelector('#module-settings-assistant-add');
    var $addModuleAssistantContainer = $(addModuleAssistantContainer);
    console.log('ASSISTANT: initAddModuleAssistant. Steps:', $addModuleAssistantContainer.data('steps'), addModuleAssistantContainer.isConnected);
    $addModuleAssistantContainer.show();

    if (this._jQueryStepsInitialized) {
      $addModuleAssistantContainer.steps("destroy"); 
      // jQuery.steps("destroy") is messing up with DOM :( we need to find the right element again
      addModuleAssistantContainer = this.querySelector('#module-settings-assistant-add');
      $addModuleAssistantContainer = $(addModuleAssistantContainer);
    } else {
      this._jQueryStepsInitialized = true;
    }

    this._setupPages(addModuleAssistantContainer);

    $addModuleAssistantContainer.steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-assistant-add",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this._addModuleAssistantStepChanging(event, currentIndex, newIndex),
      onStepChanged: async (event, currentIndex, priorIndex) => this._addModuleAssistantStepChanged(event, currentIndex, priorIndex),
      onFinishing: () => assistantController.isInstallCompleted(),
      onFinished: () => this._addModuleAssistantFinished(),
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });

    // jQuery.steps() is messing up with DOM :( we need to reassign step components
    this._setupSteps(addModuleAssistantContainer);

    await this.updateConfigStep.init();
    await this.languagesStep.init();
  }

  _addModuleAssistantStepChanging(event, currentIndex, newIndex) {
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

  async _addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == UPDATE_REPOSITORIES_INDEX && currentIndex == LANGUAGES_INDEX) {
      await this.languagesStep.listLanguages();
    } else if (priorIndex == LANGUAGES_INDEX && currentIndex == REPOSITORIES_INDEX) {
      await this.repositoriesStep.listRepositories();
    } else if (priorIndex == REPOSITORIES_INDEX && currentIndex == MODULES_INDEX) {
      await this.modulesStep.listModules();
    } else if (currentIndex == INSTALL_INDEX) {
      await this.installStep.installSelectedModules();
    }
  }

  async _addModuleAssistantFinished() {
    $('#module-settings-assistant').dialog('close');
    assistantController.set('installedModules', await app_controller.translation_controller.getInstalledModules());

    if (assistantController.get('moduleType') == 'BIBLE') {
      await app_controller.translation_controller.initTranslationsMenu();
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }
  }

  /** 
   * @param {HTMLElement} container 
   */
  _setupPages(container) {
    container.innerHTML = '';
    container.appendChild(templateAddSteps.content.cloneNode(true));
    localize(container);
  }

  _setupSteps(container) {
    /** @type {StepUpdateRepositories} */
    // this.updateConfigStep = container.querySelector('step-update-repositories');
    this.updateConfigStep = document.createElement('step-update-repositories');
    this._initPage(this.updateConfigStep, UPDATE_REPOSITORIES_INDEX, container);

    /** @type {StepLanguages} */
    // this.languagesStep = container.querySelector('step-languages');
    this.languagesStep = document.createElement('step-languages');
    this._initPage(this.languagesStep, LANGUAGES_INDEX, container);

    /** @type {StepRepositories} */
    // this.repositoriesStep = container.querySelector('step-repositories');
    this.repositoriesStep = document.createElement('step-repositories');
    this._initPage(this.repositoriesStep, REPOSITORIES_INDEX, container);

    /** @type {StepModules} */
    // this.modulesStep = container.querySelector('step-modules');
    this.modulesStep = document.createElement('step-modules');
    this._initPage(this.modulesStep, MODULES_INDEX, container);

    /** @type {StepInstall} */
    // this.installStep = container.querySelector('step-install');
    this.installStep = document.createElement('step-install');
    this._initPage(this.installStep, INSTALL_INDEX, container);

    /** @type {UnlockDialog} */
    this.unlockDialog = this.querySelector('unlock-dialog');

    this.modulesStep.unlockDialog = this.unlockDialog;
    this.installStep.unlockDialog = this.unlockDialog;
  }

  _initPage(component, pageIndex, container=null) {
    container = container || this;
    const wizardPage = container.querySelector('#module-settings-assistant-add-p-'+pageIndex);
    wizardPage.appendChild(component);
  }
}

customElements.define('module-assistant', ModuleAssistant);
module.exports = ModuleAssistant;


function localize(element) {
  var moduleTypeText = "";
  const moduleType = assistantController.get('moduleType');
  if (moduleType == 'BIBLE') {
    moduleTypeText = i18n.t("module-assistant.module-type-bible");
  } else if (moduleType == 'DICT') {
    moduleTypeText = i18n.t("module-assistant.module-type-dict");
  }

  element.querySelector('.module-settings-assistant-section-header-module-type').textContent = moduleTypeText;

  assistantHelper.localize(element);
}

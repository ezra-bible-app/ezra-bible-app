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
require('./step_update_repositories.js');
require('./step_languages.js');
require('./step_repositories.js');
require('./step_modules.js');
require('./step_install.js');
require('./unlock_dialog.js');

const template = html`
<style>
  #module-settings-assistant-add-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  #module-settings-assistant-add {
    height: 100%;
  }
  #module-settings-assistant-add .content {
    min-height: calc(100% - 4em);
  }
  #module-assistant-add-info {
    padding: 0 2.5% 1em 0.5em;
  }
</style>

<div id="module-settings-assistant-add-wrapper" style="display: none;">
  <div id="module-assistant-add-info">
    <step-update-repositories></step-update-repositories>
  </div>

  <div id="module-settings-assistant-add"></div>
</div>

<unlock-dialog></unlock-dialog>
`;

const templateAddSteps = html`
  <h3 i18n="module-assistant.languages"></h3>
  <section id="module-languages" class="module-assistant-step scrollable">
    <!-- <step-languages></step-languages> -->
  </section>

  <h3 i18n="module-assistant.repositories"></h3>
  <section id="module-repositories" class="module-assistant-step scrollable">
    <!-- <step-repositories></step-repositories> -->
  </section>

  <h3 class="module-settings-assistant-section-header-module-type"></h3>
  <section id="module-list" class="module-assistant-step scrollable">
    <!-- <step-modules></step-modules> -->
  </section>

  <h3 i18n="module-assistant.installation"></h3>
  <section id="install" class="module-assistant-step scrollable">
    <!-- <step-install></step-install> -->
  </section>
`;

// const UPDATE_REPOSITORIES_INDEX = 0;
const LANGUAGES_INDEX = 0;
const REPOSITORIES_INDEX = LANGUAGES_INDEX + 1;
const MODULES_INDEX = REPOSITORIES_INDEX + 1;
const INSTALL_INDEX = MODULES_INDEX + 1;


class AssistantStepsAdd extends HTMLElement {
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

  show() {
    this.querySelector('#module-settings-assistant-add-wrapper').style.display = 'flex';
  }

  hide() {
    this.querySelector('#module-settings-assistant-add-wrapper').style.display = 'none';
  }

  async startModuleAssistantSteps() {
    this.show();
    this._resetModuleAssistantContent();

    var addModuleAssistantContainer = this.querySelector('#module-settings-assistant-add');
    var $addModuleAssistantContainer = $(addModuleAssistantContainer);
    console.log('ASSISTANT: initAddModuleAssistant. Steps:', $addModuleAssistantContainer.data('steps'), addModuleAssistantContainer.isConnected);

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
    this._jQueryStepsInitialized = true;

    // jQuery.steps() is messing up with DOM :( we need to reassign step components
    this._setupSteps(addModuleAssistantContainer);

    await this.updateConfigStep.init();
    await this.languagesStep.init();
    await this.languagesStep.listLanguages();
  }

  _resetModuleAssistantContent() {
    var addModuleAssistantContainer = this.querySelector('#module-settings-assistant-add');
    var $addModuleAssistantContainer = $(addModuleAssistantContainer);
    
    if (this._jQueryStepsInitialized) {
      $addModuleAssistantContainer.steps("destroy"); 
      // jQuery.steps("destroy") is messing up with DOM :( we need to find the right element again
      addModuleAssistantContainer = this.querySelector('#module-settings-assistant-add');
    }

    addModuleAssistantContainer.innerHTML = '';
    addModuleAssistantContainer.appendChild(templateAddSteps.content.cloneNode(true));
    assistantHelper.localizeContainer(addModuleAssistantContainer);
  }

  _addModuleAssistantStepChanging(event, currentIndex, newIndex) {
    // if (currentIndex == UPDATE_REPOSITORIES_INDEX && newIndex == LANGUAGES_INDEX) {
    //   return assistantController.get('allRepositories').length > 0;
    // } else 
    if (currentIndex == LANGUAGES_INDEX && newIndex == REPOSITORIES_INDEX) { // Changing from Languages to Repositories
      return assistantController.get('selectedLanguages').size > 0;
    } else if (currentIndex == REPOSITORIES_INDEX && newIndex == MODULES_INDEX) { // Changing from Repositories to Modules 
      return assistantController.get('selectedRepositories').size > 0;
    } else if (currentIndex == MODULES_INDEX && newIndex == INSTALL_INDEX) { // Changing from Modules to Installation
      return assistantController.get('selectedModules').size > 0;
    } else if (currentIndex == INSTALL_INDEX && newIndex != INSTALL_INDEX) {
      return false;
    }

    return true;
  }

  async _addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (currentIndex < MODULES_INDEX) {
      this.updateConfigStep.enableUpdate();
    } else {
      this.updateConfigStep.disableUpdate();
    }

    if (priorIndex == LANGUAGES_INDEX) {
      this.languagesStep.saveSelected();
    } else if (priorIndex == REPOSITORIES_INDEX) {
      this.repositoriesStep.saveSelected();
    } 

    if (currentIndex == REPOSITORIES_INDEX) {
      await this.repositoriesStep.listRepositories();
    } else if (currentIndex == MODULES_INDEX) {
      await this.modulesStep.listModules();
    } else if (currentIndex == INSTALL_INDEX) {
      await this.installStep.installSelectedModules();
    }
  }

  async _addModuleAssistantFinished() {
    $('#module-settings-assistant').dialog('close');
    assistantController.init('installedModules', await app_controller.translation_controller.getInstalledModules());

    if (assistantController.get('moduleType') == 'BIBLE') {
      await app_controller.translation_controller.initTranslationsMenu();
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }
  }

  _setupSteps(container) {
    /** @type {import('./step_update_repositories')} */
    this.updateConfigStep = this.querySelector('step-update-repositories');
    // this.updateConfigStep = document.createElement('step-update-repositories');
    // this._initPage(this.updateConfigStep, UPDATE_REPOSITORIES_INDEX, container);

    /** @type {import('./step_languages')} */
    // this.languagesStep = container.querySelector('step-languages');
    this.languagesStep = document.createElement('step-languages');
    this._initPage(this.languagesStep, LANGUAGES_INDEX, container);

    /** @type {import('./step_repositories')} */
    // this.repositoriesStep = container.querySelector('step-repositories');
    this.repositoriesStep = document.createElement('step-repositories');
    this._initPage(this.repositoriesStep, REPOSITORIES_INDEX, container);

    /** @type {import('./step_modules')} */
    // this.modulesStep = container.querySelector('step-modules');
    this.modulesStep = document.createElement('step-modules');
    this._initPage(this.modulesStep, MODULES_INDEX, container);

    /** @type {import('./step_install')} */
    // this.installStep = container.querySelector('step-install');
    this.installStep = document.createElement('step-install');
    this._initPage(this.installStep, INSTALL_INDEX, container);

    /** @type {import('./unlock_dialog')*/
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

customElements.define('assistant-steps-add', AssistantStepsAdd);
module.exports = AssistantStepsAdd;

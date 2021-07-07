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
require('./assistant_steps_add.js');
require('./assistant_steps_remove.js');

/**
 * @module ModuleAssistant
 * The component implements the dialog that handles module installations and removal.
 * @example
 * <module-assistant></module-assistant>
 * @category Component
 */

const template = html`
<style>
#module-settings-assistant {
  user-select: none;
}

#module-settings-assistant > .container {
  height: 100%;
  box-sizing: border-box;
  padding-top: 1em;
}

#module-settings-assistant-init {
  width: 100%;
  height: 100%;
  min-height: inherit;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  text-align: center;
}

#module-settings-assistant-init > p {
  width: 60%;
  padding: 2em 5em; 
  margin: 0;
  text-align: center;
  font-size: 1.2em;
  line-height: 1.5em;
  border-radius: 5px;
  background: var(--widget-bg-color);
}

#module-settings-assistant-init > .module-assistant-type-buttons {
  align-self: start;
  display: grid;
  grid-auto-flow: column;
  gap: 5em;
}

#module-settings-assistant-init button {
  height: 2.2em;
  padding: 0 2em;
}

#module-settings-assistant section.scrollable {
  overflow-y: auto;
}
#module-settings-assistant .content .body {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 1.5em;
}

</style>

<div id="module-settings-assistant" style="display: none;">
  <div class="container">
  <div id="module-settings-assistant-init">

    <p id="module-settings-assistant-intro"></p>   
    <p id="module-settings-assistant-internet-usage" style="margin-bottom: 2em;"></p>

    <div class="module-assistant-type-buttons">
      <button id="add-modules-button" class="fg-button ui-corner-all ui-state-default ui-state-disabled"></button>
      <button id="remove-modules-button" class="fg-button ui-corner-all ui-state-default ui-state-disabled"></button>
    </div>
  </div>

  <assistant-steps-add></assistant-steps-add>

  <assistant-steps-remove></assistant-steps-remove>
  </div>
</div>
`;

class ModuleAssistant extends HTMLElement{
  constructor() {
    super();
    this._initialized = false;
  }

  connectedCallback() {
    if (this._initialized) {
      return;
    }

    this.appendChild(template.content);

    const addButton = document.querySelector('#add-modules-button');
    addButton.addEventListener('click', async () => this._startAddModuleAssistant());

    const removeButton = document.querySelector('#remove-modules-button');
    removeButton.addEventListener('click', async () => this._startRemoveModuleAssistant());

    /** @type {import('./assistant_steps_add')} */
    this._assistantAdd = document.querySelector('assistant-steps-add');

    /** @type {import('./assistant_steps_remove')} */
    this._assistantRemove = document.querySelector('assistant-steps-remove');

    this._initialized = true;
  }

  initCallbacks(onAllTranslationsRemoved, onTranslationRemoved) {
    this._assistantRemove.initCallbacks(onAllTranslationsRemoved, onTranslationRemoved);
  }

  async openAssistant(moduleType) {
    await assistantController.initState(moduleType);

    const appContainerWidth = $(window).width() - 10;
    var wizardWidth = null;

    if (appContainerWidth < 1100) {
      wizardWidth = appContainerWidth;
    } else {
      wizardWidth = 1100;
    }

    const wizardHeight = $(window).height() * 0.75;

    this._assistantAdd.hide();
    this._assistantRemove.hide();
    $('#module-settings-assistant-init').show();

    const modules = await assistantController.get('installedModules');

    $('#add-modules-button').removeClass('ui-state-disabled');

    if (modules.length > 0) {
      $('#remove-modules-button').removeClass('ui-state-disabled');
    } else {
      $('#remove-modules-button').addClass('ui-state-disabled');
    }

    uiHelper.configureButtonStyles('#module-settings-assistant-init');

    this._localize();
    var title = "";
    if (moduleType == "BIBLE") {
      title = i18n.t("module-assistant.bible-header");
    } else if (moduleType == "DICT") {
      title = i18n.t("module-assistant.dict-header");
    }


    $('#module-settings-assistant').dialog({
      modal: true,
      title: title,
      dialogClass: 'ezra-dialog module-assistant-dialog',
      width: wizardWidth,
      height: wizardHeight,
    });

    assistantHelper.unlockDialog();
  }

  async _startAddModuleAssistant() {
    $('#module-settings-assistant-init').hide();
    await this._assistantAdd.startModuleAssistantSteps();
  }

  async _startRemoveModuleAssistant() {
    $('#module-settings-assistant-init').hide();

    const modules = await assistantController.get('installedModules');
    if (modules.length > 0) {
      this._assistantRemove.startModuleAssistantSteps();
    }
  }

  _localize() {
    var moduleTypeText = "";
    var addModuleText = "";
    var removeModuleText = "";

    const moduleType = assistantController.get('moduleType');
    
    if (moduleType == "BIBLE") {
      moduleTypeText = i18n.t("module-assistant.module-type-bible");
      addModuleText = i18n.t("module-assistant.add-translations");
      removeModuleText = i18n.t("module-assistant.remove-translations");
    } else if (moduleType == "DICT") {
      moduleTypeText = i18n.t("module-assistant.module-type-dict");
      addModuleText = i18n.t("module-assistant.add-dicts");
      removeModuleText = i18n.t("module-assistant.remove-dicts");
    } else {
      console.error("InstallModuleAssistant: Unknown module type!");
    }
    
    var internetUsageNote = i18n.t("module-assistant.internet-usage-note", { module_type: moduleTypeText });
    document.querySelector('#module-settings-assistant-intro').innerHTML = i18n.t("module-assistant.update-data-info-text", {module_type: moduleTypeText});
    document.querySelector('#module-settings-assistant-internet-usage').innerHTML = internetUsageNote;
    document.querySelector('#add-modules-button').textContent = addModuleText;
    document.querySelector('#remove-modules-button').textContent = removeModuleText;
  }
}

customElements.define('module-assistant', ModuleAssistant);
module.exports = ModuleAssistant;

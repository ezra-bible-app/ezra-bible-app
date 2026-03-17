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

const Mousetrap = require('mousetrap');
const { html } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const assistantHelper = require('./assistant_helper.js');
require('./assistant_steps_add_modules.js');
require('./assistant_steps_remove_modules.js');
require('./assistant_checkbox.js');

/**
 * The component implements the dialog that handles module installations and removal.
 * @module ModuleAssistant
 * @example
 * <module-assistant></module-assistant>
 * @category Component
 */

const template = html`

<link href="css/module_settings_assistant.css" media="screen" rel="stylesheet" type="text/css" />

<style>
#module-settings-assistant {
  user-select: none;
}

#module-settings-assistant .error {
  color: red;
}

#module-settings-assistant .content .body {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding-right: 0;
}
#module-settings-assistant section.scrollable {
  border-radius: 5px;
}
#module-settings-assistant .content .scrollable {
  overflow-y: auto;
  background: var(--widget-bg-color);
  padding: 1.5em;
}

</style>

<div id="module-settings-assistant" class="module-settings-assistant" style="display: none;">
  <div class="container">
  <div id="module-settings-assistant-init" class="module-settings-assistant-init">

    <section id="module-settings-assistant-intro">
      <p i18n="module-assistant.intro-text"></p>
      <p class="repository-explanation assistant-note" i18n="module-assistant.step-repositories.what-is-repository"></p>
    </section>

    <section class="module-settings-assistant-internet-usage">
      <p i18n="module-assistant.internet-usage-note"></p>
    </section>

    <div class="module-assistant-type-buttons">
      <button id="add-modules-button" class="fg-button ui-corner-all ui-state-default ui-state-disabled" i18n="module-assistant.add-modules"></button>
      <button id="remove-modules-button" class="fg-button ui-corner-all ui-state-default ui-state-disabled" i18n="module-assistant.remove-modules"></button>
    </div>
  </div>

  <assistant-steps-add-modules></assistant-steps-add-modules>

  <assistant-steps-remove-modules></assistant-steps-remove-modules>
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

    /** @type {import('./assistant_steps_add_modules')} */
    this._assistantAdd = document.querySelector('assistant-steps-add-modules');

    /** @type {import('./assistant_steps_remove_modules')} */
    this._assistantRemove = document.querySelector('assistant-steps-remove-modules');

    this._initialized = true;
  }

  initCallbacks(onAllTranslationsRemoved, onTranslationRemoved) {
    this._assistantRemove.initCallbacks(onAllTranslationsRemoved, onTranslationRemoved);
  }

  async openAssistant(moduleType) {
    await assistantController.initState(moduleType);

    const appContainerWidth = $(window).width() - 10;
    var dialogWidth = null;

    if (appContainerWidth < 1100) {
      dialogWidth = appContainerWidth;
    } else {
      dialogWidth = 1100;
    }

    var dialogHeight = $(window).height() * 0.8;
    var draggable = true;

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

    assistantHelper.localizeContainer(document.querySelector('#module-settings-assistant-init'), moduleType);

    let fullscreen = platformHelper.isCordova();
    let moduleSettingsDialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, null, false, fullscreen);
    moduleSettingsDialogOptions.modal = true;
    moduleSettingsDialogOptions.title = assistantHelper.localizeText("module-assistant.header", moduleType);
    moduleSettingsDialogOptions.dialogClass = 'ezra-dialog module-assistant-dialog';

    Mousetrap.bind('esc', () => { $('#module-settings-assistant').dialog("close"); });

    $('#module-settings-assistant').dialog(moduleSettingsDialogOptions);
    uiHelper.fixDialogCloseIconOnCordova('module-assistant-dialog');

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
}

customElements.define('module-assistant', ModuleAssistant);
module.exports = ModuleAssistant;

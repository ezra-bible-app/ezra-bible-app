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


const { html } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const assistantHelper = require('./assistant_helper.js');
const eventController = require('../../controllers/event_controller.js');

const template = html`
<style>
  .removal-info-container {
    display: flex;
    margin-bottom: 1em;
  }
  .removal-info-container > div {
    margin-right: 1em;
  }
  .removal-info-container .removal-description {
    font-style: italic;
  }
  .removal-info-container :nth-child(3), .removal-info-container :last-child {
    align-self: flex-end;
  }
</style>

<h3 i18n="module-assistant.remove.removing-modules"></h3>
`;

const templateInfoContainer = html`
  <div class="removal-info-container">
    <div class="removal-general-info" i18n="module-assistant.remove.removing"></div>
    <div class="removal-description"></div>
    <div>...</div>
    <div class="removal-status"></div>
  </div>
`;

class StepRemove extends HTMLElement {
  async connectedCallback() {
    this.appendChild(template.content.cloneNode(true));
    assistantHelper.localizeContainer(this, assistantController.get('moduleType'));
  }

  async uninstallSelectedModules() {
    assistantHelper.lockDialogForAction('module-settings-assistant-remove');
    assistantController.setInstallInProgress();

    const selectedModules = assistantController.get('selectedModules');
    setTimeout(async () => {
      for (const currentModule of selectedModules) {
        await this._uninstallModule(currentModule);
      }

      assistantController.setInstallDone();
      assistantHelper.unlockDialog('module-settings-assistant-remove');
    }, 800);
  }

  async _uninstallModule(moduleCode) {
    var localModule = await ipcNsi.getLocalModule(moduleCode, true);

    this._appendRemovalInfo(localModule.description);

    if (window.Sentry != null) {
      Sentry.addBreadcrumb({
        category: "app",
        message: `Removing module ${moduleCode}`,
        level: "info"
      });
    }

    await ipcNsi.uninstallModule(moduleCode);

    const currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    const modules = await app_controller.translation_controller.getInstalledModules('BIBLE');
    const moduleType = assistantController.get('moduleType');

    if (moduleType == 'BIBLE') {

      if (modules.length > 0) {
        if (currentBibleTranslationId == moduleCode) {
          await eventController.publishAsync('on-translation1-changed', {from: currentBibleTranslationId, to: modules[0]});
        }
      } else {
        await eventController.publishAsync('on-all-translations-removed');
      }

      await eventController.publishAsync('on-translation-removed', moduleCode);

    } else if (moduleType == 'COMMENTARY') {
      await eventController.publishAsync('on-commentary-removed', moduleCode);
      
    } else if (moduleType == 'DICT') {
      await eventController.publishAsync('on-dictionary-removed', moduleCode);
    }

    this._setRemovalInfoStatus();
  }

  _appendRemovalInfo(description) {
    const infoContainer = templateInfoContainer.content.cloneNode(true);
    infoContainer.querySelector('.removal-description').textContent = description;

    const generalInfo = infoContainer.querySelector('.removal-general-info');
    generalInfo.textContent = i18n.t(generalInfo.getAttribute('i18n'));

    this.append(infoContainer);
  }

  _setRemovalInfoStatus() {
    const infoContainer = this.lastElementChild;
    var infoStatus = infoContainer.querySelector('.removal-status');

    infoStatus.textContent = i18n.t('general.done');
  }
}

customElements.define('step-remove', StepRemove);
module.exports = StepRemove;

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
const i18nController = require('../../controllers/i18n_controller.js');
const assistantHelper = require('./assistant_helper.js');

const template = html`
<style>
  .update-repository-data-wrapper {
    padding: 1em 2.5%;
    min-height: 3em;
    background: var(--widget-bg-color, #eee);
    border-radius: 5px;
  }
  #update-repository-data-info {
    text-align: center;
  }
  #update-repository-data-info .intro{
    margin: 0 0 1em;
  }

  #update-repository-data-progress p, #update-repository-data-progress .progress-bar{
    margin: 0;
  }
</style>

<section class="update-repository-data-wrapper">
  
  <div id="update-repository-data-info" class="info-view">
    <span class="update-info"></span>
    <button id="update-repo-data" class="fg-button ui-state-default ui-corner-all" i18n="module-assistant.update-now"></button>
  </div>
  
  <div id="update-repository-data-progress" class="update-view"> 
    <p i18n="module-assistant.updating-repository-data"></p>
    <div id="repo-update-progress-bar" class="progress-bar">
      <div class="progress-label" i18n="module-assistant.updating"></div>
    </div>
  </div>  
  <p id="update-failed" style="display: none" i18n="module-assistant.update-repository-data-failed"></p>

</section>
`;

class StepUpdateRepositories extends HTMLElement {
  constructor() {
    super();
    console.log('UPDATE: step constructor');
    this._lastUpdate = null;
    this._children_initialized = false;
    this.updateDisabled = false;
  }

  async connectedCallback() {
    console.log('UPDATE: started connectedCallback');
    if (!this._children_initialized) {
      this.appendChild(template.content.cloneNode(true));
  
      this.querySelector('#update-repo-data').addEventListener('click', async () => await this._updateRepositoryConfig());
      this._children_initialized = true;
    }  
  }

  async init() {
    assistantHelper.localize(this);
    if (await this._wasUpdated()) {
      this._showUpdateInfo();
    } else {
      await this._updateRepositoryConfig();
    }
  }

  disableUpdate() {
    this.updateDisabled = true;
    this.querySelector('#update-repo-data').classList.add('ui-state-disabled');
  }

  enableUpdate() {
    this.updateDisabled = false;
    this.querySelector('#update-repo-data').classList.remove('ui-state-disabled');
  }

  async _wasUpdated() {
    const repoConfigExists = assistantController.get('repositoriesAvailable');

    const lastUpdate = await ipcSettings.get('lastSwordRepoUpdate', undefined);

    if (repoConfigExists && lastUpdate) {
      this._updateDate(new Date(Date.parse(lastUpdate))); 
      return true;
    }

    return false;
  }

  _showUpdateInfo() {
    console.log('UPDATE: showUpdateInfo');
    this._toggleViews('INFO');

    this.querySelector('.update-info').textContent = i18n.t("module-assistant.repo-data-last-updated", { date: this._lastUpdate });
    uiHelper.configureButtonStyles(this);
  }

  async _updateRepositoryConfig() {
    if (this.updateDisabled) {
      return;
    }
    console.log('UPDATE: updateRepositoryConfig');
    this._toggleViews('UPDATE');

    assistantController.pendingAllRepositoryData();

    var listRepoTimeoutMs = 500;

    uiHelper.initProgressBar($('#repo-update-progress-bar'));
    var ret = await ipcNsi.updateRepositoryConfig((progress) => {
      var progressBar = $('#repo-update-progress-bar');
      var progressPercent = progress.totalPercent;
      progressBar.progressbar("value", progressPercent);
    });

    if (ret == 0) {
      const today = new Date();
      this._updateDate(today);
      await ipcSettings.set('lastSwordRepoUpdate', today);
    } else {
      console.log("Failed to update the repository configuration!");
      listRepoTimeoutMs = 3000;
      this.querySelector('#update-failed').style.display = 'block';     
    }

    assistantController.resolveAllRepositoryData();
    setTimeout(() => { this._showUpdateInfo(); }, listRepoTimeoutMs);
  }

  _updateDate(date) {
    this._lastUpdate = date.toLocaleDateString(i18nController.getLocale());
  }

  _toggleViews(view='INFO') {
    const infoView = this.querySelector('.info-view');
    const updateView = this.querySelector('.update-view');
    if (view === 'UPDATE') {
      infoView.style.display = 'none';
      updateView.style.display = 'block';  
    } else {
      updateView.style.display = 'none';
      infoView.style.display = 'block';
    }
  }

}

customElements.define('step-update-repositories', StepUpdateRepositories);
module.exports = StepUpdateRepositories;

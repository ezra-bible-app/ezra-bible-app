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
  #update-repository-data-wrapper {
    padding: 2.5%;
    background-color: #eee;
    border-radius: 5px;
  }
  #update-repository-data-wrapper .intro{
    margin: 0 0 1em;
  }
  #update-repository-data-progress {
    min-height: 3.5em;
  }
  #update-repository-data-progress p, #update-repository-data-progress .progress-bar{
    margin: 0;
  }
  #update-repository-data-info {
    text-align: center;
    min-height: 3.5em;
  }
</style>

<div id="update-repository-data-wrapper">
<p class="intro"></p>   
<div id="update-repository-data-progress" class="update-view"> 
  <p i18n="module-assistant.updating-repository-data"></p>
  <div id="repo-update-progress-bar" class="progress-bar">
    <div class="progress-label" i18n="module-assistant.updating"></div>
  </div>
</div>  

<div id="update-repository-data-info" class="info-view">
  <span class="update-info"></span>
  <button id="update-repo-data" class="fg-button ui-state-default ui-corner-all" i18n="module-assistant.update-now"></button>
</div>

<p id="update-failed" style="display: none" i18n="module-assistant.update-repository-data-failed"></p>
</div>
`;

class StepUpdateRepositories extends HTMLElement {
  constructor() {
    super();
    console.log('UPDATE: step constructor');
    this._lastUpdate = null;
    this._children_initialized = false;
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
    this._localize();
    if (await this._wasUpdated()) {
      this._showUpdateInfo();
    } else {
      this._updateRepositoryConfig();
    }
  }

  async _wasUpdated() {
    const repoConfigExists = await ipcNsi.repositoryConfigExisting();

    const lastUpdate = await ipcSettings.get('lastSwordRepoUpdate', undefined);
    
    if (repoConfigExists && lastUpdate !== undefined) {
      this._updateDate(new Date(Date.parse(lastUpdate))); 
      return true;
    }

    return false;
  }

  async _showUpdateInfo() {
    console.log('UPDATE: showUpdateInfo');
    this._toggleViews('INFO');

    this.querySelector('.update-info').textContent = i18n.t("module-assistant.repo-data-last-updated", { date: this._lastUpdate });
    uiHelper.configureButtonStyles(this);
  }

  async _updateRepositoryConfig() {
    console.log('UPDATE: updateRepositoryConfig');
    this._toggleViews('UPDATE');

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
      await assistantController.updateAllRepositoryData();
    } else {
      console.log("Failed to update the repository configuration!");
      listRepoTimeoutMs = 3000;
      this.querySelector('#update-failed').style.display = 'block';     
    }

    setTimeout(async () => { this._showUpdateInfo(); }, listRepoTimeoutMs);
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

  _localize() {
    let moduleTypeText = "";
    const moduleType = assistantController.get('moduleType');
    if (moduleType == "BIBLE") {
      moduleTypeText = i18n.t("module-assistant.module-type-bible");
    } else if (moduleType == "DICT") {
      moduleTypeText = i18n.t("module-assistant.module-type-dict");
    }
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.update-data-info-text", {module_type: moduleTypeText});

    assistantHelper.localize(this);
  }
}

customElements.define('step-update-repositories', StepUpdateRepositories);
module.exports = StepUpdateRepositories;

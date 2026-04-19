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

/**
 * The VinesHelper handles all Vine's Expository Dictionary related functionality
 * for the WordStudyPanel, including index generation and rendering of Vines links.
 * 
 * @category Component
 */
class VinesHelper {
  constructor(wordStudyPanel) {
    this._wordStudyPanel = wordStudyPanel;
  }

  async getVinesContent(strongsEntry) {
    // Vines only applies to Greek Strong's numbers
    if (!strongsEntry.key || strongsEntry.key[0] !== 'G') {
      return '';
    }

    // Check if the Vines module is installed
    var dictModules = await ipcNsi.getAllLocalModules('DICT');
    var vinesInstalled = dictModules.some((m) => m.name === 'Vines');

    if (!vinesInstalled) {
      return this._getVinesNotInstalledHtml();
    }

    var indexExists = await ipcGeneral.vinesIndexExists();
    if (!indexExists) {
      return this._getVinesIndexNotAvailableHtml();
    }

    return await this._getVinesLinksHtml(strongsEntry.key);
  }

  _getVinesNotInstalledHtml() {
    return `
      <div id='vines-box'>
        <div class='dictionary-section'>
          <div class='bold word-study-title' style='margin-bottom: 0.5em'>Vine's Expository Dictionary</div>
          <div class='dictionary-content'>
            <p>${i18n.t('word-study-panel.vines-not-installed')}</p>
          </div>
        </div>
        <hr></hr>
      </div>
    `;
  }

  _getVinesIndexNotAvailableHtml() {
    return `
      <div id='vines-box'>
        <div class='dictionary-section'>
          <div class='bold word-study-title' style='margin-bottom: 0.5em'>Vine's Expository Dictionary</div>
          <div class='dictionary-content'>
            <p>${i18n.t('word-study-panel.vines-index-not-available')}</p>
            <button id='generate-vines-index-button'
                    class='fg-button ui-corner-all ui-state-default'>
              ${i18n.t('word-study-panel.generate-index')}
            </button>
          </div>
        </div>
        <hr></hr>
      </div>
    `;
  }

  async _getVinesLinksHtml(strongsKey) {
    var vinesKeys = await ipcGeneral.getVinesKeysForStrongs(strongsKey);

    if (!vinesKeys || vinesKeys.length === 0) {
      return '';
    }

    let links = vinesKeys.map((key) => {
      return `<a href="sword://Vines/${key}" style="cursor: pointer;">${key}</a>`;
    }).join('<br>');

    return `
      <div id='vines-box'>
        <div class='dictionary-section'>
          <div class='bold word-study-title' style='margin-bottom: 0.5em'>Vine's Expository Dictionary</div>
          <div class='dictionary-content'>${links}</div>
        </div>
        <hr></hr>
      </div>
    `;
  }

  attachVinesEventHandlers() {
    const panelContent = this._wordStudyPanel.wordStudyPanelContent[0];

    let generateButton = panelContent.querySelector('#generate-vines-index-button');
    if (generateButton != null) {
      generateButton.addEventListener('click', () => {
        this.handleGenerateVinesIndex(generateButton);
      });
    }
  }

  async handleGenerateVinesIndex(button) {
    const vinesBox = document.getElementById('vines-box');

    if (vinesBox == null) {
      return;
    }

    vinesBox.innerHTML = `
      <div class='dictionary-section'>
        <div class='bold word-study-title' style='margin-bottom: 0.5em'>Vine's Expository Dictionary</div>
        <div class='dictionary-content'>
          <div id='vines-index-progress-bar' class='progress-bar'>
            <div class='progress-label'>0%</div>
          </div>
        </div>
      </div>
      <hr></hr>
    `;

    const $progressBar = $('#vines-index-progress-bar');
    uiHelper.initProgressBar($progressBar);

    await ipcGeneral.buildVinesIndex((progress) => {
      $progressBar.progressbar("value", progress.totalPercent);
    });

    const currentStrongsEntry = this._wordStudyPanel.currentStrongsEntry;
    if (currentStrongsEntry != null) {
      vinesBox.outerHTML = await this._getVinesLinksHtml(currentStrongsEntry.key);

      // Re-initialize sword:// links for the new content
      const swordUrlHelper = require('../../../helpers/sword_url_helper.js');
      swordUrlHelper.initSwordUrlLinks(this._wordStudyPanel.wordStudyPanelContent[0], null);
    }
  }
}

module.exports = VinesHelper;

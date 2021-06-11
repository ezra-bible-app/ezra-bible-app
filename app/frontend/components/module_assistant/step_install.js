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


const { html, sleep } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');

const template = html`
<style>
  .intro {
    margin-bottom: 2em;
  }
  #module-install-progress-bar {
    width: 80%; 
    float: left;
  }
  #module-install-progress-msg {
    width: 80%; 
    clear: both; 
    padding-top: 0.5em; 
    text-align: center;
  }
</style>

<h3></h3>
<p class="intro"></p>
<div id='progress-bar-container'>
  <div style='float: left; margin-bottom: 1em;'>
    <span i18n="module-assistant.installing"></span>
    <i id="module-info"></i> ... 
  </div>
  <div id="module-install-progress-bar" class="progress-bar">
    <div class="progress-label" i18n="module-assistant.installing"></div>
  </div>
  <div style='float: left;'>
    <button id='cancel-module-installation-button' class='fg-button ui-corner-all ui-state-default' i18n="general.cancel"></button>
  </div>
  <div id="module-install-progress-msg"></div>
</div>
`;

class StepInstall extends HTMLElement {
  constructor() {
    super();
    console.log('INSTALL: step constructor');
  }


  async connectedCallback() {
    this.appendChild(template.content);
    this.localize();
    console.log('INSTALL: started connectedCallback');

    this.$progressBar = $(this.querySelector('#module-install-progress-bar'));
    this.progressMessage = this.querySelector('#module-install-progress-msg');

    uiHelper.configureButtonStyles('#module-settings-assistant-add-p-3');

    const cancelInstallButton = this.querySelector('#cancel-module-installation-button');
    cancelInstallButton.addEventListener('click', async () => {
      cancelInstallButton.classList.add('ui-state-disabled');
      this._moduleInstallationCancelled = true;
      ipcNsi.cancelInstallation();
    });

    this.installSelectedModules();
  }

  async installSelectedModules() {

    assistantController.setInstallInProgress();

    const selectedModules = await assistantController.get('selectedModules');
    for (const currentModule of selectedModules) {
      var swordModule = await ipcNsi.getRepoModule(currentModule);
      var unlockFailed = true;

      while (unlockFailed) {
        try {
          await this.installModule(currentModule);
          unlockFailed = false;

        } catch (e) {
          if (e == "UnlockError") {
            unlockFailed = true;
          }
        }

        if (unlockFailed) {
          this.unlockDialog.show(swordModule.name, swordModule.unlockInfo);

          while (this.unlockDialog.opened) {
            await sleep(200);
          }

          if (this.unlockDialog.cancelled) {
            break;
          }
        }
      }
    }

    $('#cancel-module-installation-button').addClass('ui-state-disabled');
    assistantController.setInstallDone();
  }

  async installModule(installPage, moduleCode) {
    var swordModule = await ipcNsi.getRepoModule(moduleCode);

    this.querySelector('#module-info').textContent = swordModule.description;


    uiHelper.initProgressBar(this.$progressBar);

    var installSuccessful = true;
    var unlockSuccessful = true;
    
    try {
      let moduleInstalled = false;
      const localModule = await ipcNsi.getLocalModule(moduleCode);
      if (localModule !== undefined && localModule !== null) {
        moduleInstalled = true;
      }

      if (!moduleInstalled) {
        this.progressMessageBox.innerHTML('');
        await ipcNsi.installModule(moduleCode, progress => this.handleModuleInstallProgress(progress));
      }

      // FIXME
      // Sleep a bit after installation. This is actually a hack to prevent
      // a "white screen error" right after module installation. The exact reason
      // for that error is unclear, but the sleeping prevents it.
      await sleep(100);

      if (swordModule.locked) {
        const unlockSuccessful = assistantController.applyUnlockKey(moduleCode);
        if (!unlockSuccessful) {
          const errorMessage = "Locked module is not readable! Wrong unlock key?";
          throw errorMessage;
        }
      }

      // FIXME: Put this in a callback
      if (assistantController.get('moduleType') == 'BIBLE') {
        await app_controller.updateUiAfterBibleTranslationAvailable(moduleCode);
      }
    } catch (e) {
      console.log("Error during installation: " + e);
      installSuccessful = false;
    }

    if (installSuccessful) {
      Sentry.addBreadcrumb({category: "app",
                            message: `Installed module ${moduleCode}`,
                            level: Sentry.Severity.Info});

      this.$progressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + i18n.t("general.done") + '.</div>');
      this.$progressBar.progressbar("value", 100);
      var strongsAvailable = await ipcNsi.strongsAvailable();

      if (assistantController.get('moduleType') == 'BIBLE' && swordModule.hasStrongs && !strongsAvailable) {
        await this.installStrongsModules(installPage);
      }
    } else {
      var errorMessage = "";

      if (!unlockSuccessful) {
        errorMessage = i18n.t("general.module-unlock-failed");
      } else {
        if (this._moduleInstallationCancelled) {
          errorMessage = i18n.t("general.module-install-cancelled");
        } else {
          errorMessage = i18n.t("general.module-install-failed");
        }
      }

      this.$progressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + errorMessage + '</div>');
    }

    if (swordModule.locked && !unlockSuccessful) {
      console.log(swordModule);
      throw "UnlockError";
    }
  }

  handleModuleInstallProgress(progress) {
    const {totalPercent, message} = progress;

    this.$progressbar.progressbar("value", totalPercent);

    if (message != '') {
      this.progressMessageBox.textContent = localizeModuleInstallProgressMessage(message);
    }
    
    if (totalPercent == 100) {
      this.progressMessageBox.innerHTML = '';
    }
  }

  async installStrongsModules() {

    this.$progressBar.before("<div style='float: left; margin-bottom: 1em;'>" + i18n.t("general.installing-strongs") + " ... </div>");

    var strongsInstallSuccessful = true;

    try {
      var hebrewStrongsAvailable = await ipcNsi.hebrewStrongsAvailable();
      var greekStrongsAvailable = await ipcNsi.greekStrongsAvailable();

      if (!hebrewStrongsAvailable) {
        await ipcNsi.installModule("StrongsHebrew", (progress) => { this.handleModuleInstallProgress(progress); });
      }

      if (!greekStrongsAvailable) {
        await ipcNsi.installModule("StrongsGreek", (progress) => { this.handleModuleInstallProgress(progress); });
      }
    } catch (e) {
      strongsInstallSuccessful = false;
    }

    if (strongsInstallSuccessful) {
      app_controller.dictionary_controller.runAvailabilityCheck();
      
      this.$progressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + i18n.t("general.done") + '.</div>');
    } else {
      this.$progressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + i18n.t("general.module-install-failed") + '</div>');
    }
  }

  localize() {
    var installingModules = "";
    var itTakesTime = "";
    const moduleType = assistantController.get('moduleType');
    if (moduleType == 'BIBLE') {
      installingModules = i18n.t("module-assistant.installing-translations");
      itTakesTime = i18n.t("module-assistant.it-takes-time-to-install-translation");
    } else if (moduleType == 'DICT') {
      installingModules = i18n.t("module-assistant.installing-dictionaries");
      itTakesTime = i18n.t("module-assistant.it-takes-time-to-install-dictionary");
    }

    this.querySelector('h3').textContent = installingModules;
    this.querySelector('.intro').textContent = itTakesTime;

    this.querySelectorAll('[i18n]').forEach(element => {
      element.innerHTML = i18n.t(element.getAttribute('i18n'));
    });
  }
}

customElements.define('step-install', StepInstall);
module.exports = StepInstall;

function localizeModuleInstallProgressMessage(rawMessage) {
  // rawMessage: Downloading (1 of 6): nt.bzz
  rawMessage = rawMessage.replace("Downloading ", "");
  var splittedMessage = rawMessage.split(": ");

  var partOfTotal = splittedMessage[0];
  partOfTotal = partOfTotal.replace("(", "");
  partOfTotal = partOfTotal.replace(")", "");
  var fileName = splittedMessage[1];

  var splittedPartOfTotal = partOfTotal.split(" of ");
  var part = splittedPartOfTotal[0];
  var total = splittedPartOfTotal[1];

  var localizedMessage = i18n.t("module-assistant.downloading") + " (" + part + " " + i18n.t("module-assistant.part-of-total") + " " + total + "): " + fileName;

  return localizedMessage;
}

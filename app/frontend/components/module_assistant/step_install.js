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
const assistantHelper = require('./assistant_helper.js');

const template = html`
<style>
  .intro {
    margin-bottom: 2em;
  }
  .install-info-container {
    display: flex;
    align-items: center;
    margin-bottom: 1em;
  }
  .install-info-container > div {
    margin-right: 1em;
  }
  .install-info-container .install-description {
    font-style: italic;
  }
  .install-info-container .install-status.error {
    color: red;
  }
  #progress-bar-container {
    display: flex;
  }
  #module-install-progress-bar {
    width: 80%; 
  }
  #module-install-progress-msg {
    width: 80%; 
    padding-top: 0.5em; 
    text-align: center;
  }
</style>

<h3></h3>
<p class="intro"></p>
<div id="progress-bar-container">
  <div id="module-install-progress-bar" class="progress-bar">
    <div class="progress-label" i18n="module-assistant.installing"></div>
  </div>
  <button id='cancel-module-installation-button' class='fg-button ui-corner-all ui-state-default' i18n="general.cancel"></button>
</div>
<div id="module-install-progress-msg"></div>
`;

const templateInfoContainer = html`
  <div class="install-info-container">
    <div class="install-general-info" i18n="module-assistant.installing"></div>
    <div class="install-description"></div>
    <div>...</div> 
    <div class="install-status"></div>
  </div>
`;

class StepInstall extends HTMLElement {
  constructor() {
    super();

    this._moduleInstallationCancelled = false;
    console.log('INSTALL: step constructor');
  }


  async connectedCallback() {
    this.appendChild(template.content);
    this.localize();
    console.log('INSTALL: started connectedCallback');

    this.progressContainer = document.querySelector('#progress-bar-container');
    this.progressBar = document.querySelector('#module-install-progress-bar');
    this.progressMessage = this.querySelector('#module-install-progress-msg');

    uiHelper.configureButtonStyles(this);

    const cancelInstallButton = this.querySelector('#cancel-module-installation-button');
    cancelInstallButton.addEventListener('click', async () => {
      cancelInstallButton.classList.add('ui-state-disabled');
      this._moduleInstallationCancelled = true;
      ipcNsi.cancelInstallation();
    });

    this.installSelectedModules();
  }

  async installSelectedModules() {
    console.log('INSTALL: installSelectedModules');
    assistantHelper.lockDialogForAction('module-settings-assistant-add');
    assistantController.setInstallInProgress();

    const selectedModules = await assistantController.get('selectedModules');
    for (const currentModule of selectedModules) {
      var swordModule = await ipcNsi.getRepoModule(currentModule);
      var unlockFailed = true;

      while (unlockFailed) {
        try {
          unlockFailed = false;
          await this.installModule(currentModule);
        } catch (e) {
          if (e == "UnlockError") {
            unlockFailed = true;
          }
        }

        if (unlockFailed) {
          console.log('INSTALL: installSelectedModules unlockFailed');
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

    this.querySelector('#cancel-module-installation-button').classList.add('ui-state-disabled');
    assistantController.setInstallDone();
    assistantHelper.unlockDialog('module-settings-assistant-add');
  }

  async installModule(moduleCode) {
    console.log('INSTALL: installModule', moduleCode);
    var swordModule = await ipcNsi.getRepoModule(moduleCode);

    this.appendInstallationInfo(swordModule.description);

    uiHelper.initProgressBar($(this.progressBar));

    var installSuccessful = true;
    var unlockSuccessful = true;
    
    try {
      let moduleInstalled = false;
      const localModule = await ipcNsi.getLocalModule(moduleCode);
      if (localModule !== undefined && localModule !== null) {
        moduleInstalled = true;
      }

      if (!moduleInstalled) {
        this.progressMessage.innerHTML = '';
        await ipcNsi.installModule(moduleCode, progress => this.handleModuleInstallProgress(progress));
      }

      // FIXME
      // Sleep a bit after installation. This is actually a hack to prevent
      // a "white screen error" right after module installation. The exact reason
      // for that error is unclear, but the sleeping prevents it.
      // await sleep(100);

      if (swordModule.locked) {
        unlockSuccessful = assistantController.applyUnlockKey(moduleCode);
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

      this.setInstallationInfoStatus();
      $(this.progressBar).progressbar("value", 100);
      var strongsAvailable = await ipcNsi.strongsAvailable();

      if (assistantController.get('moduleType') == 'BIBLE' && swordModule.hasStrongs && !strongsAvailable) {
        await this.installStrongsModules();
      }
    } else {
      let errorType = "";

      if (!unlockSuccessful) {
        errorType = "module-unlock-failed";
      } else {
        if (this._moduleInstallationCancelled) {
          errorType = "module-install-cancelled";
        } else {
          errorType = "module-install-failed";
        }
      }

      this.setInstallationInfoStatus(errorType);
    }

    if (swordModule.locked && !unlockSuccessful) {
      console.log(swordModule);
      throw "UnlockError";
    }
  }

  handleModuleInstallProgress(progress) {
    const {totalPercent, message} = progress;

    $(this.progressBar).progressbar("value", totalPercent);

    if (message != '') {
      this.progressMessage.textContent = localizeModuleInstallProgressMessage(message);
    }
    
    if (totalPercent == 100) {
      this.progressMessage.innerHTML = '';
    }
  }

  async installStrongsModules() {
    console.log('INSTALL: installStrongsModules');

    this.appendInstallationInfo(i18n.t("general.installing-strongs"), true);

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
      this.setInstallationInfoStatus();
    } else {
      this.setInstallationInfoStatus("module-install-failed");
    }
  }

  appendInstallationInfo(description, hideGeneralInfo=false) {
    const infoContainer = templateInfoContainer.content.cloneNode(true);
    infoContainer.querySelector('.install-description').textContent = description;
    if (!hideGeneralInfo) {
      const generalInfo = infoContainer.querySelector('.install-general-info');
      generalInfo.textContent = i18n.t(generalInfo.getAttribute('i18n'));
    }
    this.progressContainer.parentElement.insertBefore(infoContainer, this.progressContainer);
  }

  setInstallationInfoStatus(errorType="") {
    const infoContainer = this.progressContainer.previousElementSibling;
    var infoStatus = infoContainer.querySelector('.install-status');
    const i18nKey = errorType === "" ? "done" : errorType;
    infoStatus.textContent = i18n.t(`general.${i18nKey}`);
    if (errorType !== "") {
      infoStatus.classList.add('error');
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

    assistantHelper.localize(this);
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

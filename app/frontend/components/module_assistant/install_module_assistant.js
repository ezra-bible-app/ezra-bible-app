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

const ModuleAssistantHelper = require('./module_assistant_helper.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const { sleep } = require('../../helpers/ezra_helper.js');
require('../loading_indicator.js');
require('./step_languages.js');
require('./step_repositories.js');

/**
 * The InstallModuleAssistant component implements the dialog that handles module installations.
 * 
 * @category Component
 */
class InstallModuleAssistant {
  constructor() {
    this._helper = new ModuleAssistantHelper();
    this._addModuleAssistantOriginalContent = undefined;

    var addButton = $('#add-modules-button');
    addButton.bind('click', () => this.openAddModuleAssistant());
  }

  async openAssistant(moduleType) {
    this.init(moduleType);

    var appContainerWidth = $(window).width() - 10;
    var wizardWidth = null;

    if (appContainerWidth < 1100) {
      wizardWidth = appContainerWidth;
    } else {
      wizardWidth = 1100;
    }

    var offsetLeft = appContainerWidth - wizardWidth - 100;
    var offsetTop = 20;

    $('#module-settings-assistant-add').hide();
    $('#module-settings-assistant-remove').hide();
    $('#module-settings-assistant-init').show();

    var modules = await app_controller.translation_controller.getInstalledModules(moduleType);

    $('#add-modules-button').removeClass('ui-state-disabled');

    if (modules.length > 0) {
      $('#remove-modules-button').removeClass('ui-state-disabled');
    } else {
      $('#remove-modules-button').addClass('ui-state-disabled');
    }

    uiHelper.configureButtonStyles('#module-settings-assistant-init');

    var title = "";
    var addModuleText = "";
    var removeModuleText = "";

    if (moduleType == "BIBLE") {
      title = i18n.t("module-assistant.bible-header");
      this._moduleTypeText = i18n.t("module-assistant.module-type-bible");
      addModuleText = i18n.t("module-assistant.add-translations");
      removeModuleText = i18n.t("module-assistant.remove-translations");
    } else if (moduleType == "DICT") {
      title = i18n.t("module-assistant.dict-header");
      this._moduleTypeText = i18n.t("module-assistant.module-type-dict");
      addModuleText = i18n.t("module-assistant.add-dicts");
      removeModuleText = i18n.t("module-assistant.remove-dicts");
    } else {
      console.error("InstallModuleAssistant: Unknown module type!");
    }

    var internetUsageNote = i18n.t("module-assistant.internet-usage-note", { module_type: this._moduleTypeText });
    $('#module-settings-assistant-internet-usage').html(internetUsageNote);
    $('#add-modules-button').html(addModuleText);
    $('#remove-modules-button').html(removeModuleText);

    $('#module-settings-assistant').dialog({
      position: [offsetLeft, offsetTop],
      modal: true,
      title: title,
      dialogClass: 'ezra-dialog module-assistant-dialog',
      width: wizardWidth,
      minHeight: 280
    });

    this._helper.unlockDialog();
  }

  async init(moduleType) {
    this._installedModules = null;
    this._moduleInstallStatus = 'DONE';
    this._translationRemovalStatus = 'DONE';
    this._unlockKeys = {};
    this._unlockDialogOpened = false;
    this._unlockCancelled = false;
    this._currentModuleType = moduleType;
    this._moduleInstallationCancelled = false;

    // Preload info while user reads internet usage warning
    this.allRepositories = await ipcNsi.getRepoNames();
  }

  async isModuleInstalled(moduleCode) {
    if (this._installedModules == null) {
      this._installedModules = await app_controller.translation_controller.getInstalledModules(this._currentModuleType);
    }

    for (var i = 0; i < this._installedModules.length; i++) {
      if (this._installedModules[i] == moduleCode) {
        return true;
      }
    }

    return false;
  }

  async initRepositoryPage() {
    this.repositoriesStep = document.createElement('step-repositories');
    console.log('ASSISTANT: set repoStep props');
    this.repositoriesStep.moduleType = this._currentModuleType;
    this.repositoriesStep.repositories = this.allRepositories;
    this.repositoriesStep.languages = this._selectedLanguages;

    const wizardPage = $('#module-settings-assistant-add-p-1');
    wizardPage.empty();

    wizardPage.append(this.repositoriesStep);
  }

  async openAddModuleAssistant() {
    $('#module-settings-assistant-init').hide();
    this.initAddModuleAssistant();
    $('#module-settings-assistant-add').show();

    await this.initLanguagesPage();
  }

  initAddModuleAssistant() {
    if (this._addModuleAssistantOriginalContent != undefined) {
      $('#module-settings-assistant-add').steps("destroy");
      $('#module-settings-assistant-add').html(this._addModuleAssistantOriginalContent);
    } else {
      this._addModuleAssistantOriginalContent = $('#module-settings-assistant-add').html();
    }

    $('.module-settings-assistant-section-header-module-type').html(this._moduleTypeText);

    $('#module-settings-assistant-add').steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-assistant-add",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this.addModuleAssistantStepChanging(event, currentIndex, newIndex),
      onStepChanged: async (event, currentIndex, priorIndex) => this.addModuleAssistantStepChanged(event, currentIndex, priorIndex),
      onFinishing: (event, currentIndex) => this.addModuleAssistantFinishing(event, currentIndex),
      onFinished: (event, currentIndex) => this.addModuleAssistantFinished(event, currentIndex),
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });
  }

  addModuleAssistantStepChanging(event, currentIndex, newIndex) {
    const wizardPage = `#module-settings-assistant-add-p-${currentIndex}`;
    const selectedElements = this._helper.getSelectedSettingsAssistantElements(wizardPage);

    if (currentIndex == 0 && newIndex == 1) { // Changing from Languages (1) to Repositories (2)
      this._selectedLanguages = selectedElements;
    } else if (currentIndex == 1 && newIndex == 2) { // Changing from Repositories (2) to Modules (3)
      this._selectedRepositories = selectedElements;
    } else if (currentIndex == 2 && newIndex == 3) { // Changing from Modules (3) to Installation (4)
      this.selectedModules = selectedElements;
    } else if (currentIndex == 3 && newIndex != 3) {
      return false;
    }

    return selectedElements.length > 0;
  }

  async addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0 && currentIndex == 1) {
      await ipcSettings.set('selectedLanguages', this._selectedLanguages);
      await this.initRepositoryPage();

    } else if (priorIndex == 1 && currentIndex == 2) {
      await ipcSettings.set('selectedRepositories', this._selectedRepositories);
      this.initModulesPage();

    } else if (currentIndex == 3) {

      this.installSelectedModules();
    }
  }

  addModuleAssistantFinishing(event, currentIndex) {
    return this._moduleInstallStatus != 'IN_PROGRESS';
  }

  async addModuleAssistantFinished(event, currentIndex) {
    $('#module-settings-assistant').dialog('close');
    this._installedModules = await app_controller.translation_controller.getInstalledModules();

    if (this._currentModuleType == 'BIBLE') {
      await app_controller.translation_controller.initTranslationsMenu();
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }
  }

  // This is only for testing!!
  resetInstalledModules() {
    this._installedModules = [];
  }

  async initLanguagesPage() {
    this.languagesStep = document.createElement('step-languages');
    this.languagesStep.moduleType = this._currentModuleType;
    this.languagesStep.repositories = this.allRepositories;

    const wizardPage = $('#module-settings-assistant-add-p-0');
    wizardPage.empty();

    wizardPage.append(this.languagesStep);

  }

  async initModulesPage() {
    // this.modulesStep = document.createElement('step-repositories');

    // const wizardPage = $('#module-settings-assistant-add-p-2');

    // wizardPage.append(this.modulesStep);
    await this.listModules();
  }

  async installSelectedModules() {
    // Bible modules have been selected

    this._helper.lockDialogForAction('module-settings-assistant-add');

    var moduleListPage = "#module-settings-assistant-add-p-2";
    var modules = this._helper.getSelectedSettingsAssistantElements(moduleListPage);

    this._moduleInstallStatus = 'IN_PROGRESS';

    var installPage = $("#module-settings-assistant-add-p-3");
    installPage.empty();

    var installingModules = "";
    var itTakesTime = "";
    if (this._currentModuleType == 'BIBLE') {
      installingModules = i18n.t("module-assistant.installing-translations");
      itTakesTime = i18n.t("module-assistant.it-takes-time-to-install-translation");
    } else if (this._currentModuleType == 'DICT') {
      installingModules = i18n.t("module-assistant.installing-dictionaries");
      itTakesTime = i18n.t("module-assistant.it-takes-time-to-install-dictionary");
    }

    installPage.append('<h3>' + installingModules + '</h3>');
    installPage.append('<p style="margin-bottom: 2em;">' + itTakesTime + '</p>');

    for (var i = 0; i < modules.length; i++) {
      var currentModule = modules[i];
      var swordModule = await ipcNsi.getRepoModule(currentModule);
      var unlockFailed = true;

      while (unlockFailed) {
        try {
          await this.installModule(installPage, currentModule);
          unlockFailed = false;

        } catch (e) {
          if (e == "UnlockError") {
            unlockFailed = true;
          }
        }

        if (unlockFailed) {
          this.showUnlockDialog(swordModule);

          while (this._unlockDialogOpened) {
            await sleep(200);
          }

          if (this._unlockCancelled) {
            break;
          }
        }
      }
    }

    $('#cancel-module-installation-button').addClass('ui-state-disabled');
    this._moduleInstallStatus = 'DONE';
    this._helper.unlockDialog('module-settings-assistant-add');
  }

  localizeModuleInstallProgressMessage(rawMessage) {
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

  handleModuleInstallProgress(progress) {
    var progressPercent = progress.totalPercent;
    var progressMessage = progress.message;

    var progressMessageBox = $('#module-install-progress-msg');
    var progressbar = $('#module-install-progress-bar');

    progressbar.progressbar("value", progressPercent);

    if (progressMessage != '') {
      var localizedMessage = this.localizeModuleInstallProgressMessage(progressMessage);
      progressMessageBox.text(localizedMessage);
    }
    
    if (progressPercent == 100) {
      progressMessageBox.empty();
    }
  }

  async installModule(installPage, moduleCode) {
    var swordModule = await ipcNsi.getRepoModule(moduleCode);

    var existingProgressBar = $('#module-install-progress-bar');
    var installingModuleText = "<div style='float: left; margin-bottom: 1em;'>" + i18n.t("module-assistant.installing") + " <i>" + swordModule.description + "</i> ... </div>";

    if (existingProgressBar.length == 0) {
      installPage.append(installingModuleText);
    } else {
      existingProgressBar.before(installingModuleText);
    }

    var installingText = i18n.t('module-assistant.installing');

    if (document.getElementById('module-install-progress-bar') == null) {
      var progressBar = "<div id='progress-bar-container'><div id='module-install-progress-bar' style='width: 80%; float: left;' class='progress-bar'><div class='progress-label'>" + installingText + "</div></div>";
      var progressMessage = "<div id='module-install-progress-msg' style='width: 80%; clear: both; padding-top: 0.5em; text-align: center;'></div></div>";
      installPage.append(progressBar);
      installPage.append(progressMessage);
    }

    uiHelper.initProgressBar($('#module-install-progress-bar'));
    existingProgressBar = $('#module-install-progress-bar');

    if (document.getElementById('cancel-module-installation-button') == null) {
      var cancelModuleInstallationText = i18n.t("general.cancel");
      var cancelInstallButtonHtml = "<div style='float: left;'><button id='cancel-module-installation-button' class='fg-button ui-corner-all ui-state-default'>" + cancelModuleInstallationText + "</button></div>";
      var progressBarContainer = $('#progress-bar-container');
      progressBarContainer.append(cancelInstallButtonHtml);
      uiHelper.configureButtonStyles('#module-settings-assistant-add-p-3');

      var cancelInstallButton = $('#cancel-module-installation-button');
      cancelInstallButton.bind('click', async () => {
        cancelInstallButton.addClass('ui-state-disabled');
        this._moduleInstallationCancelled = true;
        ipcNsi.cancelInstallation();
      });
    }

    var installSuccessful = true;
    var unlockSuccessful = true;
    
    try {
      var moduleInstalled = false;
      var localModule = await ipcNsi.getLocalModule(moduleCode);
      if (localModule !== undefined && localModule !== null) {
        moduleInstalled = true;
      }

      if (!moduleInstalled) {
        var progressMessageBox = $('#module-install-progress-msg');
        progressMessageBox.empty();
        await ipcNsi.installModule(moduleCode, (progress) => { this.handleModuleInstallProgress(progress); });
      }

      // FIXME
      // Sleep a bit after installation. This is actually a hack to prevent
      // a "white screen error" right after module installation. The exact reason
      // for that error is unclear, but the sleeping prevents it.
      await sleep(100);

      if (swordModule.locked) {
        console.log("Module is locked ... saving unlock key");
        var unlockKey = this._unlockKeys[moduleCode];
        await ipcNsi.saveModuleUnlockKey(moduleCode, unlockKey);
        var moduleReadable = await ipcNsi.isModuleReadable(moduleCode);

        if (!moduleReadable) {
          unlockSuccessful = false;
          const errorMessage = "Locked module is not readable! Wrong unlock key?";
          throw errorMessage;
        }
      }

      // FIXME: Put this in a callback
      if (this._currentModuleType == 'BIBLE') {
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

      existingProgressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + i18n.t("general.done") + '.</div>');
      existingProgressBar.progressbar("value", 100);
      var strongsAvailable = await ipcNsi.strongsAvailable();

      if (this._currentModuleType == 'BIBLE' && swordModule.hasStrongs && !strongsAvailable) {
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

      existingProgressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + errorMessage + '</div>');
    }

    if (swordModule.locked && !unlockSuccessful) {
      console.log(swordModule);
      throw "UnlockError";
    }
  }

  async installStrongsModules(installPage) {

    var existingProgressBar = $('#module-install-progress-bar');
    existingProgressBar.before("<div style='float: left; margin-bottom: 1em;'>" + i18n.t("general.installing-strongs") + " ... </div>");

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
      
      existingProgressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + i18n.t("general.done") + '.</div>');
    } else {
      existingProgressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + i18n.t("general.module-install-failed") + '</div>');
    }
  }

  async listModules() {
    var wizardPage = $('#module-settings-assistant-add-p-2');
    var translationList = wizardPage.find('#module-list');
    translationList.empty();
    var translationInfoContent = i18n.t("module-assistant.click-to-show-detailed-module-info");

    $('#module-info-content').html(translationInfoContent);

    var featureFilter = "";
    featureFilter += "<p><b>" + i18n.t("module-assistant.module-feature-filter") + "</b></p>" +
                     "<p id='module-feature-filter' style='margin-bottom: 1em'>";

    if (this._currentModuleType == 'BIBLE') {
      featureFilter += "<input id='headings-feature-filter' class='module-feature-filter' type='checkbox'></input> <label id='headings-feature-filter-label' for='headings-feature-filter'></label>" +
                       "<input id='strongs-feature-filter' class='module-feature-filter' type='checkbox'></input> <label id='strongs-feature-filter-label' for='strongs-feature-filter'></label>";
    } else if (this._currentModuleType == 'DICT') {
      featureFilter += "<input id='hebrew-strongs-dict-feature-filter' class='module-feature-filter' type='checkbox'></input> <label id='hebrew-strongs-dict-feature-filter-label' for='hebrew-strongs-dict-feature-filter'></label>" +
                       "<input id='greek-strongs-dict-feature-filter' class='module-feature-filter' type='checkbox'></input> <label id='greek-strongs-dict-feature-filter-label' for='greek-strongs-dict-feature-filter'></label>";
    }

    featureFilter += "</p>";
    translationList.append(featureFilter);

    $('#headings-feature-filter-label').text(i18n.t('general.module-headings'));
    $('#strongs-feature-filter-label').text(i18n.t('general.module-strongs'));
    $('#hebrew-strongs-dict-feature-filter-label').text(i18n.t('general.module-hebrew-strongs-dict'));
    $('#greek-strongs-dict-feature-filter-label').text(i18n.t('general.module-greek-strongs-dict'));

    var uiLanguages = [...this._selectedLanguages];
    for (let i = 0; i < uiLanguages.length; i++) {
      const currentLanguageCode = uiLanguages[i];
      const currentLanguageName = i18nHelper.getLanguageName(currentLanguageCode);
      uiLanguages[i] = `<b>${currentLanguageName ? currentLanguageName : currentLanguageCode}</b>`;
    }

    var uiRepositories = this._selectedRepositories.map(rep => `<b>${rep}</b>`);
    var introText = "<p style='clear: both; margin-bottom: 2em;'>" +
                    i18n.t("module-assistant.the-selected-repositories") + " (" +
                    uiRepositories.join(', ') + ") " +
                    i18n.t("module-assistant.contain-the-following-modules") + " (" +
                    uiLanguages.join(', ') + ")" +
                    ":</p>";

    translationList.append(introText);

    var filteredModuleList = "<div id='filtered-module-list'></div>";
    translationList.append(filteredModuleList);

    $('.module-feature-filter').bind('click', async () => {
      this.listFilteredModules(this._selectedLanguages, uiLanguages);      
    });

    await this.listFilteredModules(this._selectedLanguages, uiLanguages);
  }

  async listFilteredModules(selectedLanguages, uiLanguages) {
    var filteredModuleList = $('#filtered-module-list');
    filteredModuleList.empty();

    var headingsFilter = $('#headings-feature-filter').prop('checked');
    var strongsFilter = $('#strongs-feature-filter').prop('checked');

    var hebrewStrongsFilter = $('#hebrew-strongs-dict-feature-filter').prop('checked');
    var greekStrongsFilter = $('#greek-strongs-dict-feature-filter').prop('checked');

    headingsFilter = headingsFilter === undefined ? false : headingsFilter;
    strongsFilter = strongsFilter === undefined ? false : strongsFilter;
    hebrewStrongsFilter = hebrewStrongsFilter === undefined ? false : hebrewStrongsFilter;
    greekStrongsFilter = greekStrongsFilter === undefined ? false : greekStrongsFilter;

    var renderHeader = false;
    if (selectedLanguages.length > 1) {
      renderHeader = true;
    }

    for (var i = 0; i < selectedLanguages.length; i++) {
      var currentLanguage = selectedLanguages[i];
      var currentUiLanguage = uiLanguages[i];
      var currentLangModules = [];

      for (var j = 0; j < this._selectedRepositories.length; j++) {
        var currentRepo = this._selectedRepositories[j];
        var currentRepoLangModules = await ipcNsi.getRepoModulesByLang(currentRepo,
                                                                       currentLanguage,
                                                                       this._currentModuleType,
                                                                       headingsFilter,
                                                                       strongsFilter,
                                                                       hebrewStrongsFilter,
                                                                       greekStrongsFilter);

        // Append this repo's modules to the overall language list
        currentLangModules = currentLangModules.concat(currentRepoLangModules);
      }

      currentLangModules = currentLangModules.sort(this._helper.sortBy('description'));
      await this.listLanguageModules(currentUiLanguage, currentLangModules, renderHeader);
    }

    filteredModuleList.find('.bible-module-info').bind('click', function() {
      var moduleCode = $(this).text();
      $('#module-info-content').empty();
      $('#module-info').find('loading-indicator')[0].show();

      setTimeout(async () => {
        const swordModuleHelper = require('../../helpers/sword_module_helper.js');
        var moduleInfo = await swordModuleHelper.getModuleInfo(moduleCode, true);
        $('#module-info').find('loading-indicator')[0].hide();
        $('#module-info-content').append(moduleInfo);
      }, 200);
    });

    this._helper.bindLabelEvents(filteredModuleList);
    
    filteredModuleList.find('.module-checkbox, .label').bind('mousedown', async (event) => {
      var checkbox = null;

      if (event.target.classList.contains('module-checkbox')) {
        checkbox = $(event.target);
      } else {
        checkbox = $(event.target).closest('.selectable-translation-module').find('.module-checkbox');
      }
      
      var moduleId = checkbox.parent().find('.bible-module-info').text();

      try {
        var swordModule = await ipcNsi.getRepoModule(moduleId);

        if (checkbox.prop('checked') == false) {
          if (swordModule.locked) {
            this.showUnlockDialog(swordModule, checkbox);
          }
        } else {
          if (swordModule.locked) {
            // Checkbox unchecked!
            // Reset the unlock key for this module
            $('#unlock-key-input').val('');
            this._unlockKeys[moduleId] = '';
          }
        }
      } catch (e) {
        console.warn("Got exception while trying to check module unlock status: " + e);
      }
    });
  }

  showUnlockDialog(swordModule, checkbox=undefined) {
    this._unlockDialogOpened = true;
    this._unlockCancelled = false;

    if (swordModule.unlockInfo != "") {
      $('#dialog-unlock-info').html(swordModule.unlockInfo);
    }

    var unlockDialog = $('#module-settings-assistant-unlock-dialog');
    var unlockFailedMsg = $('#unlock-failed-msg');

    if (checkbox === undefined) {
      unlockFailedMsg.show();
    } else {
      unlockFailedMsg.hide();
    }

    var unlockDialogOptions = {
      modal: true,
      title: i18n.t("module-assistant.enter-unlock-key", { moduleId: swordModule.name }),
      dialogClass: 'ezra-dialog',
      width: 450,
      minHeight: 200
    };

    unlockDialogOptions.buttons = {};    
    unlockDialogOptions.buttons[i18n.t("general.cancel")] = (event) => {
      unlockDialog.dialog("close");
      this._unlockDialogOpened = false;
      this._unlockCancelled = true;
    };

    unlockDialogOptions.buttons[i18n.t("general.ok")] = (event) => {
      var unlockKey = $('#unlock-key-input').val().trim();

      if (unlockKey.length > 0) {
        this._unlockKeys[swordModule.name] = unlockKey;

        if (checkbox !== undefined) {
          checkbox.prop('checked', true);
        }

        unlockDialog.dialog("close");
        this._unlockDialogOpened = false;
      }
    };
    
    unlockDialog.dialog(unlockDialogOptions);
    $('#unlock-key-input').focus();
  }

  async listLanguageModules(lang, modules, renderHeader) {
    var wizardPage = $('#module-settings-assistant-add-p-2');
    var translationList = wizardPage.find('#filtered-module-list');

    if (renderHeader) {
      var languageHeader = "<p style='font-weight: bold; margin-top: 2em;'>" + lang + "</p>";
      translationList.append(languageHeader);
    }

    for (var i = 0; i < modules.length; i++) {
      var currentModule = modules[i];
      var checkboxDisabled = "";
      var labelClass = "label";
      var moduleInstalled = await this.isModuleInstalled(currentModule.name);

      if (moduleInstalled) {
        checkboxDisabled = "disabled='disabled' checked";
        labelClass = "disabled-label";
      }

      var moduleTitle = "";
      if (currentModule.locked) {
        var moduleLockInfo = i18n.t("module-assistant.module-lock-info");
        moduleTitle = "title='" + moduleLockInfo + "'";
      }

      var currentModuleElement = "<p class='selectable-translation-module'>";
      currentModuleElement += "<input class='module-checkbox' type='checkbox' "+ checkboxDisabled + ">";
      
      currentModuleElement += "<span " + moduleTitle + " class='" + labelClass + "' id='" + currentModule.name + "'>";
      currentModuleElement += currentModule.description;
      currentModuleElement += "</span>&nbsp;&nbsp;";

      currentModuleElement += "[<span class='bible-module-info'>" + currentModule.name + "</span>]";

      if (currentModule.locked) {
        var lockedIcon = "<img style='margin-left: 0.5em; margin-bottom: -0.4em;' src='images/lock.png' width='20' height='20'/>";
        currentModuleElement += lockedIcon;
      }

      currentModuleElement += "</p>";

      translationList.append(currentModuleElement);
    }
  }

}

module.exports = InstallModuleAssistant;

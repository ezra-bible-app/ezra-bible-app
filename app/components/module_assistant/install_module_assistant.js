/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const LanguageMapper = require('../../helpers/language_mapper.js');
const ModuleAssistantHelper = require('./module_assistant_helper.js');

/**
 * The InstallModuleAssistant component implements the dialog that handles module installations.
 * 
 * @category Component
 */
class InstallModuleAssistant {
  constructor() {
    this._helper = new ModuleAssistantHelper();
    this.languageMapper = new LanguageMapper();
    this._addModuleAssistantOriginalContent = undefined;

    var addButton = $('#add-modules-button');
    addButton.bind('click', () => this.openAddModuleAssistant());
  }

  init(moduleType) {
    this._installedModules = null;
    this._moduleInstallStatus = 'DONE';
    this._translationRemovalStatus = 'DONE';
    this._unlockKeys = {};
    this._unlockDialogOpened = false;
    this._unlockCancelled = false;
    this._currentModuleType = moduleType;
    this._moduleInstallationCancelled = false;
  }

  isModuleInstalled(moduleCode) {
    if (this._installedModules == null) {
      this._installedModules = app_controller.translation_controller.getInstalledModules(this._currentModuleType);
    }

    for (var i = 0; i < this._installedModules.length; i++) {
      if (this._installedModules[i] == moduleCode) {
        return true;
      }
    }

    return false;
  }

  openAssistant(moduleType) {
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

    var modules = app_controller.translation_controller.getInstalledModules(moduleType);

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
      minHeight: 250
    });

    this._helper.unlockDialog();
  }

  async updateRepositoryConfig(force=false) {
    var wizardPage = $('#module-settings-assistant-add-p-0');
    wizardPage.empty();

    var lastSwordRepoUpdateSaved = app_controller.settings.has("lastSwordRepoUpdate");
    var listRepoTimeoutMs = 800;

    if (!nsi.repositoryConfigExisting() || !lastSwordRepoUpdateSaved || force) {
      wizardPage.append('<p>' + i18n.t('module-assistant.updating-repository-data') + '</p>');

      var loadingText = i18n.t('module-assistant.updating');
      var progressBar = "<div id='repo-update-progress-bar' class='progress-bar'><div class='progress-label'>" + loadingText + "</div></div>";
      wizardPage.append(progressBar);

      uiHelper.initProgressBar($('#repo-update-progress-bar'));

      try {
        await nsi.updateRepositoryConfig((progress) => {
          var progressbar = $('#repo-update-progress-bar');
          var progressPercent = progress.totalPercent;
          progressbar.progressbar("value", progressPercent);
        });

        app_controller.settings.set("lastSwordRepoUpdate", new Date());
      } catch(e) {
        listRepoTimeoutMs = 3000;
        wizardPage.append('<p>' + i18n.t('module-assistant.update-repository-data-failed') + '</p>');
      }
    }

    wizardPage.append('<p>' + i18n.t("module-assistant.loading-repositories") + '</p>');
    setTimeout(() => this.listRepositories(), listRepoTimeoutMs);
  }

  async openAddModuleAssistant() {
    $('#module-settings-assistant-init').hide();
    this.initAddModuleAssistant();
    $('#module-settings-assistant-add').show();

    await this.updateRepositoryConfig();
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
      onStepChanged: (event, currentIndex, priorIndex) => this.addModuleAssistantStepChanged(event, currentIndex, priorIndex),
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
    if (currentIndex == 0 && newIndex == 1) { // Changing from Repositories (1) to Languages (2)
      var wizardPage = "#module-settings-assistant-add-p-0";
      var selectedRepositories = this._helper.getSelectedSettingsAssistantElements(wizardPage);
      return (selectedRepositories.length > 0);
    } else if (currentIndex == 1 && newIndex == 2) { // Changing from Languages (2) to Modules (3)
      var wizardPage = "#module-settings-assistant-add-p-1";
      var selectedLanguages = this._helper.getSelectedSettingsAssistantElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 2 && newIndex == 3) { // Changing from Modules (3) to Installation (4)
      var wizardPage = "#module-settings-assistant-add-p-2";
      var selectedModules = this._helper.getSelectedSettingsAssistantElements(wizardPage);
      return (selectedModules.length > 0);
    } else if (currentIndex == 3 && newIndex != 3) {
      return false;
    }

    return true;
  }

  addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0 && currentIndex == 1) {

      this.initLanguagesPage();

    } else if (priorIndex == 1 && currentIndex == 2) {

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
    this._installedModules = app_controller.translation_controller.getInstalledModules();

    if (this._currentModuleType == 'BIBLE') {
      app_controller.translation_controller.initTranslationsMenu();
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }
  }

  // This is only for testing!!
  resetInstalledModules() {
    this._installedModules = [];
  }

  initLanguagesPage() {
    // Repositories have been selected
    var wizardPage = "#module-settings-assistant-add-p-0";
    this._selectedRepositories = this._helper.getSelectedSettingsAssistantElements(wizardPage);
    app_controller.settings.set('selected_repositories', this._selectedRepositories);

    var languagesPage = $('#module-settings-assistant-add-p-1');
    languagesPage.empty();
    languagesPage.append("<p>" + i18n.t("module-assistant.loading-languages") + "</p>");

    this.previouslySelectedLanguages = app_controller.settings.get('selected_languages');

    setTimeout(() => this.listLanguages(this._selectedRepositories), 400);
  }

  initModulesPage() {
    // Languages have been selected
    var wizardPage = "#module-settings-assistant-add-p-1";
    var languages = this._helper.getSelectedSettingsAssistantElements(wizardPage);
    var languageCodes = [];

    for (var i = 0; i < languages.length; i++) {
      var currentCode = languages[i];
      languageCodes.push(currentCode);
    }

    app_controller.settings.set('selected_languages', languages);
    this.listModules(languageCodes);
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
      var swordModule = nsi.getRepoModule(currentModule);
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
    var swordModule = nsi.getRepoModule(moduleCode);

    var existingProgressBar = $('#module-install-progress-bar');
    var installingModuleText = "<div style='float: left; margin-bottom: 1em;'>" + i18n.t("module-assistant.installing") + " <i>" + swordModule.description + "</i> ... </div>";

    if (existingProgressBar.length == 0) {
      installPage.append(installingModuleText);
    } else {
      existingProgressBar.before(installingModuleText);
    }

    var installingText = i18n.t('module-assistant.installing');

    if (document.getElementById('module-install-progress-bar') == null) {
      var progressBar = "<div id='progress-bar-container'><div id='module-install-progress-bar' style='width: 85%; float: left;' class='progress-bar'><div class='progress-label'>" + installingText + "</div></div>";
      var progressMessage = "<div id='module-install-progress-msg' style='width: 85%; clear: both; padding-top: 0.5em; text-align: center;'></div></div>";
      installPage.append(progressBar);
      installPage.append(progressMessage);
    }

    uiHelper.initProgressBar($('#module-install-progress-bar'));
    var existingProgressBar = $('#module-install-progress-bar');

    if (document.getElementById('cancel-module-installation-button') == null) {
      var cancelModuleInstallationText = i18n.t("general.cancel");
      var cancelInstallButtonHtml = "<div style='float: left;'><button id='cancel-module-installation-button' class='fg-button ui-corner-all ui-state-default'>" + cancelModuleInstallationText + "</button></div>";
      var progressBarContainer = $('#progress-bar-container');
      progressBarContainer.append(cancelInstallButtonHtml);
      uiHelper.configureButtonStyles('#module-settings-assistant-add-p-3');

      var cancelInstallButton = $('#cancel-module-installation-button');
      cancelInstallButton.bind('click', () => {
        cancelInstallButton.addClass('ui-state-disabled');
        this._moduleInstallationCancelled = true;
        nsi.cancelInstallation();
      });
    }

    var installSuccessful = true;
    var unlockSuccessful = true;
    
    try {
      var moduleInstalled = false;
      try {
        nsi.getLocalModule(moduleCode);
        moduleInstalled = true;
      } catch (e) {
        moduleInstalled = false;
      }

      if (!moduleInstalled) {
        var progressMessageBox = $('#module-install-progress-msg');
        progressMessageBox.empty();
        await nsi.installModule(moduleCode, (progress) => { this.handleModuleInstallProgress(progress); });
      }

      // Sleep a bit after installation. This is actually a hack to prevent
      // a "white screen error" right after module installation. The exact reason
      // for that error is unclear, but the sleeping prevents it.
      await sleep(100);

      if (swordModule.locked) {
        console.log("Module is locked ... saving unlock key");
        var unlockKey = this._unlockKeys[moduleCode];
        nsi.saveModuleUnlockKey(moduleCode, unlockKey);

        if (!nsi.isModuleReadable(moduleCode)) {
          unlockSuccessful = false;
          var errorMessage = "Locked module is not readable! Wrong unlock key?";
          throw errorMessage;
        }
      }

      // FIXME: Put this in a callback
      if (this._currentModuleType == 'BIBLE') {
        app_controller.updateUiAfterBibleTranslationAvailable(moduleCode);
      }
    } catch (e) {
      console.log("Error during installation: " + e);
      installSuccessful = false;
    }

    if (installSuccessful) {
      existingProgressBar.before('<div style="margin-bottom: 1em;">&nbsp;' + i18n.t("general.done") + '.</div>');

      if (this._currentModuleType == 'BIBLE' && swordModule.hasStrongs && !nsi.strongsAvailable()) {
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
      throw "UnlockError";
    }
  }

  async installStrongsModules(installPage) {

    var existingProgressBar = $('#module-install-progress-bar');
    existingProgressBar.before("<div style='float: left; margin-bottom: 1em;'>" + i18n.t("general.installing-strongs") + " ... </div>");

    var strongsInstallSuccessful = true;

    try {
      if (!nsi.hebrewStrongsAvailable()) {
        await nsi.installModule("StrongsHebrew", (progress) => { this.handleModuleInstallProgress(progress); });
      }

      if (!nsi.greekStrongsAvailable()) {
        await nsi.installModule("StrongsGreek", (progress) => { this.handleModuleInstallProgress(progress); });
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

  getAvailableLanguagesFromSelectedRepos(selectedRepositories) {
    var knownLanguageCodes = [];
    var unknownLanguageCodes = [];
    var knownLanguages = [];
    var unknownLanguages = [];

    for (var i = 0;  i < selectedRepositories.length; i++) {
      var currentRepo = selectedRepositories[i];
      var repoLanguages = nsi.getRepoLanguages(currentRepo, this._currentModuleType);

      for (var j = 0; j < repoLanguages.length; j++) {
        var currentLanguageCode = repoLanguages[j];

        if (this.languageMapper.mappingExists(currentLanguageCode)) {
          if (!knownLanguageCodes.includes(currentLanguageCode)) {
            var currentLanguageName = this.languageMapper.getLanguageName(currentLanguageCode);
            knownLanguageCodes.push(currentLanguageCode);
            knownLanguages.push({
              "languageCode": currentLanguageCode,
              "languageName": currentLanguageName
            });
          }
        } else {
          console.log("Unknown lang: " + currentLanguageCode);
          if (!unknownLanguageCodes.includes(currentLanguageCode)) {
            unknownLanguageCodes.push(currentLanguageCode);
            unknownLanguages.push({
              "languageCode": currentLanguageCode,
              "languageName": currentLanguageCode
            });
          }
        }
      }
    }

    knownLanguages = knownLanguages.sort(this.sortBy('languageName'));
    unknownLanguages = unknownLanguages.sort(this.sortBy('languageCode'));

    return [ knownLanguages, unknownLanguages ];
  }

  listLanguages(selectedRepositories) {
    var wizardPage = $('#module-settings-assistant-add-p-1');
    wizardPage.empty();

    var uiRepositories = this.getSelectedReposForUi();
    var introText = "<p style='margin-bottom: 2em;'>" +
                    i18n.t("module-assistant.pick-languages-from-repos") +
                    uiRepositories.join(', ') +
                    ".</p>";

    wizardPage.append(introText);

    var availableLanguages = this.getAvailableLanguagesFromSelectedRepos(selectedRepositories);
    var knownLanguages = availableLanguages[0];
    var unknownLanguages = availableLanguages[1];

    this.listLanguageArray(knownLanguages);

    var otherLanguagesHeader = "<p style='padding-top: 2em; clear: both; font-weight: bold;'>Other languages</p>";

    if (unknownLanguages.length > 0) {
      wizardPage.append(otherLanguagesHeader);
      this.listLanguageArray(unknownLanguages);
    }

    this._helper.bindLabelEvents(wizardPage);
  }

  listLanguageArray(languageArray) {
    var wizardPage = $('#module-settings-assistant-add-p-1');

    for (var i = 0; i < languageArray.length; i++) {
      var currentLanguage = languageArray[i];
      var currentLanguageCode = currentLanguage.languageCode;
      var currentLanguageName = currentLanguage.languageName;

      var checkboxChecked = "";
      if (this.hasLanguageBeenSelectedBefore(currentLanguageCode)) {
        checkboxChecked = " checked";
      }

      var currentLanguageTranslationCount = this.getLanguageModuleCount(currentLanguageCode);
      var currentLanguage = "<p style='float: left; width: 17em;'><input type='checkbox'" + checkboxChecked + "><span class='label' id='" + currentLanguageCode + "'>";
      currentLanguage += currentLanguageName + ' (' + currentLanguageTranslationCount + ')';
      currentLanguage += "</span></p>";

      wizardPage.append(currentLanguage);
    }
  }

  getSelectedReposForUi() {
    var uiRepositories = []
    for (var i = 0; i < this._selectedRepositories.length; i++) {
      var currentRepo = "<b>" + this._selectedRepositories[i] + "</b>";
      uiRepositories.push(currentRepo);
    }

    return uiRepositories;
  }

  listModules(selectedLanguages) {
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

    var languagesPage = "#module-settings-assistant-add-p-1";
    var uiLanguages = this._helper.getSelectedSettingsAssistantElements(languagesPage);
    for (var i = 0; i < uiLanguages.length; i++) {
      var currentLanguageName = uiLanguages[i];
      if (this.languageMapper.mappingExists(currentLanguageName)) {
        currentLanguageName = this.languageMapper.getLanguageName(currentLanguageName);
      }
      uiLanguages[i] = "<b>" + currentLanguageName + "</b>";
    }

    var uiRepositories = this.getSelectedReposForUi();
    var introText = "<p style='margin-bottom: 2em;'>" +
                    i18n.t("module-assistant.the-selected-repositories") + " (" +
                    uiRepositories.join(', ') + ") " +
                    i18n.t("module-assistant.contain-the-following-modules") + " (" +
                    uiLanguages.join(', ') + ")" +
                    ":</p>";

    translationList.append(introText);

    var filteredModuleList = "<div id='filtered-module-list'></div>";
    translationList.append(filteredModuleList);

    $('.module-feature-filter').bind('click', async () => {
      this.listFilteredModules(selectedLanguages, uiLanguages);      
    });

    this.listFilteredModules(selectedLanguages, uiLanguages);
  }

  listFilteredModules(selectedLanguages, uiLanguages) {
    var filteredModuleList = $('#filtered-module-list');
    filteredModuleList.empty();

    var headingsFilter = $('#headings-feature-filter').prop('checked');
    var strongsFilter = $('#strongs-feature-filter').prop('checked');
    var hebrewStrongsFilter = $('#hebrew-strongs-dict-feature-filter').prop('checked');
    var greekStrongsFilter = $('#greek-strongs-dict-feature-filter').prop('checked');

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
        var currentRepoLangModules = nsi.getRepoModulesByLang(currentRepo,
                                                              currentLanguage,
                                                              this._currentModuleType,
                                                              headingsFilter,
                                                              strongsFilter,
                                                              hebrewStrongsFilter,
                                                              greekStrongsFilter);

        // Append this repo's modules to the overall language list
        currentLangModules = currentLangModules.concat(currentRepoLangModules);
      }

      currentLangModules = currentLangModules.sort(this.sortBy('description'));
      this.listLanguageModules(currentUiLanguage, currentLangModules, renderHeader);
    }

    filteredModuleList.find('.bible-module-info').bind('click', function() {
      var moduleCode = $(this).text();
      $('#module-info-content').empty();
      $('#module-info').find('.loader').show();

      setTimeout(() => {
        var moduleInfo = app_controller.translation_controller.getModuleInfo(moduleCode, true);
        $('#module-info').find('.loader').hide();
        $('#module-info-content').append(moduleInfo);
      }, 200);
    });

    this._helper.bindLabelEvents(filteredModuleList);
    
    filteredModuleList.find('.module-checkbox, .label').bind('mousedown', (event) => {
      var checkbox = null;

      if (event.target.classList.contains('module-checkbox')) {
        checkbox = $(event.target);
      } else {
        checkbox = $(event.target).closest('.selectable-translation-module').find('.module-checkbox');
      }
      
      var moduleId = checkbox.parent().find('.bible-module-info').text();

      try {
        var swordModule = nsi.getRepoModule(moduleId);

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

  sortBy(field) {
    return function(a, b) {
      if (a[field] < b[field]) {
        return -1;
      } else if (a[field] > b[field]) {
        return 1;
      }
      return 0;
    };
  }

  listLanguageModules(lang, modules, renderHeader) {
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

      if (this.isModuleInstalled(currentModule.name) == true) {
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
      currentModuleElement += "</span>&nbsp;";

      currentModuleElement += "[<span class='bible-module-info'>" + currentModule.name + "</span>]";

      if (currentModule.locked) {
        var lockedIcon = "<img style='margin-left: 0.5em; margin-bottom: -0.4em;' src='images/lock.png' width='20' height='20'/>";
        currentModuleElement += lockedIcon;
      }

      currentModuleElement += "</p>";

      translationList.append(currentModuleElement);
    }
  }

  getLanguageModuleCount(language) {
    var count = 0;

    for (var i = 0; i < this._selectedRepositories.length; i++) {
      var currentRepo = this._selectedRepositories[i];
      count += nsi.getRepoLanguageModuleCount(currentRepo, language, this._currentModuleType);
    }

    return count;
  }

  hasRepoBeenSelectedBefore(repo) {
    var hasBeenSelected = false;

    if (this.previouslySelectedRepositories != null) {
      var selectedRepositories = this.previouslySelectedRepositories;

      for (var i = 0; i < selectedRepositories.length; i++) {
        var currentRepo = selectedRepositories[i];
        if (currentRepo == repo) {
          hasBeenSelected = true;
          break;
        }
      }
    }

    return hasBeenSelected;
  }

  hasLanguageBeenSelectedBefore(language) {
    var hasBeenSelected = false;

    if (this.previouslySelectedLanguages != null) {
      var selectedLanguages = this.previouslySelectedLanguages;

      for (var i = 0; i < selectedLanguages.length; i++) {
        var currentLang = selectedLanguages[i];
        if (currentLang == language) {
          hasBeenSelected = true;
          break;
        }
      }
    }

    return hasBeenSelected;
  }

  listRepositories() {
    this.previouslySelectedRepositories = app_controller.settings.get('selected_repositories');
    var wizardPage = $('#module-settings-assistant-add-p-0');

    var repositories = nsi.getRepoNames();
    wizardPage.empty();

    var introText = "<p style='margin-bottom: 2em;'>" +
                    i18n.t("module-assistant.repo-selection-info-text", {module_type: this._moduleTypeText}) +
                    "</p>";

    wizardPage.append(introText);

    for (var i = 0; i < repositories.length; i++) {
      var currentRepoTranslationCount = this.getRepoModuleCount(repositories[i]);

      if (currentRepoTranslationCount > 0) {
        var checkboxChecked = "";
        if (this.hasRepoBeenSelectedBefore(repositories[i])) {
          checkboxChecked = " checked";
        }

        var currentRepo = "<p style='float: left; width: 17em;'><input type='checkbox'" + checkboxChecked + "><span class='label' id='" + repositories[i] + "'>";
        currentRepo += repositories[i] + ' (' + currentRepoTranslationCount + ')';
        currentRepo += "</span></p>";
        wizardPage.append(currentRepo);
      }
    }

    var lastUpdate = app_controller.settings.get("lastSwordRepoUpdate");
    if (lastUpdate !== undefined) {
      lastUpdate = new Date(Date.parse(lastUpdate)).toLocaleDateString(i18n.language);
    }

    var lastUpdateInfo = "<p style='clear: both; padding-top: 1em;'>" +
                         i18n.t("module-assistant.repo-data-last-updated", { date: lastUpdate }) + " " +
                         "<button id='update-repo-data' class='fg-button ui-state-default ui-corner-all'>" +
                         i18n.t("module-assistant.update-now") +
                         "</button>" +
                         "</p>";

    wizardPage.append(lastUpdateInfo);

    $('#update-repo-data').bind('click', async () => {
      await this.updateRepositoryConfig(true);
    });

    uiHelper.configureButtonStyles('#module-settings-assistant-add-p-0');

    var additionalInfo = "<p style='margin-top: 2em;'>" +
                         i18n.t("module-assistant.more-repo-information-needed") +
                         "</p>";

    wizardPage.append(additionalInfo);
    this._helper.bindLabelEvents(wizardPage);
  }

  getRepoModuleCount(repo) {
    var count = 0;
    var allRepoModules = nsi.getAllRepoModules(repo, this._currentModuleType);

    for (var i = 0; i < allRepoModules.length; i++) {
      var module = allRepoModules[i];

      if (this.languageMapper.mappingExists(module.language)) {
        count += 1;
      }
    }

    return count;
  }
}

module.exports = InstallModuleAssistant;

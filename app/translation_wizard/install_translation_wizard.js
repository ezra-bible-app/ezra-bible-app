/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class InstallTranslationWizard {
  constructor() {
    this._helper = new TranslationWizardHelper();
    this.languageMapper = new LanguageMapper();
    this._addTranslationWizardOriginalContent = undefined;

    var addButton = $('#add-bible-translations-button');
    addButton.bind('click', () => this.openAddTranslationWizard());
  }

  init() {
    this._installedTranslations = null;
    this._translationInstallStatus = 'DONE';
    this._translationRemovalStatus = 'DONE';
    this._unlockKeys = {};
    this._unlockDialogOpened = false;
    this._unlockCancelled = false;
  }

  isTranslationInstalled(translationCode) {
    if (this._installedTranslations == null) {
      this._installedTranslations = bible_browser_controller.translation_controller.getTranslations();
    }

    for (var i = 0; i < this._installedTranslations.length; i++) {
      if (this._installedTranslations[i] == translationCode) {
        return true;
      }
    }

    return false;
  }

  openWizard() {
    this.init();

    var wizardWidth = 1100;
    var appContainerWidth = $(window).width() - 10;
    var offsetLeft = appContainerWidth - wizardWidth - 100;
    var offsetTop = 20;

    $('#translation-settings-wizard-add').hide();
    $('#translation-settings-wizard-remove').hide();
    $('#translation-settings-wizard-init').show();

    var translations = bible_browser_controller.translation_controller.getTranslations();

    $('#add-bible-translations-button').removeClass('ui-state-disabled');

    if (translations.length > 0) {
      $('#remove-bible-translations-button').removeClass('ui-state-disabled');
    } else {
      $('#remove-bible-translations-button').addClass('ui-state-disabled');
    }

    configure_button_styles('#translation-settings-wizard-init');

    $('#translation-settings-wizard').dialog({
      position: [offsetLeft, offsetTop],
      modal: true,
      title: i18n.t("translation-wizard.header"),
      dialogClass: 'ezra-dialog translation-wizard-dialog',
      width: wizardWidth,
      minHeight: 250
    });

    this._helper.unlockDialog();
  }

  initProgressBar(progressBarId) {
    var progressbar = $(progressBarId);
    var progressLabel = progressbar.find(".progress-label");

    progressbar.progressbar({
      value: false,
      change: function() {
        progressLabel.text( progressbar.progressbar( "value" ) + "%" );
      },
      complete: function() {
        progressLabel.text(i18n.t('general.completed'));
      }
    });
  }

  async updateRepositoryConfig(force=false) {
    var wizardPage = $('#translation-settings-wizard-add-p-0');
    wizardPage.empty();

    var lastSwordRepoUpdateSaved = bible_browser_controller.settings.has("lastSwordRepoUpdate");
    var listRepoTimeoutMs = 800;

    if (!nsi.repositoryConfigExisting() || !lastSwordRepoUpdateSaved || force) {
      wizardPage.append('<p>' + i18n.t('translation-wizard.updating-repository-data') + '</p>');

      var loadingText = i18n.t('translation-wizard.updating');
      var progressBar = "<div id='repo-update-progress-bar' class='progress-bar'><div class='progress-label'>" + loadingText + "</div></div>";
      wizardPage.append(progressBar);
      this.initProgressBar('#repo-update-progress-bar');

      try {
        await nsi.updateRepositoryConfig((progress) => {
          var progressbar = $('#repo-update-progress-bar');
          var progressPercent = progress.totalPercent;
          progressbar.progressbar("value", progressPercent);
        });

        bible_browser_controller.settings.set("lastSwordRepoUpdate", new Date());
      } catch(e) {
        listRepoTimeoutMs = 3000;
        wizardPage.append('<p>' + i18n.t('translation-wizard.update-repository-data-failed') + '</p>');
      }
    }

    wizardPage.append('<p>' + i18n.t("translation-wizard.loading-repositories") + '</p>');
    setTimeout(() => this.listRepositories(), listRepoTimeoutMs);
  }

  async openAddTranslationWizard() {
    $('#translation-settings-wizard-init').hide();
    this.initAddTranslationWizard();
    $('#translation-settings-wizard-add').show();

    await this.updateRepositoryConfig();
  }

  initAddTranslationWizard() {
    if (this._addTranslationWizardOriginalContent != undefined) {
        $('#translation-settings-wizard-add').steps("destroy");
        $('#translation-settings-wizard-add').html(this._addTranslationWizardOriginalContent);
    } else {
        this._addTranslationWizardOriginalContent = $('#translation-settings-wizard-add').html();
    }

    $('#translation-settings-wizard-add').steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "translation-settings-wizard-add",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this.addTranslationWizardStepChanging(event, currentIndex, newIndex),
      onStepChanged: (event, currentIndex, priorIndex) => this.addTranslationWizardStepChanged(event, currentIndex, priorIndex),
      onFinishing: (event, currentIndex) => this.addTranslationWizardFinishing(event, currentIndex),
      onFinished: (event, currentIndex) => this.addTranslationWizardFinished(event, currentIndex),
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });
  }

  addTranslationWizardStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == 0 && newIndex == 1) { // Changing from Repositories (1) to Languages (2)
      var wizardPage = "#translation-settings-wizard-add-p-0";
      var selectedRepositories = this._helper.getSelectedSettingsWizardElements(wizardPage);
      return (selectedRepositories.length > 0);
    } else if (currentIndex == 1 && newIndex == 2) { // Changing from Languages (2) to Translations (3)
      var wizardPage = "#translation-settings-wizard-add-p-1";
      var selectedLanguages = this._helper.getSelectedSettingsWizardElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 2 && newIndex == 3) { // Changing from Translations (3) to Installation (4)
      var wizardPage = "#translation-settings-wizard-add-p-2";
      var selectedTranslations = this._helper.getSelectedSettingsWizardElements(wizardPage);
      return (selectedTranslations.length > 0);
    } else if (currentIndex == 3 && newIndex != 3) {
      return false;
    }

    return true;
  }

  addTranslationWizardStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0 && currentIndex == 1) {

      this.initLanguagesPage();

    } else if (priorIndex == 1 && currentIndex == 2) {

      this.initModulesPage();

    } else if (currentIndex == 3) {

      this.installSelectedTranslations();
    }
  }

  addTranslationWizardFinishing(event, currentIndex) {
    return this._translationInstallStatus != 'IN_PROGRESS';
  }

  async addTranslationWizardFinished(event, currentIndex) {
    $('#translation-settings-wizard').dialog('close');
    this._installedTranslations = bible_browser_controller.translation_controller.getTranslations();
    bible_browser_controller.translation_controller.initTranslationsMenu();
    await tags_controller.updateTagUiBasedOnTagAvailability();
  }

  initLanguagesPage() {
    // Repositories have been selected
    var wizardPage = "#translation-settings-wizard-add-p-0";
    this._selectedRepositories = this._helper.getSelectedSettingsWizardElements(wizardPage);
    bible_browser_controller.settings.set('selected_repositories', this._selectedRepositories);

    var languagesPage = $('#translation-settings-wizard-add-p-1');
    languagesPage.empty();
    languagesPage.append("<p>" + i18n.t("translation-wizard.loading-languages") + "</p>");

    setTimeout(() => this.listLanguages(this._selectedRepositories), 400);
  }

  initModulesPage() {
    // Languages have been selected
    var wizardPage = "#translation-settings-wizard-add-p-1";
    var languages = this._helper.getSelectedSettingsWizardElements(wizardPage);
    var languageCodes = [];

    for (var i = 0; i < languages.length; i++) {
      var currentCode = languages[i];
      languageCodes.push(currentCode);
    }

    bible_browser_controller.settings.set('selected_languages', languages);
    this.listModules(languageCodes);
  }

  async installSelectedTranslations() {
    // Bible translations have been selected

    this._helper.lockDialogForAction('translation-settings-wizard-add');

    var translationsPage = "#translation-settings-wizard-add-p-2";
    var translations = this._helper.getSelectedSettingsWizardElements(translationsPage);

    this._translationInstallStatus = 'IN_PROGRESS';

    var installPage = $("#translation-settings-wizard-add-p-3");
    installPage.empty();
    installPage.append('<h3>' + i18n.t("translation-wizard.installing-translations") + '</h3>');
    installPage.append('<p>' + i18n.t("translation-wizard.it-takes-time-to-install-translation") + '</p>');

    for (var i = 0; i < translations.length; i++) {
      var currentTranslation = translations[i];
      var swordModule = nsi.getRepoModule(currentTranslation);
      var unlockFailed = true;

      while (unlockFailed) {
        try {
          await this.installTranslation(installPage, currentTranslation);
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

    this._translationInstallStatus = 'DONE';
    this._helper.unlockDialog('translation-settings-wizard-add');
  }

  async installTranslation(installPage, translationCode) {
    var swordModule = nsi.getRepoModule(translationCode);

    var existingProgressBar = $('#module-install-progress-bar');
    var installingModuleText = "<div style='float: left;'>" + i18n.t("translation-wizard.installing") + " <i>" + swordModule.description + "</i> ... </div>";

    if (existingProgressBar.length == 0) {
      installPage.append(installingModuleText);
    } else {
      existingProgressBar.before("<br/>");
      existingProgressBar.before(installingModuleText);
    }

    var installingText = i18n.t('translation-wizard.installing');

    if (document.getElementById('module-install-progress-bar') == null) {
      var progressBar = "<div id='module-install-progress-bar' class='progress-bar'><div class='progress-label'>" + installingText + "</div></div>";
      var progressMessage = "<div id='module-install-progress-msg' style='margin-top: 1em; text-align: center;'></div>";
      installPage.append(progressBar);
      installPage.append(progressMessage);
    }

    this.initProgressBar('#module-install-progress-bar');
    var existingProgressBar = $('#module-install-progress-bar');
    //await sleep(100);

    var installSuccessful = true;
    var unlockSuccessful = true;
    
    try {
      var moduleInstalled = false;
      try {
        nsi.getLocalModule(translationCode);
        moduleInstalled = true;
      } catch (e) {
        moduleInstalled = false;
      }

      if (!moduleInstalled) {
        //console.log("Module " + translationCode + " not installed. Installing it ...");

        var progressbar = $('#module-install-progress-bar');
        var progressMessageBox = $('#module-install-progress-msg');
        progressMessageBox.empty();

        await nsi.installModule(translationCode, (progress) => {
          var progressPercent = progress.totalPercent;
          var progressMessage = progress.message;

          progressbar.progressbar("value", progressPercent);

          if (progressMessage != '') {
            progressMessageBox.text(progressMessage);
          }
          
          if (progressPercent == 100) {
            progressMessageBox.empty();
          }
        });
      }

      // Sleep a bit after installation. This is actually a hack to prevent
      // a "white screen error" right after module installation. The exact reason
      // for that error is unclear, but the sleeping prevents it.
      await sleep(100);

      if (swordModule.locked) {
        console.log("Module is locked ... saving unlock key");
        var unlockKey = this._unlockKeys[translationCode];
        nsi.saveModuleUnlockKey(translationCode, unlockKey);

        if (!nsi.isModuleReadable(translationCode)) {
          unlockSuccessful = false;
          var errorMessage = "Locked module is not readable! Wrong unlock key?";
          throw errorMessage;
        }
      }

      // FIXME: Put this in a callback
      bible_browser_controller.updateUiAfterBibleTranslationAvailable(translationCode);
    } catch (e) {
      console.log(e);
      installSuccessful = false;
    }

    /*$('#bibleTranslationInstallIndicator').hide();
    $('#bibleTranslationInstallIndicator').remove();*/

    if (installSuccessful) {
      existingProgressBar.before('<div>&nbsp;' + i18n.t("general.done") + '.</div>');

      if (swordModule.hasStrongs && !nsi.strongsAvailable()) {
        await this.installStrongsModules(installPage);
      }
    } else {
      var errorMessage = "";

      if (!unlockSuccessful) {
        errorMessage = i18n.t("general.module-unlock-failed");
      } else {
        errorMessage = i18n.t("general.module-install-failed");
      }

      existingProgressBar.before('<div>&nbsp;' + errorMessage + '</div>');
      //installPage.append('<br/>');
    }

    if (swordModule.locked && !unlockSuccessful) {
      throw "UnlockError";
    }
  }

  async installStrongsModules(installPage) {
    installPage.append("<div style='float: left;'>" + i18n.t("general.installing-strongs") + " ... </div>");

    var loader = "<div id='bibleTranslationInstallIndicator' class='loader'>" + 
                "<div class='bounce1'></div>" +
                "<div class='bounce2'></div>" +
                "<div class='bounce3'></div>" +
                "</div>";

    installPage.append(loader);
    $('#bibleTranslationInstallIndicator').show();

    var strongsInstallSuccessful = true;

    try {
      if (!nsi.hebrewStrongsAvailable()) {
        await nsi.installModule("StrongsHebrew");
      }

      if (!nsi.greekStrongsAvailable()) {
        await nsi.installModule("StrongsGreek");
      }
    } catch (e) {
      strongsInstallSuccessful = false;
    }

    $('#bibleTranslationInstallIndicator').hide();
    $('#bibleTranslationInstallIndicator').remove();

    if (strongsInstallSuccessful) {
      bible_browser_controller.strongs.runAvailabilityCheck();
      
      installPage.append('<div>&nbsp;' + i18n.t("general.done") + '.</div>');
      installPage.append('<br/>');
    } else {
      installPage.append('<div>&nbsp;' + i18n.t("general.module-install-failed") + '</div>');
      installPage.append('<br/>');
    }
  }

  getAvailableLanguagesFromSelectedRepos(selectedRepositories) {
    var knownLanguageCodes = [];
    var unknownLanguageCodes = [];
    var knownLanguages = [];
    var unknownLanguages = [];

    for (var i = 0;  i < selectedRepositories.length; i++) {
      var currentRepo = selectedRepositories[i];
      var repoLanguages = nsi.getRepoLanguages(currentRepo);

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
    var wizardPage = $('#translation-settings-wizard-add-p-1');
    wizardPage.empty();

    var uiRepositories = this.getSelectedReposForUi();
    var introText = "<p style='margin-bottom: 2em;'>" +
                    i18n.t("translation-wizard.pick-languages-from-repos") +
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
    var wizardPage = $('#translation-settings-wizard-add-p-1');

    for (var i = 0; i < languageArray.length; i++) {
      var currentLanguage = languageArray[i];
      var currentLanguageCode = currentLanguage.languageCode;
      var currentLanguageName = currentLanguage.languageName;

      var checkboxChecked = "";
      if (this.hasLanguageBeenSelectedBefore(currentLanguageCode)) {
        checkboxChecked = " checked";
      }

      var currentLanguageTranslationCount = this.getLanguageTranslationCount(currentLanguageCode);
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
    var wizardPage = $('#translation-settings-wizard-add-p-2');
    var translationList = wizardPage.find('#translation-list');
    translationList.empty();
    var translationInfoContent = i18n.t("translation-wizard.click-to-show-detailed-module-info");

    $('#translation-info-content').html(translationInfoContent);

    var featureFilter = "";
    featureFilter += "<p><b>" + i18n.t("translation-wizard.translation-feature-filter") + "</b></p>" +
                     "<p id='translation-feature-filter' style='margin-bottom: 1em'>" +
                     "<input id='headings-feature-filter' class='translation-feature-filter' type='checkbox'></input> <label id='headings-feature-filter-label' for='headings-feature-filter'></label>" +
                     "<input id='strongs-feature-filter' class='translation-feature-filter' type='checkbox'></input> <label id='strongs-feature-filter-label' for='strongs-feature-filter'></label>" +
                     "</p>";
    translationList.append(featureFilter);

    $('#headings-feature-filter-label').text(i18n.t('general.module-headings'));
    $('#strongs-feature-filter-label').text(i18n.t('general.module-strongs'));

    var languagesPage = "#translation-settings-wizard-add-p-1";
    var uiLanguages = this._helper.getSelectedSettingsWizardElements(languagesPage);
    for (var i = 0; i < uiLanguages.length; i++) {
      var currentLanguageName = uiLanguages[i];
      if (this.languageMapper.mappingExists(currentLanguageName)) {
        currentLanguageName = this.languageMapper.getLanguageName(currentLanguageName);
      }
      uiLanguages[i] = "<b>" + currentLanguageName + "</b>";
    }

    var uiRepositories = this.getSelectedReposForUi();
    var introText = "<p style='margin-bottom: 2em;'>" +
                    i18n.t("translation-wizard.the-selected-repositories") + " (" +
                    uiRepositories.join(', ') + ") " +
                    i18n.t("translation-wizard.contain-the-following-modules") + " (" +
                    uiLanguages.join(', ') + ")" +
                    ":</p>";

    translationList.append(introText);

    var filteredTranslationList = "<div id='filtered-translation-list'></div>";
    translationList.append(filteredTranslationList);

    $('.translation-feature-filter').bind('click', async () => {
      this.listFilteredModules(selectedLanguages, uiLanguages);      
    });

    this.listFilteredModules(selectedLanguages, uiLanguages);
  }

  listFilteredModules(selectedLanguages, uiLanguages) {
    var filteredTranslationList = $('#filtered-translation-list');
    filteredTranslationList.empty();

    var headingsFilter = $('#headings-feature-filter').prop('checked');
    var strongsFilter = $('#strongs-feature-filter').prop('checked');

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
        var currentRepoLangModules = nsi.getRepoModulesByLang(currentRepo, currentLanguage, headingsFilter, strongsFilter);
        // Append this repo's modules to the overall language list
        currentLangModules = currentLangModules.concat(currentRepoLangModules);
      }

      currentLangModules = currentLangModules.sort(this.sortBy('description'));
      this.listLanguageModules(currentUiLanguage, currentLangModules, renderHeader);
    }

    filteredTranslationList.find('.bible-translation-info').bind('click', function() {
      var translationCode = $(this).text();
      $('#translation-info-content').empty();
      $('#translation-info').find('.loader').show();

      setTimeout(() => {
        var moduleInfo = bible_browser_controller.translation_controller.getBibleTranslationInfo(translationCode, true);
        $('#translation-info').find('.loader').hide();
        $('#translation-info-content').append(moduleInfo);
      }, 200);
    });

    this._helper.bindLabelEvents(filteredTranslationList);
    
    filteredTranslationList.find('.module-checkbox, .label').bind('mousedown', (event) => {
      var checkbox = null;

      if (event.target.classList.contains('module-checkbox')) {
        checkbox = $(event.target);
      } else {
        checkbox = $(event.target).closest('.selectable-translation-module').find('.module-checkbox');
      }
      
      var moduleId = checkbox.parent().find('.bible-translation-info').text();
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
    });
  }

  showUnlockDialog(swordModule, checkbox=undefined) {
    this._unlockDialogOpened = true;
    this._unlockCancelled = false;

    if (swordModule.unlockInfo != "") {
      $('#dialog-unlock-info').html(swordModule.unlockInfo);
    }

    var unlockDialog = $('#translation-settings-wizard-unlock-dialog');
    var unlockFailedMsg = $('#unlock-failed-msg');

    if (checkbox === undefined) {
      unlockFailedMsg.show();
    } else {
      unlockFailedMsg.hide();
    }

    var unlockDialogOptions = {
      modal: true,
      title: i18n.t("translation-wizard.enter-unlock-key", { moduleId: swordModule.name }),
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
    var wizardPage = $('#translation-settings-wizard-add-p-2');
    var translationList = wizardPage.find('#filtered-translation-list');

    if (renderHeader) {
      var languageHeader = "<p style='font-weight: bold; margin-top: 2em;'>" + lang + "</p>";
      translationList.append(languageHeader);
    }

    for (var i = 0; i < modules.length; i++) {
      var currentModule = modules[i];
      var checkboxDisabled = "";
      var labelClass = "label";

      if (this.isTranslationInstalled(currentModule.name) == true) {
        checkboxDisabled = "disabled='disabled' checked";
        labelClass = "disabled-label";
      }

      var moduleTitle = "";
      if (currentModule.locked) {
        var moduleLockInfo = i18n.t("translation-wizard.module-lock-info");
        moduleTitle = "title='" + moduleLockInfo + "'";
      }

      var currentModuleElement = "<p class='selectable-translation-module'>";
      currentModuleElement += "<input class='module-checkbox' type='checkbox' "+ checkboxDisabled + ">";
      
      currentModuleElement += "<span " + moduleTitle + " class='" + labelClass + "' id='" + currentModule.name + "'>";
      currentModuleElement += currentModule.description;
      currentModuleElement += "</span>&nbsp;";

      currentModuleElement += "[<span class='bible-translation-info'>" + currentModule.name + "</span>]";

      if (currentModule.locked) {
        var lockedIcon = "<img style='margin-left: 0.5em; margin-bottom: -0.4em;' src='images/lock.png' width='20' height='20'/>";
        currentModuleElement += lockedIcon;
      }

      currentModuleElement += "</p>";

      translationList.append(currentModuleElement);
    }
  }

  getLanguageTranslationCount(language) {
    var count = 0;

    for (var i = 0; i < this._selectedRepositories.length; i++) {
      var currentRepo = this._selectedRepositories[i];
      count += nsi.getRepoLanguageTranslationCount(currentRepo, language);
    }

    return count;
  }

  hasRepoBeenSelectedBefore(repo) {
    var hasBeenSelected = false;

    if (bible_browser_controller.settings.has('selected_repositories')) {
      var selectedRepositories = bible_browser_controller.settings.get('selected_repositories');

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

    if (bible_browser_controller.settings.has('selected_languages')) {
      var selectedLanguages = bible_browser_controller.settings.get('selected_languages');

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
    var wizardPage = $('#translation-settings-wizard-add-p-0');

    var repositories = nsi.getRepoNames();
    wizardPage.empty();

    var introText = "<p style='margin-bottom: 2em;'>" +
                    i18n.t("translation-wizard.repo-selection-info-text") +
                    "</p>";

    wizardPage.append(introText);

    for (var i = 0; i < repositories.length; i++) {
      var currentRepoTranslationCount = this.getRepoTranslationCount(repositories[i]);

      if (currentRepoTranslationCount > 0) {
        var checkboxChecked = "";
        if (this.hasRepoBeenSelectedBefore(repositories[i])) {
          checkboxChecked = " checked";
        }

        var currentRepo = "<p><input type='checkbox'" + checkboxChecked + "><span class='label' id='" + repositories[i] + "'>";
        currentRepo += repositories[i] + ' (' + currentRepoTranslationCount + ')';
        currentRepo += "</span></p>";
        wizardPage.append(currentRepo);
      }
    }

    var lastUpdate = bible_browser_controller.settings.get("lastSwordRepoUpdate");
    if (lastUpdate !== undefined) {
      lastUpdate = new Date(Date.parse(lastUpdate)).toLocaleDateString(i18n.language);
    }

    var lastUpdateInfo = "<p style='margin-top: 2em;'>" +
                         i18n.t("translation-wizard.repo-data-last-updated", { date: lastUpdate }) + " " +
                         "<button id='update-repo-data' class='fg-button ui-state-default ui-corner-all'>" +
                         i18n.t("translation-wizard.update-now") +
                         "</button>" +
                         "</p>";

    wizardPage.append(lastUpdateInfo);

    $('#update-repo-data').bind('click', async () => {
      await this.updateRepositoryConfig(true);
    });

    configure_button_styles('#translation-settings-wizard-add-p-0');

    var additionalInfo = "<p style='margin-top: 2em;'>" +
                         i18n.t("translation-wizard.more-repo-information-needed") +
                         "</p>";

    wizardPage.append(additionalInfo);
    this._helper.bindLabelEvents(wizardPage);
  }

  getRepoTranslationCount(repo) {
    var count = 0;
    var allRepoModules = nsi.getAllRepoModules(repo);

    for (var i = 0; i < allRepoModules.length; i++) {
      var module = allRepoModules[i];

      if (this.languageMapper.mappingExists(module.language)) {
        count += 1;
      }
    }

    return count;
  }
}

module.exports = InstallTranslationWizard;

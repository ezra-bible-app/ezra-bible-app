/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

const NodeSwordInterface = require('node-sword-interface');

class TranslationWizard {
  constructor() {
    this._installedTranslations = null;
    this._translationInstallStatus = 'DONE';
    this._translationRemovalStatus = 'DONE';
    this._nodeSwordInterface = new NodeSwordInterface();
    this.languageMapper = new LanguageMapper();


    var addButton = $('#add-bible-translations-button');
    var removeButton = $('#remove-bible-translations-button');

    addButton.bind('click', () => this.openAddTranslationWizard());

    removeButton.bind('click', async () => {
      var result = await models.BibleTranslation.findAndCountAll();
      if (result.count > 0) {
        this.openRemoveTranslationWizard();
      }
    });
  }

  init(onAllTranslationsRemoved, onTranslationRemoved) {
    this.onAllTranslationsRemoved = onAllTranslationsRemoved;
    this.onTranslationRemoved = onTranslationRemoved;
  }

  async isTranslationInstalled(translationCode) {
    if (this._installedTranslations == null) {
      this._installedTranslations = await models.BibleTranslation.getTranslations();
    }

    for (var i = 0; i < this._installedTranslations.length; i++) {
      if (this._installedTranslations[i] == translationCode) {
        return true;
      }
    }

    return false;
  }

  getSelectedSettingsWizardElements(wizardPage) {
    var selectedElements = [];

    var allElements = $(wizardPage).find('p');
    for (var i = 0; i < allElements.length; i++) {
      var currentElement = $(allElements[i]);
      var currentCheckbox = currentElement.find('input');
      var isChecked = currentCheckbox.prop('checked');
      var isDisabled = currentCheckbox.prop('disabled');

      if (isChecked && !isDisabled) {
        selectedElements.push(currentElement.find('span').attr('id'));
      }
    }

    return selectedElements;
  }

  openWizard() {
    var wizardWidth = 1100;
    var appContainerWidth = $(window).width() - 10;
    var offsetLeft = appContainerWidth - wizardWidth - 100;
    var offsetTop = 20;

    $('#translation-settings-wizard-add').hide();
    $('#translation-settings-wizard-remove').hide();
    $('#translation-settings-wizard-init').show();

    models.BibleTranslation.findAndCountAll().then(result => {
      $('#add-bible-translations-button').removeClass('ui-state-disabled');

      if (result.count > 0) {
        $('#remove-bible-translations-button').removeClass('ui-state-disabled');
      } else {
        $('#remove-bible-translations-button').addClass('ui-state-disabled');
      }
    });

    $('#translation-settings-wizard').dialog({
      position: [offsetLeft, offsetTop],
      title: i18n.t("translation-wizard.header"),
      dialogClass: 'ezra-dialog',
      width: wizardWidth,
      minHeight: 250
    });
  }

  async openAddTranslationWizard() {
    $('#translation-settings-wizard-init').hide();
    this.initAddTranslationWizard();
    $('#translation-settings-wizard-add').show();

    var wizardPage = $('#translation-settings-wizard-add-p-0');
    wizardPage.empty();

    if (!this._nodeSwordInterface.repositoryConfigExisting()) {
      wizardPage.append('<p>Updating repository data! This will take a few seconds ...</p>');

      await this._nodeSwordInterface.updateRepositoryConfig();
    }

    wizardPage.append('<p>' + i18n.t("translation-wizard.loading-repositories") + '</p>');
    setTimeout(() => this.listRepositories(), 800);
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

  async openRemoveTranslationWizard() {
    $('#translation-settings-wizard-init').hide();
    this.initRemoveTranslationWizard();
    $('#translation-settings-wizard-remove').show();

    var wizardPage = $('#translation-settings-wizard-remove-p-0');
    wizardPage.empty();

    var header = "<p>" + i18n.t("translation-wizard.select-translations-to-be-removed") + "</p>";
    wizardPage.append(header);

    var languages = await models.BibleTranslation.getLanguages();

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newLanguageBox = "<div>" +
                           "<h2>" + currentLang.languageName + "</h2>" +
                           "<div id='remove-translation-wizard-" + currentLang.languageCode + "-translations'></div>" +
                           "</div>";

      wizardPage.append(newLanguageBox);
    }

    models.BibleTranslation.findAndCountAll().then(result => {
      for (var translation of result.rows) {
        var checkboxDisabled = '';
        var currentTranslationClass = "class='label' ";
        
        if (!this._nodeSwordInterface.isModuleInUserDir(translation.id)) {
          checkboxDisabled = "disabled='disabled' ";
          currentTranslationClass = "class='label disabled'";
        }

        var currentTranslationHtml = "<p><input type='checkbox'" + checkboxDisabled + ">" + 
                                     "<span " + currentTranslationClass + " id='" + translation.id + "'>";
        currentTranslationHtml += translation.name + " [" + translation.id + "]</span></p>";

        var languageBox = $('#remove-translation-wizard-' + translation.languageCode + '-translations');
        languageBox.append(currentTranslationHtml);
      }

      this.bindLabelEvents(wizardPage);
    });
  }

  initRemoveTranslationWizard() {
    if (this._removeTranslationWizardOriginalContent != undefined) {
        $('#translation-settings-wizard-remove').steps("destroy");
        $('#translation-settings-wizard-remove').html(this._removeTranslationWizardOriginalContent);
    } else {
        this._removeTranslationWizardOriginalContent = $('#translation-settings-wizard-remove').html();
    }

    $('#translation-settings-wizard-remove').steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "translation-settings-wizard-remove",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this.removeTranslationWizardStepChanging(event, currentIndex, newIndex),
      onStepChanged: (event, currentIndex, priorIndex) => this.removeTranslationWizardStepChanged(event, currentIndex, priorIndex),
      onFinishing: (event, currentIndex) => this.removeTranslationWizardFinishing(event, currentIndex),
      onFinished: (event, currentIndex) => this.removeTranslationWizardFinished(event, currentIndex),
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
      var selectedRepositories = this.getSelectedSettingsWizardElements(wizardPage);
      return (selectedRepositories.length > 0);
    } else if (currentIndex == 1 && newIndex == 2) { // Changing from Languages (2) to Translations (3)
      var wizardPage = "#translation-settings-wizard-add-p-1";
      var selectedLanguages = this.getSelectedSettingsWizardElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 2 && newIndex == 3) { // Changing from Translations (3) to Installation (4)
      var wizardPage = "#translation-settings-wizard-add-p-2";
      var selectedTranslations = this.getSelectedSettingsWizardElements(wizardPage);
      return (selectedTranslations.length > 0);
    } else if (currentIndex == 3 && newIndex != 3) {
      return false;
    }

    return true;
  }

  async addTranslationWizardStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0) {

      // Repositories have been selected
      var wizardPage = "#translation-settings-wizard-add-p-0";
      this._selectedRepositories = this.getSelectedSettingsWizardElements(wizardPage);
      bible_browser_controller.settings.set('selected_repositories', this._selectedRepositories);

      var languagesPage = $('#translation-settings-wizard-add-p-1');
      languagesPage.empty();
      languagesPage.append("<p>" + i18n.t("translation-wizard.loading-languages") + "</p>");

      setTimeout(() => this.listLanguages(this._selectedRepositories), 400);

    } else if (priorIndex == 1) {

      // Languages have been selected
      var wizardPage = "#translation-settings-wizard-add-p-1";
      var languages = this.getSelectedSettingsWizardElements(wizardPage);
      var languageCodes = [];

      for (var i = 0; i < languages.length; i++) {
        var currentCode = languages[i];
        languageCodes.push(currentCode);
      }

      bible_browser_controller.settings.set('selected_languages', languages);
      await this.listModules(languageCodes);

    } else if (priorIndex == 2) {
      
      // Bible translations have been selected
      var translationsPage = "#translation-settings-wizard-add-p-2";
      var translations = this.getSelectedSettingsWizardElements(translationsPage);

      this._translationInstallStatus = 'IN_PROGRESS';

      var installPage = $("#translation-settings-wizard-add-p-3");
      installPage.empty();
      installPage.append('<h3>' + i18n.t("translation-wizard.installing-translations") + '</h3>');
      installPage.append('<p>' + i18n.t("translation-wizard.it-takes-time-to-install-translation") + '</p>');

      for (var i = 0; i < translations.length; i++) {
        var translationCode = translations[i];
        var translationName = this._nodeSwordInterface.getModuleDescription(translationCode);

        installPage.append("<div style='float: left;'>" + i18n.t("translation-wizard.installing") + " <i>" + translationName + "</i> ... </div>");

        var loader = "<div id='bibleTranslationInstallIndicator' class='loader'>" + 
                      "<div class='bounce1'></div>" +
                      "<div class='bounce2'></div>" +
                      "<div class='bounce3'></div>" +
                      "</div>"

        installPage.append(loader);
        $('#bibleTranslationInstallIndicator').show();
        
        await this._nodeSwordInterface.installModule(translationCode);
        await models.BibleTranslation.importSwordTranslation(translationCode);

        // FIXME: Put this in a callback
        bible_browser_controller.updateUiAfterBibleTranslationAvailable(translationCode);

        $('#bibleTranslationInstallIndicator').hide();
        $('#bibleTranslationInstallIndicator').remove();

        installPage.append('<div>&nbsp;' + i18n.t("general.done") + '.</div>');
        installPage.append('<br/>');
      }

      this._translationInstallStatus = 'DONE';
    }
  }

  addTranslationWizardFinishing(event, currentIndex) {
    return this._translationInstallStatus != 'IN_PROGRESS';
  }

  async addTranslationWizardFinished(event, currentIndex) {
    $('#translation-settings-wizard').dialog('close');
    this._installedTranslations = await models.BibleTranslation.getTranslations();
    await bible_browser_controller.translation_controller.initTranslationsMenu();
    await tags_controller.updateTagUiBasedOnTagAvailability();
  }

  removeTranslationWizardStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == 0 && newIndex == 1) { // Changing from Translations (1) to Removal (2)
      var wizardPage = "#translation-settings-wizard-remove-p-0";
      var selectedLanguages = this.getSelectedSettingsWizardElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 1 && newIndex != 1) {
      return false;
    }

    return true;
  }

  async removeTranslationWizardStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0) {
      // Bible translations have been selected
      var translationsPage = "#translation-settings-wizard-remove-p-0";
      var translations = this.getSelectedSettingsWizardElements(translationsPage);

      this._translationRemovalStatus = 'IN_PROGRESS';

      var removalPage = $("#translation-settings-wizard-remove-p-1");
      removalPage.empty();
      removalPage.append('<h3>' + i18n.t("translation-wizard.removing-translations") + '</h3>');
      removalPage.append('<p>' + i18n.t("translation-wizard.removal-takes-time") + '</p>');

      setTimeout(async () => {
        for (var i = 0; i < translations.length; i++) {
          var translationCode = translations[i];
          var translationName = this._nodeSwordInterface.getModuleDescription(translationCode);

          removalPage.append('<span>' + i18n.t("translation-wizard.removing") + ' <i>' + translationName + '</i> ... </span>');
          
          await this._nodeSwordInterface.uninstallModule(translationCode);
          await models.BibleTranslation.removeFromDb(translationCode);

          var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
          if (currentBibleTranslationId == translationCode) {
            models.BibleTranslation.findAndCountAll().then(result => {
              if (result.rows.length > 0) {
                // FIXME: Also put this in a callback
                bible_browser_controller.tab_controller.setCurrentBibleTranslationId(result.rows[0].id);
                bible_browser_controller.onBibleTranslationChanged();
                bible_browser_controller.navigation_pane.updateNavigation();
              } else {
                this.onAllTranslationsRemoved();
              }

              this.onTranslationRemoved();
            });
          }

          removalPage.append('<span>' + i18n.t("general.done") + '.</span>');
          removalPage.append('<br/>');
        }
      }, 800);

      this._translationRemovalStatus = 'DONE';
    }
  }

  removeTranslationWizardFinishing(event, currentIndex) {
    return this._translationRemovalStatus != 'IN_PROGRESS';
  }

  async removeTranslationWizardFinished(event, currentIndex) {
    $('#translation-settings-wizard').dialog('close');
    this._installedTranslations = await models.BibleTranslation.getTranslations();
    bible_browser_controller.translation_controller.initTranslationsMenu();
  }

  getAvailableLanguagesFromSelectedRepos(selectedRepositories) {
    var knownLanguages = [];
    var unknownLanguages = [];

    for (var i = 0;  i < selectedRepositories.length; i++) {
      var currentRepo = selectedRepositories[i];
      var repoLanguages = this._nodeSwordInterface.getRepoLanguages(currentRepo);

      for (var j = 0; j < repoLanguages.length; j++) {
        var currentLanguageCode = repoLanguages[j];

        if (this.languageMapper.mappingExists(currentLanguageCode)) {
          if (!knownLanguages.includes(currentLanguageCode)) {
            var currentLanguageName = this.languageMapper.getLanguageName(currentLanguageCode);
            knownLanguages.push({
              "languageCode": currentLanguageCode,
              "languageName": currentLanguageName
            });
          }
        } else {
          console.log("Unknown lang: " + currentLanguageCode);
          if (!unknownLanguages.includes(currentLanguageCode)) {
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

    this.bindLabelEvents(wizardPage);
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

  async listModules(selectedLanguages) {
    var wizardPage = $('#translation-settings-wizard-add-p-2');
    var translationList = wizardPage.find('#translation-list');
    var translationInfo = wizardPage.find('#translation-info');
    translationList.empty();
    var translationInfoContent = i18n.t("translation-wizard.click-to-show-detailed-module-info");

    $('#translation-info-content').html(translationInfoContent);

    var languagesPage = "#translation-settings-wizard-add-p-1";
    var uiLanguages = this.getSelectedSettingsWizardElements(languagesPage);
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
        var currentRepoLangModules = this._nodeSwordInterface.getRepoModulesByLang(currentRepo, currentLanguage);
        // Append this repo's modules to the overall language list
        currentLangModules = currentLangModules.concat(currentRepoLangModules);
      }

      currentLangModules = currentLangModules.sort(this.sortBy('description'));
      await this.listLanguageModules(currentUiLanguage, currentLangModules, renderHeader);
    }

    translationList.find('.bible-translation-info').bind('click', function() {
      var translationCode = $(this).text();
      $('#translation-info-content').empty();
      $('#translation-info').find('.loader').show();

      setTimeout(() => {
        var moduleInfo = bible_browser_controller.translation_controller.getBibleTranslationInfo(translationCode, true);
        $('#translation-info').find('.loader').hide();
        $('#translation-info-content').append(moduleInfo);
      }, 200);
    });

    this.bindLabelEvents(translationList);
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

  async listLanguageModules(lang, modules, renderHeader) {
    var wizardPage = $('#translation-settings-wizard-add-p-2');
    var translationList = wizardPage.find('#translation-list');

    if (renderHeader) {
      var languageHeader = "<p style='font-weight: bold; margin-top: 2em;'>" + lang + "</p>";
      translationList.append(languageHeader);
    }

    for (var i = 0; i < modules.length; i++) {
      var currentModule = modules[i];
      var checkboxDisabled = "";
      var labelClass = "label";

      if (await this.isTranslationInstalled(currentModule.name) == true) {
        checkboxDisabled = "disabled='disabled' checked";
        labelClass = "disabled-label";
      }

      var moduleTitle = "";
      if (currentModule.locked) {
        moduleTitle = "title='This module is locked and requires that you purchase an unlock key from the content owner!'";
      }

      var currentModuleElement = "<p class='selectable-translation-module'>";
      currentModuleElement += "<input type='checkbox' "+ checkboxDisabled + ">";
      
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
      count += this._nodeSwordInterface.getRepoLanguageTranslationCount(currentRepo, language);
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

    var repositories = this._nodeSwordInterface.getRepoNames();
    wizardPage.empty();

    var introText = "<p style='margin-bottom: 2em;'>" +
                    i18n.t("translation-wizard.repo-selection-info-text") +
                    "</p>";

    wizardPage.append(introText);

    /*repositories = repositories.sort((a, b) => {
      var repoTranslationCountA = this.getRepoTranslationCount(a);
      var repoTranslationCountB = this.getRepoTranslationCount(b);

      if (repoTranslationCountA >= repoTranslationCountB) {
        return -1;
      } else if (repoTranslationCountA < repoTranslationCountB) {
        return 1;
      }

      return 0;
    });*/

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

    var additionalInfo = "<p style='margin-top: 2em;'>" +
                         i18n.t("translation-wizard.more-repo-information-needed") +
                         "</p>";

    wizardPage.append(additionalInfo);
    this.bindLabelEvents(wizardPage);
  }

  getRepoTranslationCount(repo) {
    var count = 0;
    var allRepoModules = this._nodeSwordInterface.getAllRepoModules(repo);

    for (var i = 0; i < allRepoModules.length; i++) {
      var module = allRepoModules[i];

      if (this.languageMapper.mappingExists(module.language)) {
        count += 1;
      }
    }

    return count;
  }

  bindLabelEvents(wizardPage) {
    wizardPage.find('.label').bind('click', function() {
      var checkbox = $(this).prev();
      checkbox.click();
    });
  }
}

module.exports = TranslationWizard;


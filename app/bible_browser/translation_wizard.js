/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@tklein.info>

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

const ezraSwordInterface = require('ezra-sword-interface');
const ISO6391 = require('iso-639-1');

class TranslationWizard {
  constructor() {
    this._installedTranslations = null;
    this._translationInstallStatus = 'DONE';
    this._translationRemovalStatus = 'DONE';

    var addButton = $('#add-bible-translations-button');
    var removeButton = $('#remove-bible-translations-button');

    addButton.bind('click', event => this.openAddTranslationWizard());

    removeButton.bind('click', event => {
      models.BibleTranslation.findAndCountAll().then(result => {
        if (result.count > 0) {
          this.openRemoveTranslationWizard();
        }
      });
    });
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
    var verse_list_position = $('#verse-list-frame').offset();

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
      position: [verse_list_position.left + 50, verse_list_position.top + 50],
      title: "Bible translation settings",
      dialogClass: 'ezra-dialog',
      width: 850
    });
  }

  async openAddTranslationWizard() {
    $('#translation-settings-wizard-init').hide();
    this.initAddTranslationWizard();
    $('#translation-settings-wizard-add').show();

    var wizardPage = $('#translation-settings-wizard-add-p-0');
    wizardPage.empty();

    if (!ezraSwordInterface.repositoryConfigExisting()) {
      wizardPage.append('<p>Updating repository data! This will take a few seconds ...</p>');

      await this.refreshRemoteSources();
    }

    wizardPage.append('<p>Loading repositories ...</p>');
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
      onFinished: (event, currentIndex) => this.addTranslationWizardFinished(event, currentIndex)
    });
  }

  async openRemoveTranslationWizard() {
    $('#translation-settings-wizard-init').hide();
    this.initRemoveTranslationWizard();
    $('#translation-settings-wizard-remove').show();

    var wizardPage = $('#translation-settings-wizard-remove-p-0');
    wizardPage.empty();

    var languages = await models.BibleTranslation.getLanguages();

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newLanguageBox = "<div><h2>" + currentLang + "</h2><div id='remove-translation-wizard-" + currentLang + "-translations'></div></div>";
      wizardPage.append(newLanguageBox);
    }

    models.BibleTranslation.findAndCountAll().then(result => {
      for (var translation of result.rows) {
        var current_translation_html = "<p><input type='checkbox'><span class='label' id='" + translation.id + "'>" + translation.name + "</span></p>"
        var languageBox = $('#remove-translation-wizard-' + translation.language + '-translations');
        languageBox.append(current_translation_html);
      }
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
      onFinished: (event, currentIndex) => this.removeTranslationWizardFinished(event, currentIndex)
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
      this.updateSettingsWizardLanguages(this._selectedRepositories);

    } else if (priorIndex == 1) {

      // Languages have been selected
      var wizardPage = "#translation-settings-wizard-add-p-1";
      var languages = this.getSelectedSettingsWizardElements(wizardPage);
      var languageCodes = [];

      for (var i = 0; i < languages.length; i++) {
        var currentLanguage = languages[i];
        var currentCode = ISO6391.getCode(currentLanguage);
        languageCodes.push(currentCode);
      }

      await this.updateSettingsWizardModules(languageCodes);

    } else if (priorIndex == 2) {
      
      // Bible translations have been selected
      var translationsPage = "#translation-settings-wizard-add-p-2";
      var translations = this.getSelectedSettingsWizardElements(translationsPage);

      this._translationInstallStatus = 'IN_PROGRESS';

      var installPage = $("#translation-settings-wizard-add-p-3");
      installPage.empty();
      installPage.append('<h3>Installing selected bible translations</h3>');
      installPage.append('<p>Note, that each installation takes some time to download and then install.</p>');

      for (var i = 0; i < translations.length; i++) {
        var translationCode = translations[i];
        var translationName = ezraSwordInterface.getModuleDescription(translationCode);

        installPage.append('<span>Installing <i>' + translationName + '</i> ... </span>');
        
        await this.installTranslation(translationCode);
        await models.BibleTranslation.importSwordTranslation(translationCode);
        await models.BibleTranslation.updateVersification(translationCode);

        if (current_bible_translation_id == "" || current_bible_translation_id == null) {
          current_bible_translation_id = translationCode;
        }

        installPage.append('<span>done.</span>');
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
    $('#bible-select').removeAttr('disabled');
    initTranslationsMenu();
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
      removalPage.append('<h3>Removing selected bible translations</h3>');
      removalPage.append('<p>Note, that each removal takes some time.</p>');

      for (var i = 0; i < translations.length; i++) {
        var translationCode = translations[i];
        var translationName = ezraSwordInterface.getModuleDescription(translationCode);

        removalPage.append('<span>Removing <i>' + translationName + '</i> ... </span>');
        
        ezraSwordInterface.uninstallModule(translationCode);
        await models.BibleTranslation.removeFromDb(translationCode);

        if (current_bible_translation_id == translationCode) {
          settings.delete('bible_translation');
          current_bible_translation_id = models.BibleTranslation.findAndCountAll().then(result => {
            if (result.rows.length > 0) {
              current_bible_translation_id = result.rows[0].id;
              bible_browser_controller.update_book_data();
            } else {
              $('#verse-list').empty();
              $('#verse-list-loading-indicator').hide();
              $('#verse-list').append("<div class='help-text'>To start using Ezra Project, select a book or a tag from the menu above.</div>");
              current_bible_translation_id = null;
              bible_browser_controller.current_book = null;
              $('.book-select-value').text("Select book");
            }

            $("select#bible-select").empty();
            initTranslationsMenu();
            updateNavMenu();
            tags_controller.updateTagUiBasedOnTagAvailability();
          });
        }

        removalPage.append('<span>done.</span>');
        removalPage.append('<br/>');
      }

      this._translationRemovalStatus = 'DONE';
    }
  }

  removeTranslationWizardFinishing(event, currentIndex) {
    return this._translationRemovalStatus != 'IN_PROGRESS';
  }

  async removeTranslationWizardFinished(event, currentIndex) {
    $('#translation-settings-wizard').dialog('close');
    this._installedTranslations = await models.BibleTranslation.getTranslations();
    initTranslationsMenu();
  }

  updateSettingsWizardLanguages(selectedRepositories) {
    var knownLanguages = [];
    var unknownLanguages = [];

    for (var i = 0;  i < selectedRepositories.length; i++) {
      var currentRepo = selectedRepositories[i];
      var repoLanguages = ezraSwordInterface.getRepoLanguages(currentRepo);

      for (var j = 0; j < repoLanguages.length; j++) {
        if (ISO6391.validate(repoLanguages[j])) {
          var currentLanguageName = ISO6391.getName(repoLanguages[j]);
          if (!knownLanguages.includes(currentLanguageName)) {
            knownLanguages.push(currentLanguageName);
          }
        } else {
          if (!unknownLanguages.includes(repoLanguages[j])) {
            unknownLanguages.push(repoLanguages[j]);
          }
        }
      }
    }

    knownLanguages.sort();
    unknownLanguages.sort();

    $('#translation-settings-wizard-add-p-1').empty();
    for (var i = 0; i < knownLanguages.length; i++) {
      var currentLanguageCode = ISO6391.getCode(knownLanguages[i]);
      var currentLanguageTranslationCount = this.getLanguageTranslationCount(currentLanguageCode);
      var currentLanguage = "<p><input type='checkbox'><span class='label' id='" + knownLanguages[i] + "'>";
      currentLanguage += knownLanguages[i] + ' (' + currentLanguageTranslationCount + ')';
      currentLanguage += "</span></p>";
      $('#translation-settings-wizard-add-p-1').append(currentLanguage);
    }
  }

  async updateSettingsWizardModules(selectedLanguages) {
    $('#translation-settings-wizard-add-p-2').empty();

    var selectedLanguageModules = [];

    for (var i = 0; i < this._selectedRepositories.length; i++) {
      var currentRepo = this._selectedRepositories[i];

      for (var j = 0; j < selectedLanguages.length; j++) {
        var currentLanguage = selectedLanguages[j];
        var currentLanguageModules = ezraSwordInterface.getRepoModulesByLang(currentRepo, currentLanguage);

        for (var k = 0; k < currentLanguageModules.length; k++) {
          var currentModule = currentLanguageModules[k].name;
          selectedLanguageModules.push(currentModule);
        }
      }
    }

    selectedLanguageModules.sort();

    for (var i = 0; i < selectedLanguageModules.length; i++) {
      var currentModule = selectedLanguageModules[i];
      var currentModuleDescription = ezraSwordInterface.getModuleDescription(currentModule);
      var checkboxDisabled = "";
      var labelClass = "label";
      if (await this.isTranslationInstalled(currentModule) == true) {
        checkboxDisabled = "disabled='disabled' checked";
        labelClass = "disabled-label";
      }
      var currentModuleElement = "<p><input type='checkbox' "+ checkboxDisabled + "><span class='" + labelClass + "' id='" + currentModule + "'>";
      currentModuleElement += currentModuleDescription + " [" + currentModule + "]";
      currentModuleElement += "</span></p>";

      $('#translation-settings-wizard-add-p-2').append(currentModuleElement);
    }
  }

  getLanguageTranslationCount(language) {
    var count = 0;

    for (var i = 0; i < this._selectedRepositories.length; i++) {
      var currentRepo = this._selectedRepositories[i];
      count += ezraSwordInterface.getRepoLanguageTranslationCount(currentRepo, language);
    }

    return count;
  }

  listRepositories() {
    var wizardPage = $('#translation-settings-wizard-add-p-0');

    var repositories = ezraSwordInterface.getRepoNames();
    wizardPage.empty();

    for (var i = 0; i < repositories.length; i++) {
      var currentRepoTranslationCount = this.getRepoTranslationCount(repositories[i]);

      if (currentRepoTranslationCount > 0) {
        var currentRepo = "<p><input type='checkbox'><span class='label' id='" + repositories[i] + "'>";
        currentRepo += repositories[i] + ' (' + currentRepoTranslationCount + ')';
        currentRepo += "</span></p>";
        wizardPage.append(currentRepo);
      }
    }
  }

  getRepoTranslationCount(repo) {
    var count = 0;
    var allRepoModules = ezraSwordInterface.getAllRepoModules(repo);

    for (var i = 0; i < allRepoModules.length; i++) {
      var module = allRepoModules[i];

      if (ISO6391.validate(module.language)) {
        count += 1;
      }
    }

    return count;
  }

  refreshRemoteSources() {
    return new Promise(resolve => {
      ezraSwordInterface.refreshRemoteSources(function() {
        resolve();
      });
    });
  }

  installTranslation(translationCode) {
    return new Promise(resolve => {
      ezraSwordInterface.installModule(translationCode, function() {
        resolve();
      });
    });
  }
}

module.exports = TranslationWizard;


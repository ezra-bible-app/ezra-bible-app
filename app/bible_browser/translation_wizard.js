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
const ISO6391 = require('iso-639-1');

class TranslationWizard {
  constructor() {
    this._installedTranslations = null;
    this._translationInstallStatus = 'DONE';
    this._translationRemovalStatus = 'DONE';
    this._nodeSwordInterface = new NodeSwordInterface();

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
    var wizardWidth = 850;
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
      title: "Configure bible translations",
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
        var current_translation_html = "<p><input type='checkbox'><span class='label' id='" + translation.id + "'>";
        current_translation_html += translation.name + " [" + translation.id + "]</span></p>";

        var languageBox = $('#remove-translation-wizard-' + translation.language + '-translations');
        languageBox.append(current_translation_html);
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
      bible_browser_controller.settings.set('selected_repositories', this._selectedRepositories);

      var languagesPage = $('#translation-settings-wizard-add-p-1');
      languagesPage.empty();
      languagesPage.append("<p>Loading languages ...</p>");

      setTimeout(() => this.listLanguages(this._selectedRepositories), 400);

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

      bible_browser_controller.settings.set('selected_languages', languages);
      await this.listModules(languageCodes);

    } else if (priorIndex == 2) {
      
      // Bible translations have been selected
      var translationsPage = "#translation-settings-wizard-add-p-2";
      var translations = this.getSelectedSettingsWizardElements(translationsPage);

      this._translationInstallStatus = 'IN_PROGRESS';

      var installPage = $("#translation-settings-wizard-add-p-3");
      installPage.empty();
      installPage.append('<h3>Installing selected bible translations</h3>');
      installPage.append('<p>Note that it takes some time for each translation to be downloaded and then installed.</p>');

      for (var i = 0; i < translations.length; i++) {
        var translationCode = translations[i];
        var translationName = this._nodeSwordInterface.getModuleDescription(translationCode);

        installPage.append("<div style='float: left;'>Installing <i>" + translationName + "</i> ... </div>");

        var loader = "<div id='bibleTranslationInstallIndicator' class='loader'>" + 
                      "<div class='bounce1'></div>" +
                      "<div class='bounce2'></div>" +
                      "<div class='bounce3'></div>" +
                      "</div>"

        installPage.append(loader);
        $('#bibleTranslationInstallIndicator').show();
        
        await this._nodeSwordInterface.installModule(translationCode);
        await models.BibleTranslation.importSwordTranslation(translationCode);
        await models.BibleTranslation.updateVersification(translationCode);

        var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
        if (currentBibleTranslationId == "" || 
            currentBibleTranslationId == null) { // Update UI after a bible translation becomes available

          bible_browser_controller.tab_controller.setCurrentBibleTranslationId(translationCode);
          bible_browser_controller.translation_controller.updateAvailableBooks();
          bible_browser_controller.translation_controller.enableCurrentTranslationInfoButton();
        }

        $('#bibleTranslationInstallIndicator').hide();
        $('#bibleTranslationInstallIndicator').remove();

        installPage.append('<div>&nbsp;done.</div>');
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
      removalPage.append('<h3>Removing selected bible translations</h3>');
      removalPage.append('<p>Note, that each removal takes some time.</p>');

      setTimeout(async () => {
        for (var i = 0; i < translations.length; i++) {
          var translationCode = translations[i];
          var translationName = this._nodeSwordInterface.getModuleDescription(translationCode);

          removalPage.append('<span>Removing <i>' + translationName + '</i> ... </span>');
          
          await this._nodeSwordInterface.uninstallModule(translationCode);
          await models.BibleTranslation.removeFromDb(translationCode);

          var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId();
          if (currentBibleTranslationId == translationCode) {
            settings.delete('bible_translation');
            models.BibleTranslation.findAndCountAll().then(result => {
              if (result.rows.length > 0) {
                bible_browser_controller.tab_controller.setCurrentBibleTranslationId(result.rows[0].id);
                bible_browser_controller.onBibleTranslationChanged();
                bible_browser_controller.navigation_pane.updateNavigation();
              } else { // Re-init application to state without bible translations
                bible_browser_controller.tab_controller.removeAllExtraTabs();
                bible_browser_controller.tab_controller.setCurrentBibleTranslationId(null);
                bible_browser_controller.tab_controller.resetCurrentTabTitle();
                bible_browser_controller.resetVerseListView();
                var currentVerseListLoadingIndicator = bible_browser_controller.getCurrentVerseListLoadingIndicator();
                currentVerseListLoadingIndicator.hide();
                var currentVerseList = bible_browser_controller.getCurrentVerseList();
                currentVerseList.append("<div class='help-text'>To start using Ezra Project, select a book or a tag from the menu above.</div>");
                bible_browser_controller.translation_controller.disableCurrentTranslationInfoButton();
                bible_browser_controller.current_book = null;
                $('.book-select-value').text("Select book");
              }

              $("select#bible-select").empty();
              bible_browser_controller.translation_controller.initTranslationsMenu();
              tags_controller.updateTagUiBasedOnTagAvailability();
            });
          }

          removalPage.append('<span>done.</span>');
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

    return knownLanguages;
  }

  listLanguages(selectedRepositories) {
    var wizardPage = $('#translation-settings-wizard-add-p-1');
    wizardPage.empty();

    var uiRepositories = this.getSelectedReposForUi();
    var introText = "<p style='margin-bottom: 2em;'>" +
                    "Please pick at least one of the languages available from " +
                    uiRepositories.join(', ') +
                    ".</p>";

    wizardPage.append(introText);

    var knownLanguages = this.getAvailableLanguagesFromSelectedRepos(selectedRepositories);

    for (var i = 0; i < knownLanguages.length; i++) {
      var checkboxChecked = "";
      if (this.hasLanguageBeenSelectedBefore(knownLanguages[i])) {
        checkboxChecked = " checked";
      }

      var currentLanguageCode = ISO6391.getCode(knownLanguages[i]);
      var currentLanguageTranslationCount = this.getLanguageTranslationCount(currentLanguageCode);
      var currentLanguage = "<p style='float: left; width: 14em;'><input type='checkbox'" + checkboxChecked + "><span class='label' id='" + knownLanguages[i] + "'>";
      currentLanguage += knownLanguages[i] + ' (' + currentLanguageTranslationCount + ')';
      currentLanguage += "</span></p>";

      wizardPage.append(currentLanguage);
    }

    this.bindLabelEvents(wizardPage);
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
    wizardPage.empty();

    var languagesPage = "#translation-settings-wizard-add-p-1";
    var uiLanguages = this.getSelectedSettingsWizardElements(languagesPage);
    for (var i = 0; i < uiLanguages.length; i++) {
      uiLanguages[i] = "<b>" + uiLanguages[i] + "</b>";
    }

    var uiRepositories = this.getSelectedReposForUi();

    var introText = "<p style='margin-bottom: 2em;'>" +
                    uiLanguages.join(', ') +
                    " translations available from " +
                    uiRepositories.join(', ') +
                    ".</p>";

    wizardPage.append(introText);

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

    this.bindLabelEvents(wizardPage);
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

    if (renderHeader) {
      var languageHeader = "<p style='font-weight: bold; margin-top: 2em;'>" + lang + "</p>";
      wizardPage.append(languageHeader);
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

      var currentModuleElement = "<p>";
      currentModuleElement += "<input type='checkbox' "+ checkboxDisabled + ">";
      currentModuleElement += "<span " + moduleTitle + " class='" + labelClass + "' id='" + currentModule.name + "'>";
      currentModuleElement += currentModule.description + " [" + currentModule.name + "]";
      currentModuleElement += "</span>";

      if (currentModule.locked) {
        var lockedIcon = "<img style='margin-left: 0.5em; margin-bottom: -0.4em;' src='images/lock.png' width='20' height='20'/>";
        currentModuleElement += lockedIcon;
      }

      currentModuleElement += "</p>";

      wizardPage.append(currentModuleElement);
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
                    "Ezra Project works with bible translation modules provided by <a class='external' href='http://www.crosswire.org/sword'>the SWORD project</a> " +
                    "and the <a class='external' href='http://www.crosswire.org'>CrossWire bible society</a>.<br/><br/>" +
                    "Below you see the list of SWORD repositories published by CrossWire. A repository is an internet storage location that contains a set of bible translation modules. " +
                    "Next to each repository you see the total number of bible translation modules available from that repository.<br/><br/>" +
                    "To install a bible translation module, select at least one repository from the list below. " +
                    "The <i>CrossWire</i> and <i>eBible.org</i> repositories are a good place to start.</p>";

    wizardPage.append(introText);

    repositories = repositories.sort((a, b) => {
      var repoTranslationCountA = this.getRepoTranslationCount(a);
      var repoTranslationCountB = this.getRepoTranslationCount(b);

      if (repoTranslationCountA >= repoTranslationCountB) {
        return -1;
      } else if (repoTranslationCountA < repoTranslationCountB) {
        return 1;
      }

      return 0;
    });

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
                         "You need more information about these repositories?<br/>" +
                         "Have a look at the <a class='external' href='https://wiki.crosswire.org/Official_and_Affiliated_Module_Repositories'>CrossWire Wiki</a>.</p>";

    wizardPage.append(additionalInfo);
    this.bindLabelEvents(wizardPage);
  }

  getRepoTranslationCount(repo) {
    var count = 0;
    var allRepoModules = this._nodeSwordInterface.getAllRepoModules(repo);

    for (var i = 0; i < allRepoModules.length; i++) {
      var module = allRepoModules[i];

      if (ISO6391.validate(module.language)) {
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


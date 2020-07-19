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

const LanguageMapper = require('../helpers/language_mapper.js');
const ModuleWizardHelper = require('./module_wizard_helper.js');

class RemoveModuleWizard {
  constructor() {
    this._helper = new ModuleWizardHelper();
    this._moduleRemovalStatus = 'DONE';
    this.languageMapper = new LanguageMapper();

    var removeButton = $('#remove-modules-button');

    removeButton.bind('click', () => {
      var currentModuleType = bible_browser_controller.install_module_wizard._currentModuleType;

      var modules = bible_browser_controller.translation_controller.getInstalledModules(currentModuleType);
      if (modules.length > 0) {
        this.openRemoveModuleWizard(currentModuleType);
      }
    });
  }

  init(onAllTranslationsRemoved, onTranslationRemoved) {
    this.onAllTranslationsRemoved = onAllTranslationsRemoved;
    this.onTranslationRemoved = onTranslationRemoved;
  }

  openRemoveModuleWizard(moduleType) {
    $('#module-settings-wizard-init').hide();
    this.initRemoveModuleWizard(moduleType);
    $('#module-settings-wizard-remove').show();

    var wizardPage = $('#module-settings-wizard-remove-p-0');
    wizardPage.empty();

    var headerText = "";
    if (moduleType == 'BIBLE') {
      headerText = i18n.t("module-assistant.select-modules-to-be-removed");
    } else if (moduleType == 'DICT') {
      headerText = i18n.t("module-assistant.select-dictionaries-to-be-removed");
    }

    var header = "<p>" + headerText + "</p>";
    wizardPage.append(header);

    var languages = bible_browser_controller.translation_controller.getLanguages(moduleType);

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newLanguageBox = "<div>" +
                           "<h2>" + currentLang.languageName + "</h2>" +
                           "<div id='remove-module-assistant-" + currentLang.languageCode + "-modules'></div>" +
                           "</div>";

      wizardPage.append(newLanguageBox);
    }

    var modules = nsi.getAllLocalModules(moduleType);

    for (var module of modules) {
      var checkboxDisabled = '';
      var currentModuleClass = "class='label' ";
      var fixedDictionaries = [ "StrongsHebrew", "StrongsGreek" ];
      
      if (!nsi.isModuleInUserDir(module.name) ||
          (moduleType == "DICT" && fixedDictionaries.includes(module.name))) {

        checkboxDisabled = "disabled='disabled' ";
        currentModuleClass = "class='label disabled'";
      }

      var currentTranslationHtml = "<p><input type='checkbox'" + checkboxDisabled + ">" + 
                                    "<span " + currentModuleClass + " id='" + module.name + "'>";
      currentTranslationHtml += module.description + " [" + module.name + "]</span></p>";

      var languageBox = $('#remove-module-assistant-' + module.language + '-modules');
      languageBox.append(currentTranslationHtml);
    }

    this._helper.bindLabelEvents(wizardPage);
  }

  initRemoveModuleWizard() {
    if (this._removeModuleWizardOriginalContent != undefined) {
        $('#module-settings-wizard-remove').steps("destroy");
        $('#module-settings-wizard-remove').html(this._removeModuleWizardOriginalContent);
    } else {
        this._removeModuleWizardOriginalContent = $('#module-settings-wizard-remove').html();
    }

    $('.module-settings-wizard-section-header-module-type').html(bible_browser_controller.install_module_wizard._moduleTypeText);

    $('#module-settings-wizard-remove').steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-wizard-remove",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this.removeModuleWizardStepChanging(event, currentIndex, newIndex),
      onStepChanged: (event, currentIndex, priorIndex) => this.removeModuleWizardStepChanged(event, currentIndex, priorIndex),
      onFinishing: (event, currentIndex) => this.removeModuleWizardFinishing(event, currentIndex),
      onFinished: (event, currentIndex) => this.removeModuleWizardFinished(event, currentIndex),
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });
  }

  removeModuleWizardStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == 0 && newIndex == 1) { // Changing from Translations (1) to Removal (2)
      var wizardPage = "#module-settings-wizard-remove-p-0";
      var selectedLanguages = this._helper.getSelectedSettingsWizardElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 1 && newIndex != 1) {
      return false;
    }

    return true;
  }

  async removeModuleWizardStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0) {
      this._helper.lockDialogForAction('module-settings-wizard-remove');

      // Bible modules have been selected
      var modulesPage = "#module-settings-wizard-remove-p-0";
      this._uninstallModules = this._helper.getSelectedSettingsWizardElements(modulesPage);

      this._moduleRemovalStatus = 'IN_PROGRESS';

      var removalPage = $("#module-settings-wizard-remove-p-1");
      removalPage.empty();

      var currentModuleType = bible_browser_controller.install_module_wizard._currentModuleType;
      var removingModules = "";
      if (currentModuleType == 'BIBLE') {
        removingModules = i18n.t("module-assistant.removing-translations");
      } else if (currentModuleType == 'DICT') {
        removingModules = i18n.t("module-assistant.removing-dictionaries");
      }

      removalPage.append('<h3>' + removingModules + '</h3>');

      setTimeout(async () => {
        for (var i = 0; i < this._uninstallModules.length; i++) {
          var moduleCode = this._uninstallModules[i];
          var localModule = nsi.getLocalModule(moduleCode);
          var moduleName = localModule.description;

          removalPage.append('<span>' + i18n.t("module-assistant.removing") + ' <i>' + moduleName + '</i> ... </span>');
          
          await nsi.uninstallModule(moduleCode);

          var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
          if (currentBibleTranslationId == moduleCode) {
            var modules = bible_browser_controller.translation_controller.getInstalledModules('BIBLE');

            if (modules.length > 0) {
              // FIXME: Also put this in a callback
              bible_browser_controller.tab_controller.setCurrentBibleTranslationId(modules[0]);
              bible_browser_controller.onBibleTranslationChanged();
              bible_browser_controller.navigation_pane.updateNavigation();
            } else {
              this.onAllTranslationsRemoved();
            }

            this.onTranslationRemoved();
          }

          removalPage.append('<span>' + i18n.t("general.done") + '.</span>');
          removalPage.append('<br/><br/>');
        }

        this._moduleRemovalStatus = 'DONE';
        this._helper.unlockDialog('module-settings-wizard-remove');
      }, 800);
    }
  }

  removeModuleWizardFinishing(event, currentIndex) {
    return this._moduleRemovalStatus != 'IN_PROGRESS';
  }

  removeModuleWizardFinished(event, currentIndex) {
    $('#module-settings-wizard').dialog('close');
    this._installedTranslations = bible_browser_controller.translation_controller.getInstalledModules('BIBLE');
    bible_browser_controller.translation_controller.initTranslationsMenu();
  }
}

module.exports = RemoveModuleWizard;
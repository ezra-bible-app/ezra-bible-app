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
    this._translationRemovalStatus = 'DONE';
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
    this.initRemoveTranslationWizard(moduleType);
    $('#module-settings-wizard-remove').show();

    var wizardPage = $('#module-settings-wizard-remove-p-0');
    wizardPage.empty();

    var header = "<p>" + i18n.t("module-assistant.select-translations-to-be-removed") + "</p>";
    wizardPage.append(header);

    var languages = bible_browser_controller.translation_controller.getLanguages();

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newLanguageBox = "<div>" +
                           "<h2>" + currentLang.languageName + "</h2>" +
                           "<div id='remove-module-assistant-" + currentLang.languageCode + "-translations'></div>" +
                           "</div>";

      wizardPage.append(newLanguageBox);
    }

    var translations = nsi.getAllLocalModules();

    for (var translation of translations) {
      var checkboxDisabled = '';
      var currentTranslationClass = "class='label' ";
      
      if (!nsi.isModuleInUserDir(translation.name)) {
        checkboxDisabled = "disabled='disabled' ";
        currentTranslationClass = "class='label disabled'";
      }

      var currentTranslationHtml = "<p><input type='checkbox'" + checkboxDisabled + ">" + 
                                    "<span " + currentTranslationClass + " id='" + translation.name + "'>";
      currentTranslationHtml += translation.description + " [" + translation.name + "]</span></p>";

      var languageBox = $('#remove-module-assistant-' + translation.language + '-translations');
      languageBox.append(currentTranslationHtml);
    }

    this._helper.bindLabelEvents(wizardPage);
  }

  initRemoveTranslationWizard() {
    if (this._removeTranslationWizardOriginalContent != undefined) {
        $('#module-settings-wizard-remove').steps("destroy");
        $('#module-settings-wizard-remove').html(this._removeTranslationWizardOriginalContent);
    } else {
        this._removeTranslationWizardOriginalContent = $('#module-settings-wizard-remove').html();
    }

    $('.module-settings-wizard-section-header-module-type').html(bible_browser_controller.install_module_wizard._moduleTypeText);

    $('#module-settings-wizard-remove').steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-wizard-remove",
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

  removeTranslationWizardStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == 0 && newIndex == 1) { // Changing from Translations (1) to Removal (2)
      var wizardPage = "#module-settings-wizard-remove-p-0";
      var selectedLanguages = this._helper.getSelectedSettingsWizardElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 1 && newIndex != 1) {
      return false;
    }

    return true;
  }

  async removeTranslationWizardStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0) {
      this._helper.lockDialogForAction('module-settings-wizard-remove');

      // Bible translations have been selected
      var translationsPage = "#module-settings-wizard-remove-p-0";
      this._uninstallTranslations = this._helper.getSelectedSettingsWizardElements(translationsPage);

      this._translationRemovalStatus = 'IN_PROGRESS';

      var removalPage = $("#module-settings-wizard-remove-p-1");
      removalPage.empty();
      removalPage.append('<h3>' + i18n.t("module-assistant.removing-translations") + '</h3>');
      removalPage.append('<p style="margin-bottom: 2em;">' + i18n.t("module-assistant.removal-takes-time") + '</p>');

      setTimeout(async () => {
        for (var i = 0; i < this._uninstallTranslations.length; i++) {
          var translationCode = this._uninstallTranslations[i];
          var localModule = nsi.getLocalModule(translationCode);
          var translationName = localModule.description;

          removalPage.append('<span>' + i18n.t("module-assistant.removing") + ' <i>' + translationName + '</i> ... </span>');
          
          await nsi.uninstallModule(translationCode);

          var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
          if (currentBibleTranslationId == translationCode) {
            var translations = bible_browser_controller.translation_controller.getInstalledModules();

            if (translations.length > 0) {
              // FIXME: Also put this in a callback
              bible_browser_controller.tab_controller.setCurrentBibleTranslationId(translations[0]);
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

        this._translationRemovalStatus = 'DONE';
        this._helper.unlockDialog('module-settings-wizard-remove');
      }, 800);
    }
  }

  removeTranslationWizardFinishing(event, currentIndex) {
    return this._translationRemovalStatus != 'IN_PROGRESS';
  }

  removeTranslationWizardFinished(event, currentIndex) {
    $('#module-settings-wizard').dialog('close');
    this._installedTranslations = bible_browser_controller.translation_controller.getInstalledModules();
    bible_browser_controller.translation_controller.initTranslationsMenu();
  }
}

module.exports = RemoveModuleWizard;
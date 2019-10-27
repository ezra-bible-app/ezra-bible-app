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

class RemoveTranslationWizard {
  constructor() {
    this._helper = new TranslationWizardHelper();
    this._translationRemovalStatus = 'DONE';
    this.languageMapper = new LanguageMapper();

    var removeButton = $('#remove-bible-translations-button');

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
        
        if (!nsi.isModuleInUserDir(translation.id)) {
          checkboxDisabled = "disabled='disabled' ";
          currentTranslationClass = "class='label disabled'";
        }

        var currentTranslationHtml = "<p><input type='checkbox'" + checkboxDisabled + ">" + 
                                     "<span " + currentTranslationClass + " id='" + translation.id + "'>";
        currentTranslationHtml += translation.name + " [" + translation.id + "]</span></p>";

        var languageBox = $('#remove-translation-wizard-' + translation.languageCode + '-translations');
        languageBox.append(currentTranslationHtml);
      }

      this._helper.bindLabelEvents(wizardPage);
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

  removeTranslationWizardStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == 0 && newIndex == 1) { // Changing from Translations (1) to Removal (2)
      var wizardPage = "#translation-settings-wizard-remove-p-0";
      var selectedLanguages = this._helper.getSelectedSettingsWizardElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 1 && newIndex != 1) {
      return false;
    }

    return true;
  }

  async removeTranslationWizardStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0) {
      this._helper.lockDialogForAction('translation-settings-wizard-remove');

      // Bible translations have been selected
      var translationsPage = "#translation-settings-wizard-remove-p-0";
      var translations = this._helper.getSelectedSettingsWizardElements(translationsPage);

      this._translationRemovalStatus = 'IN_PROGRESS';

      var removalPage = $("#translation-settings-wizard-remove-p-1");
      removalPage.empty();
      removalPage.append('<h3>' + i18n.t("translation-wizard.removing-translations") + '</h3>');
      removalPage.append('<p>' + i18n.t("translation-wizard.removal-takes-time") + '</p>');

      setTimeout(async () => {
        for (var i = 0; i < translations.length; i++) {
          var translationCode = translations[i];
          var translationName = nsi.getModuleDescription(translationCode);

          removalPage.append('<span>' + i18n.t("translation-wizard.removing") + ' <i>' + translationName + '</i> ... </span>');
          
          await nsi.uninstallModule(translationCode);
          await models.BibleTranslation.removeFromDb(translationCode);

          var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
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

        this._translationRemovalStatus = 'DONE';
        this._helper.unlockDialog('translation-settings-wizard-remove');
      }, 800);
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
}

module.exports = RemoveTranslationWizard;
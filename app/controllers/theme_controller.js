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

const Darkmode = require('darkmode-js');

/**
 * The ThemeController contains functions for switching between the standard (light theme)
 * and the dark "night" theme. Whenever the user switches the "night mode" in the options menu, this controller
 * processes the change.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.theme_controller`.
 * 
 * @category Controller
 */
class ThemeController {
  constructor() {
    this.darkMode = null;
  }

  earlyInitNightMode() {
    var useDarkMode = false;

    if (platformHelper.isMacOsMojaveOrLater()) {
      const nativeTheme = require('electron').remote.nativeTheme;

      if (nativeTheme.shouldUseDarkColors) {
        useDarkMode = true;
      }
    } else {
      var settings = require('electron-settings');

      if (settings.get('useNightMode')) {
        useDarkMode = true;
      }
    }

    if (useDarkMode) {
      document.body.classList.add('darkmode--activated');
    }
  }

  initNightMode() {
    if (platformHelper.isMacOsMojaveOrLater()) { // On macOS (from Mojave) we initialize night mode based on the system settings
      const nativeTheme = require('electron').remote.nativeTheme;

      // Set up a listener to react when the native theme has changed
      nativeTheme.on('updated', () => {
        if (nativeTheme.shouldUseDarkColors != app_controller.optionsMenu._nightModeOption.isChecked()) {
          showGlobalLoadingIndicator();

          setTimeout(() => {
            this.toggleDarkModeIfNeeded();
            hideGlobalLoadingIndicator();
          }, 100);
        }
      });

      if (nativeTheme.shouldUseDarkColors != app_controller.optionsMenu._nightModeOption.isChecked()) {
        console.log("Initializing night mode based on system settings ...");
        this.toggleDarkModeIfNeeded();
      }

    } else { // On other systems we initialize night mode based on the application settings

      if (app_controller.settings.has('useNightMode')) {
        var useNightMode = app_controller.settings.get('useNightMode');
    
        if (useNightMode) {
          console.log("Initializing night mode based on app settings ...");
          this.useNightModeBasedOnOption(true);
        }
      }
    }
  }

  toggleDarkModeIfNeeded() {
    if (platformHelper.isMacOsMojaveOrLater()) {
      const nativeTheme = require('electron').remote.nativeTheme;

      if (nativeTheme.shouldUseDarkColors) {
        app_controller.optionsMenu._nightModeOption.enableOption();
      } else {
        app_controller.optionsMenu._nightModeOption.disableOption();
      }

      this.useNightModeBasedOnOption();
    }
  }

  switchToDarkTheme() {
    this.switchToTheme('css/jquery-ui/dark-hive/jquery-ui.css');
    app_controller.notes_controller.setDarkTheme();
  }
  
  switchToRegularTheme() {
    this.switchToTheme('css/jquery-ui/cupertino/jquery-ui.css');
    app_controller.notes_controller.setLightTheme();
  }
  
  switchToTheme(theme) {
    var currentTheme = document.getElementById("theme-css").href;
  
    if (currentTheme.indexOf(theme) == -1) { // Only switch the theme if it is different from the current theme
      document.getElementById("theme-css").href = theme;
    }
  }

  async useNightModeBasedOnOption(force=false) {
    if (force || app_controller.optionsMenu._nightModeOption.isChecked(force)) {
      this.switchToDarkTheme();
    } else {
      this.switchToRegularTheme();
    }

    if (this.darkMode == null) {
      this.darkMode = new Darkmode();
    }

    var nightModeOptionChecked = force ? true : app_controller.optionsMenu._nightModeOption?.isChecked();

    if (nightModeOptionChecked && !this.darkMode.isActivated() ||
        !nightModeOptionChecked && this.darkMode.isActivated()) {
          
      this.darkMode.toggle();
      // We need to repaint all charts, because the label color depends on the theme
      await app_controller.module_search_controller.repaintAllCharts();
    }
  }

  isNightModeUsed() {
    var useNightMode = false;

    if (platformHelper.isMacOsMojaveOrLater()) {
      const nativeTheme = require('electron').remote.nativeTheme;
      useNightMode = nativeTheme.shouldUseDarkColors;
    } else {
      if (app_controller.settings.has('useNightMode')) {
        useNightMode = app_controller.settings.get('useNightMode');
      }
    }

    return useNightMode;
  }
}

module.exports = ThemeController;
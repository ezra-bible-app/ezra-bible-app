/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const Darkmode = require('darkmode-js');
const eventController = require('./event_controller.js');
const UiHelper = require('../helpers/ui_helper.js');

/**
 * The ThemeController contains functions for switching between the standard (light theme)
 * and the dark "night" theme. Whenever the user switches the "night mode" in the options menu, this controller
 * processes the change.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `theme_controller`.
 * 
 * @category Controller
 */
class ThemeController {
  constructor() {
    this.darkMode = null;
    this.uiHelper = new UiHelper();
  }

  async initMacOsEventHandler() {
    const nativeTheme = require('@electron/remote').nativeTheme;

    if (window.nativeThemeHandler == null) {
      // Set up a listener to react when the native theme has changed
      window.nativeThemeHandler = nativeTheme.on('updated', async () => {
        const useSystemTheme = await ipcSettings.get('useSystemTheme', false);

        if (useSystemTheme && nativeTheme.shouldUseDarkColors != app_controller.optionsMenu._nightModeOption.isChecked) {
          uiHelper.showGlobalLoadingIndicator();

          setTimeout(() => {
            this.toggleDarkModeIfNeeded();
            uiHelper.hideGlobalLoadingIndicator();
          }, 100);
        }
      });
    }
  }

  async initNightMode() {
    const isMojaveOrLater = platformHelper.isMacOsMojaveOrLater();
    const useSystemTheme = await ipcSettings.get('useSystemTheme', false);

    if (isMojaveOrLater && useSystemTheme) { // On macOS (from Mojave) we initialize night mode based on the system settings
      this.initMacOsEventHandler();

      const nativeTheme = require('@electron/remote').nativeTheme;

      if (nativeTheme.shouldUseDarkColors != app_controller.optionsMenu._nightModeOption.isChecked) {
        console.log("Initializing night mode based on system settings ...");
        this.toggleDarkModeIfNeeded();
      }

    } else { // On other systems we initialize night mode based on the application settings

      var useNightModeSettingAvailable = await ipcSettings.has('useNightMode');

      if (useNightModeSettingAvailable) {
        var useNightMode = await ipcSettings.get('useNightMode');
    
        if (useNightMode) {
          console.log("Initializing night mode based on app settings ...");
          this.useNightModeBasedOnOption(true);
        }
      }
    }
  }

  async toggleDarkModeIfNeeded() {
    const isMojaveOrLater = platformHelper.isMacOsMojaveOrLater();
    const useSystemTheme = await ipcSettings.get('useSystemTheme');

    if (isMojaveOrLater && useSystemTheme) {
      const nativeTheme = require('@electron/remote').nativeTheme;

      if (nativeTheme.shouldUseDarkColors) {
        app_controller.optionsMenu._nightModeOption.checked = true;
      } else {
        app_controller.optionsMenu._nightModeOption.checked = false;
      }

      this.useNightModeBasedOnOption();
    }
  }

  switchToDarkTheme() {
    this.uiHelper.switchToTheme(document, 'css/jquery-ui/dark-hive/jquery-ui.css');
    eventController.publish('on-theme-changed', 'dark');
  }
  
  switchToRegularTheme() {
    this.uiHelper.switchToTheme(document, 'css/jquery-ui/cupertino/jquery-ui.css');
    eventController.publish('on-theme-changed', 'regular');
  }

  async useNightModeBasedOnOption(force=false) {
    if (force || app_controller.optionsMenu._nightModeOption.isChecked) {
      this.switchToDarkTheme();
    } else {
      this.switchToRegularTheme();
    }

    if (this.darkMode == null) {
      this.darkMode = new Darkmode();
    }

    var nightModeOptionChecked = force ? true : app_controller.optionsMenu._nightModeOption.isChecked;

    if (nightModeOptionChecked && !this.darkMode.isActivated() ||
        !nightModeOptionChecked && this.darkMode.isActivated()) {
          
      this.darkMode.toggle();
      // We need to repaint all charts, because the label color depends on the theme
      await app_controller.verse_statistics_chart.repaintAllCharts();
    }
  }

  async isNightModeUsed() {
    var useNightMode = false;

    const isMojaveOrLater = platformHelper.isMacOsMojaveOrLater();
    const useSystemTheme = await ipcSettings.get('useSystemTheme', false);

    if (isMojaveOrLater && useSystemTheme) {
      const nativeTheme = require('@electron/remote').nativeTheme;
      useNightMode = nativeTheme.shouldUseDarkColors;
    } else {
      var useNightModeSettingAvailable = await ipcSettings.has('useNightMode');

      if (useNightModeSettingAvailable) {
        useNightMode = await ipcSettings.get('useNightMode');
      }
    }

    return useNightMode;
  }
}

module.exports = ThemeController;
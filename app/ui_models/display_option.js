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

class DisplayOption {
  constructor(switchElementId, settingsKey, settingsObject, eventHandler, hideMenuCallback, customSettingsLoader=undefined, enabledByDefault=false) {
    this._switchElementId = switchElementId;
    this._settingsKey = settingsKey;
    this._settingsObject = settingsObject;
    this._eventHandler = eventHandler;
    this._hideMenuCallback = hideMenuCallback;
    this._enabledByDefault = enabledByDefault;
    this._customSettingsLoader = customSettingsLoader;

    $('#' + this._switchElementId).bind('change', async () => {
      await waitUntilIdle();
      this._eventHandler();
      this._hideMenuCallback();
      this._settingsObject.set(this._settingsKey, this.isChecked());
    });

    this.loadOptionFromSettings();
  }

  isChecked(force=false) {
    if (force) {
      return true;
    } else {
      return $('#' + this._switchElementId).prop('checked');
    }
  }

  enableOption() {
    $('#' + this._switchElementId).attr('checked', 'checked');
    $('#' + this._switchElementId).removeAttr('disabled');
    $('#' + this._switchElementId + '-box').addClass('ui-state-active'); 
  }

  disableOption() {
    $('#' + this._switchElementId).removeAttr('checked');
    $('#' + this._switchElementId + '-box').removeClass('ui-state-active');    
  }

  loadOptionFromSettings() {
    var optionValue = this._enabledByDefault;

    if (this._customSettingsLoader !== undefined) {
      optionValue = this.customSettingsLoader();
    } else {
      if (this._settingsObject != null && this._settingsObject.has(this._settingsKey)) {
        optionValue = this._settingsObject.get(this._settingsKey);
      }
    }

    if (optionValue == true) {
      this.enableOption();
    }
  }
}

module.exports = DisplayOption;
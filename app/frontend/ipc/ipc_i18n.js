/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const IpcRenderer = require('./ipc_renderer.js');
const PlatformHelper = require('../../lib/platform_helper.js');

class IpcI18n {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
    this._platformHelper = new PlatformHelper();
    this._isCordova = this._platformHelper.isCordova();
  }

  async getTranslation(language) {
    // Reading the translation file from the disk may take a while on slower/older devices ...
    // That's why we change the default timeout to 10s (instead of just 2s)
    var timeoutMs = 10000;

    if (this._isCordova) console.time('getTranslation');

    var translationObject = await this._ipcRenderer.callWithTimeout('i18n_get_translation', timeoutMs, language);
    
    if (this._isCordova) console.timeEnd('getTranslation');

    return translationObject;
  }
}

module.exports = IpcI18n;
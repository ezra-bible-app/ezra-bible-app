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

const IpcI18n = require('./ipc_i18n.js');

class I18nIpcBackend {
  init(services, backendOptions, i18nextOptions) {
    this._ipcI18n = new IpcI18n();
    this._busy = false;
  }

  async read(language, namespace, callback) {
    try {
      // Without this locking we run into race conditions, because I18Next calls several read functions in parallel!
      while (this._busy) {
        await sleep(20);
      }

      this._busy = true;

      this._ipcI18n.getTranslation(language).then((translationObject) => {
        /* return resources */
        callback(null, translationObject);

        this._busy = false;
      });

    } catch (e) {
      /* if method fails/returns an error, call this: */
      /* callback(truthyValue, null); */

      callback(false, null);

      this._busy = false;
    }
  }
}

I18nIpcBackend.type = 'backend';

module.exports = I18nIpcBackend;
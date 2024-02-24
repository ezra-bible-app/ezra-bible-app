/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const DropboxSync = require('./dropbox_sync.js');

class DropboxSyncFactory {

  static async createDropboxSync() {
    // eslint-disable-next-line no-undef
    let config = ipc.ipcSettingsHandler.getConfig();

    let dropboxToken = config.get('dropboxToken');
    if (dropboxToken == "" || dropboxToken == null) {
      return null;
    }

    const dropboxRefreshToken = config.get('dropboxRefreshToken');
    if (dropboxRefreshToken == "" || dropboxRefreshToken == null) {
      return null;
    }

    const DROPBOX_CLIENT_ID = 'omhgjqlxpfn2r8z';
    let dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);

    try {
      let refreshedAccessToken = await dropboxSync.refreshAccessToken();

      if (refreshedAccessToken == dropboxToken) {
        console.log('Existing Dropbox token valid!');
      } else {
        console.log('Refreshed Dropbox access token!');
        dropboxToken = refreshedAccessToken;
        config.set('dropboxToken', refreshedAccessToken);
      }
    } catch (e) {
      console.log(e);
    }

    return dropboxSync;
  }
}

module.exports = DropboxSyncFactory;

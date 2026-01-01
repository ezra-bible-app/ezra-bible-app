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

const Dropbox = require('dropbox');
const isomorphicFetch = require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const dch = require('./dropbox_content_hasher.js');

class DropboxSync {
  constructor(CLIENT_ID, TOKEN, REFRESH_TOKEN) {
    this._TOKEN = TOKEN;
    this._REFRESH_TOKEN = REFRESH_TOKEN;
    this._CLIENT_ID = CLIENT_ID;

    this._dbxAuth = new Dropbox.DropboxAuth({
      clientId: CLIENT_ID,
      refreshToken: REFRESH_TOKEN,
      accessToken: TOKEN
    });

    this._dbx = new Dropbox.Dropbox({ accessToken: this._TOKEN,
                                      fetch: isomorphicFetch });
  }

  async refreshAccessToken() {
    await this._dbxAuth.checkAndRefreshAccessToken();
    this._TOKEN = this._dbxAuth.getAccessToken();
    this._dbx = new Dropbox.Dropbox({ accessToken: this._TOKEN, 
                                      fetch: isomorphicFetch });
    
    return this._TOKEN;
  }

  async getFolders() {
    let response = await this._dbx.filesListFolder({path: ''});
    let folders = [];

    response.result.entries.forEach((item) => {
      if (item['.tag'] == 'folder') {
        folders.push(item);
      }
    });

    return folders;
  }

  async testAuthentication() {
    await this.getFolders();
  }

  async downloadFile(dropboxPath, destinationDir) {
    return this._dbx.filesDownload({path: dropboxPath}).then((response) => {
      let fileName = response.result.name;
      const destFilePath = path.join(destinationDir, fileName);

      fs.writeFileSync(destFilePath, response.result.fileBinary, (err) => {
        if (err) throw err;
      });
    }).catch((errorResponse) => {
      throw errorResponse;
    });
  }

  async uploadFile(filePath, dropboxPath) {
    const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
    const fileBlob = fs.readFileSync(filePath);

    if ((fileBlob.byteLength) < UPLOAD_FILE_SIZE_LIMIT) {
      return this._dbx.filesUpload({path: dropboxPath, contents: fileBlob, mode: 'overwrite'});
    } else {
      throw new Error(`File ${filePath} is bigger than the Dropbox upload allows!`);
    }
  }

  async syncFileTwoWay(filePath, dropboxPath, prioritizeRemote=false) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} does not exist!`);
      return -5;
    }

    let isSynced = null;
    
    try {
      isSynced = await this.isFileSynced(filePath, dropboxPath);
    } catch (e) {
      console.log(e);
      console.warn(`Could not determine sync status for ${filePath}`);
      return -6;
    }

    let returnValue = null;

    if (isSynced) {

      console.log(`File ${filePath} is already in sync with Dropbox file at ${dropboxPath}. Not doing anything!`);
      returnValue = 0;

    } else {
      console.log(`File ${filePath} is different from file in Dropbox at ${dropboxPath}.`);

      const dropboxFileExisting = await this.isDropboxFileExisting(dropboxPath);
      let dropboxFileNewer = false;

      if (dropboxFileExisting) {
        console.log('Checking which one is newer ...');
        dropboxFileNewer = await this.isDropboxFileNewer(dropboxPath, filePath);
      }

      if (dropboxFileExisting && (dropboxFileNewer || prioritizeRemote)) {
        if (prioritizeRemote) {
          console.log(`We are going to prioritize the remote file ${dropboxPath} and download it!`);
        } else {
          console.log(`The Dropbox file at ${dropboxPath} is newer than the local file at ${filePath}. Downloading the Dropbox file.`);
        }

        try {
          const localFilePath = path.dirname(filePath);
          await this.downloadFile(dropboxPath, localFilePath);
          returnValue = 1;

        } catch (e) {
          console.log(`Got an exception while trying to download the Dropbox file ${dropboxPath} to replace the local file ${filePath}.`);
          console.log(e);
          returnValue = -1;
        }
      } else {
        console.log(`The local file at ${filePath} is newer than the Dropbox file at ${dropboxPath}. Uploading local file to Dropbox.`);

        try {
          await this.uploadFile(filePath, dropboxPath);
          returnValue = 2;

        } catch (e) {
          console.log(`Got an exception while trying to upload local file ${filePath} to Dropbox.`);
          console.log(e);
          returnValue = -2;
        }
      }

      if (await this.isFileSynced(filePath, dropboxPath)) {
        console.log(`Local file ${filePath} in sync with Dropbox file at ${dropboxPath}.`);
      } else {
        console.warn(`Error syncing local file ${filePath} to Dropbox file at ${dropboxPath}`);
        if (returnValue == null) {
          returnValue = -3;
        }

        if (returnValue == 2 || returnValue == -2) {
          // We performed an upload and afterwards the file was detected as not in sync.
          // This indicates that there has been a serious issue while uploading the file.
          // The file on Dropbox may be corrupted.
          returnValue = -4;
        }
      }
    }

    return returnValue;
  }

  async isDropboxFileExisting(dropboxPath) {
    try {
      await this.getFileMetaData(dropboxPath);
      return true;
    } catch (e) {
      if (e.error.error_summary.indexOf('not_found') != -1) {
        return false;
      } else {
        throw e;
      }
    }
  }

  async isDropboxFileNewer(dropboxPath, filePath) {
    if (!fs.existsSync(filePath)) {
      throw Error(`File ${filePath} does not exist!`);
    }

    let remoteMetaData = await this.getFileMetaData(dropboxPath);
    let serverModified = new Date(remoteMetaData.server_modified);
    let localModified = new Date(fs.statSync(filePath).mtime);

    return (serverModified > localModified);
  }

  async isFileSynced(localFilePath, dropboxPath) {
    if (!fs.existsSync(localFilePath)) {
      throw Error(`File ${localFilePath} does not exist!`);
    }

    let localHash = await this.getLocalFileHash(localFilePath);
    let remoteMetaData = null;

    try {
      remoteMetaData = await this.getFileMetaData(dropboxPath);
    } catch (e) {
      console.log(e.error.error_summary);
      if (e.error.error_summary.indexOf('not_found') != -1) {
        remoteMetaData = {};
        remoteMetaData.content_hash = "";
      } else {
        throw e;
      }
    }

    let remoteHash = remoteMetaData.content_hash;

    return localHash === remoteHash;
  }

  async getFileMetaData(dropboxPath) {
    return this._dbx.filesGetMetadata({path: dropboxPath}).then((response) => {
      return response.result;
    }).catch((errorResponse) => {
      throw errorResponse;
    });
  }

  async getLocalFileHash(fileName) {
    const hasher = dch.create();
    const f = fs.createReadStream(fileName);

    return new Promise((resolve, error) => {
      f.on('data', function(buf) {
        hasher.update(buf);
      });

      f.on('end', function(err) {
        var hexDigest = hasher.digest('hex');
        resolve(hexDigest);
      });

      f.on('error', function(err) {
        error("Error reading from file: " + err);
      });
    });
  }
}

module.exports = DropboxSync;

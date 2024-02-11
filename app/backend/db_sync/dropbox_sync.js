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

const Dropbox = require('dropbox');
const isomorphicFetch = require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const dch = require('./dropbox_content_hasher.js');

class DropboxSync {
  constructor(CLIENT_ID, TOKEN, REFRESH_TOKEN=null) {
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

  async getFolders(path='') {
    let response = await this._dbx.filesListFolder({path: path});
    let folders = [];

    response.result.entries.forEach((item) => {
      if (item['.tag'] == 'folder') {
        folders.push(item);
      }
    });

    return folders;
  }

  async getFiles(path='', recursive=true) {
    let response = await this._dbx.filesListFolder({path: path});
    let file_entries = response.result.entries;

    if (recursive) {
      for (let i = 0; i < file_entries.length; i++) {
        if (file_entries[i]['.tag'] == 'folder') {
          let entry_path = file_entries[i]['path_lower'];
          let subdirectoryFiles = await this.getFiles(entry_path);
          file_entries.push(...subdirectoryFiles);
        }
      }
    }

    let filtered_entries = [];
    for (let i = 0; i < file_entries.length; i++) {
      if (file_entries[i]['.tag'] != 'folder') {
        filtered_entries.push(file_entries[i]);
      }
    }

    return filtered_entries;
  }

  async testAuthentication() {
    await this.getFolders();
  }

  async downloadFile(dropboxPath, destinationDir) {
    return this._dbx.filesDownload({path: dropboxPath}).then((response) => {
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir);
      }

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

  async createFolder(dropboxPath) {
    return this._dbx.filesCreateFolderV2({ path: dropboxPath });
  }

  async syncFileTwoWay(filePath, dropboxPath, prioritizeRemote=false, ignoreNonExisting=false) {
    let isSynced = null;

    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} does not exist!`);

      if (!ignoreNonExisting) {
        return -4;
      } else {
        isSynced = false;
      }
    }
    
    if (isSynced == null) {
      try {
        isSynced = await this.isFileSynced(filePath, dropboxPath);
      } catch (e) {
        console.log(e);
        console.warn(`Could not determine sync status for ${filePath}`);
        return -5;
      }
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
        
      if (this.isFileSynced(filePath, dropboxPath)) {
        console.log(`Local file ${filePath} in sync with Dropbox file at ${dropboxPath}.`);
      } else {
        console.warn(`Error syncing local file ${filePath} to Dropbox file at ${dropboxPath}`);
        if (returnValue == null) {
          returnValue = -3;
        }
      }
    }

    return returnValue;
  }

  async isLocalPathDirectory(path) {
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, stats) => {
        if (err) {
          // Handle errors, such as file not found
          reject('Error checking if the path is a directory. Error code: ' + err.code);
        } else {
          resolve(stats.isDirectory());
        }
      });
    });
  }

  async isRemotePathDirectory(remotePath) {
    const parsedPath = path.parse(remotePath);
    const parentDirectory = parsedPath.dir;
    const targetDirectory = parsedPath.name;

    const remoteFoldersWithinPath = await this.getFolders(parentDirectory);

    for (let i = 0; i < remoteFoldersWithinPath.length; i++) {
      let currentFolder = remoteFoldersWithinPath[i];
      let currentFolderName = currentFolder.name;

      if (currentFolderName == targetDirectory) {
        return true;
      }
    }

    return false;
  }

  async syncFolderFromRemoteToLocal(dropboxPath, localPath) {
    if (!fs.existsSync(localPath)) {
      console.warn(`Folder ${localPath} does not exist!`);
      return -4;
    }

    const isLocalPathDirectory = await this.isLocalPathDirectory(localPath);

    if (!isLocalPathDirectory) {
      console.warn(`The path ${localPath} is not a directory!`);
      return -4;
    }

    const isRemotePathExisting = await this.isDropboxFileExisting(dropboxPath);

    if (isRemotePathExisting) {
      const isRemotePathDirectory = await this.isRemotePathDirectory(dropboxPath);

      if (!isRemotePathDirectory) {
        console.warn(`The dropbox path ${dropboxPath} is not a directory!`);
        return -4;
      }
    } else {
      console.log(`The dropbox path ${dropboxPath} does not exist!`);
      return -4;
    }

    // Pre-conditions checked. Let's start the sync.

    const remoteFiles = await this.getFiles(dropboxPath);

    for (let i = 0; i < remoteFiles.length; i++) {
      let currentFile = remoteFiles[i];
      let currentFilePath = currentFile.path_lower.replace(dropboxPath, '');
      let localFilePath = path.join(localPath, currentFilePath);

      await this.syncFileTwoWay(localFilePath, currentFile.path_lower, true, true);
    }
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
      return true;
    }

    let remoteMetaData = await this.getFileMetaData(dropboxPath);
    let serverModified = new Date(remoteMetaData.server_modified);
    let localModified = new Date(fs.statSync(filePath).mtime);

    return (serverModified > localModified);
  }

  async isFileSynced(localFilePath, dropboxPath) {
    if (!fs.existsSync(localFilePath)) {
      return false;
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

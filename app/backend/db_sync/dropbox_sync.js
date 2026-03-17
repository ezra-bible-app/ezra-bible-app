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

// Centralized configuration constants
const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024; // 150 MB
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const DEFAULT_RATE_LIMIT_DELAY_MS = 60000;

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

    this._dbx = new Dropbox.Dropbox({
      clientId: this._CLIENT_ID,
      accessToken: this._TOKEN,
      refreshToken: this._REFRESH_TOKEN,
      fetch: isomorphicFetch
    });
  }

  async refreshAccessToken() {
    await this._dbxAuth.checkAndRefreshAccessToken();
    this._TOKEN = this._dbxAuth.getAccessToken();

    this._dbx = new Dropbox.Dropbox({
      clientId: this._CLIENT_ID,
      accessToken: this._TOKEN,
      refreshToken: this._REFRESH_TOKEN,
      fetch: isomorphicFetch
    });

    return this._TOKEN;
  }

  /**
   * Sleep helper for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable (transient network or server errors)
   * @param {Error} error - The error to check
   * @returns {boolean}
   */
  _isRetryableError(error) {
    // Rate limit error
    if (error.status === 429) {
      return true;
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Network errors
    if (error.code === 'EAI_AGAIN' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND') {
      return true;
    }

    return false;
  }

  /**
   * Get retry delay, respecting rate limit headers if present
   * @param {Error} error - The error response
   * @param {number} attempt - Current attempt number (1-based)
   * @returns {number} - Delay in milliseconds
   */
  _getRetryDelay(error, attempt) {
    // Check for rate limit with retry-after header
    if (error.status === 429) {
      if (error.headers && error.headers['retry-after']) {
        return parseInt(error.headers['retry-after'], 10) * 1000;
      }
      return DEFAULT_RATE_LIMIT_DELAY_MS;
    }

    // Exponential backoff for other retryable errors
    return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  }

  /**
   * Execute an API call with retry logic and exponential backoff
   * @param {Function} apiCall - Async function that performs the API call
   * @param {string} operationName - Name of the operation for logging
   * @param {boolean} trackRetries - Whether to return retry count info
   * @returns {Promise<*>} - Result of the API call (or {result, retryCount} if trackRetries)
   */
  async _withRetry(apiCall, operationName = 'API call', trackRetries = false) {
    let lastError = null;
    let retryCount = 0;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await apiCall();
        if (trackRetries) {
          return { result, retryCount };
        }
        return result;
      } catch (error) {
        lastError = error;

        if (this._isRetryableError(error) && attempt < MAX_RETRIES) {
          retryCount++;
          const delay = this._getRetryDelay(error, attempt);
          console.log(`${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). ` +
                      `Retrying in ${delay}ms... Error: ${error.message || error.status}`);
          await this._sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async getFolders() {
    let response = await this._withRetry(
      () => this._dbx.filesListFolder({path: ''}),
      'filesListFolder'
    );
    let folders = [];

    response.result.entries.forEach((item) => {
      if (item['.tag'] == 'folder') {
        folders.push(item);
      }
    });

    return folders;
  }

  async listFolder(folderPath) {
    let { result: response, retryCount } = await this._withRetry(
      () => this._dbx.filesListFolder({path: folderPath}),
      'filesListFolder',
      true
    );
    let entries = response.result.entries;
    let paginationCalls = 0;
    let totalRetries = retryCount;

    while (response.result.has_more) {
      paginationCalls++;
      const continueResult = await this._withRetry(
        () => this._dbx.filesListFolderContinue({cursor: response.result.cursor}),
        'filesListFolderContinue',
        true
      );
      response = continueResult.result;
      totalRetries += continueResult.retryCount;
      entries = entries.concat(response.result.entries);
    }

    return {
      entries: entries,
      retryCount: totalRetries,
      paginationCalls: paginationCalls
    };
  }

  async testAuthentication() {
    await this.getFolders();
  }

  async downloadFile(dropboxPath, destinationDir) {
    const response = await this._withRetry(
      () => this._dbx.filesDownload({path: dropboxPath}),
      'filesDownload'
    );

    const fileName = response.result.name;
    const destFilePath = path.join(destinationDir, fileName);

    try {
      fs.writeFileSync(destFilePath, response.result.fileBinary);
    } catch (err) {
      throw new Error(`Failed to write downloaded file to ${destFilePath}: ${err.message}`);
    }
  }

  async uploadFile(filePath, dropboxPath) {
    let fileBlob;

    try {
      fileBlob = fs.readFileSync(filePath);
    } catch (err) {
      throw new Error(`Failed to read file ${filePath} for upload: ${err.message}`);
    }

    if (fileBlob.byteLength < UPLOAD_FILE_SIZE_LIMIT) {
      return await this._withRetry(
        () => this._dbx.filesUpload({path: dropboxPath, contents: fileBlob, mode: 'overwrite'}),
        'filesUpload'
      );
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
      let remoteFileLarger = false;

      if (dropboxFileExisting) {
        console.log('Checking which one is newer ...');
        dropboxFileNewer = await this.isDropboxFileNewer(dropboxPath, filePath);

        // Check if remote file is larger than local file
        const remoteMetaData = await this.getFileMetaData(dropboxPath);
        const remoteSize = remoteMetaData.size;
        const localSize = fs.statSync(filePath).size;
        remoteFileLarger = remoteSize > localSize;

        if (remoteFileLarger) {
          console.log(`Remote file (${remoteSize} bytes) is larger than local file (${localSize} bytes). Will prioritize remote.`);
        }
      }

      if (dropboxFileExisting && (dropboxFileNewer || prioritizeRemote || remoteFileLarger)) {
        if (prioritizeRemote) {
          console.log(`We are going to prioritize the remote file ${dropboxPath} and download it!`);
        } else if (remoteFileLarger) {
          console.log(`The remote file is larger than the local file. Downloading the Dropbox file to prevent data loss.`);
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
      // Check if the error has the expected structure
      if (e.error && e.error.error_summary && e.error.error_summary.indexOf('not_found') != -1) {
        return false;
      } else {
        // Network error or other API error - rethrow to abort sync rather than assuming file doesn't exist
        console.error('Error checking if Dropbox file exists (not a "not_found" error):', e);
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
      if (e.error && e.error.error_summary && e.error.error_summary.indexOf('not_found') != -1) {
        console.log(e.error.error_summary);
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
    const response = await this._withRetry(
      () => this._dbx.filesGetMetadata({path: dropboxPath}),
      'filesGetMetadata'
    );
    return response.result;
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

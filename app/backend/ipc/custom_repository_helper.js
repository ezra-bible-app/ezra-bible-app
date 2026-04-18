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

const fs = require('fs');
const path = require('path');

class CustomRepositoryHelper {
  constructor(getNsi, reinitializeNsi) {
    this._getNsi = getNsi;
    this._reinitializeNsi = reinitializeNsi;
  }

  getCustomRepositories() {
    const defaultRepoUrlPathKeys = this._getDefaultRepoUrlPathKeys();
    const installMgrConfContent = this._readInstallMgrConf();
    const lines = installMgrConfContent.split('\n');
    const repos = [];

    for (const line of lines) {
      // The current expected format is something like:
      //   HTTPSource=MyRepo|myrepo.com|/path/to/repo|||20240610120000
      const match = line.match(/^([A-Z]+)Source=(.+)$/);
      if (!match) {
        continue;
      }

      const fields = match[2].split('|');
      const name = fields[0];
      const host = fields[1];
      const repoPath = fields[2];
      const repoUrlPathKey = this._buildRepoUrlPathKey(host, repoPath);

      if (!defaultRepoUrlPathKeys.has(repoUrlPathKey)) {
        repos.push({
          protocol: match[1],
          name: name,
          host: host,
          path: repoPath
        });
      }
    }

    return repos;
  }

  async addCustomRepository(protocol, name, host, repoPath) {
    const nsi = this._getNsi();
    const repoUrlPathKey = this._buildRepoUrlPathKey(host, repoPath);
    if (repoUrlPathKey && this._getDefaultRepoUrlPathKeys().has(repoUrlPathKey)) {
      return { success: false, error: 'duplicate-url-path' };
    }

    if (repoUrlPathKey && this._getCustomRepoUrlPathKeys().has(repoUrlPathKey)) {
      return { success: false, error: 'duplicate-url-path' };
    }

    const existingRepoNames = nsi.getRepoNames();
    if (existingRepoNames.includes(name)) {
      return { success: false, error: 'duplicate-name' };
    }

    const entry = this._buildRepoEntry(protocol, name, host, repoPath);

    // Remove any stale entry with the same name from previous failed attempts before writing.
    let content = this._removeEntryFromConf(this._readInstallMgrConf(), name);
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    content += entry + '\n';
    this._writeInstallMgrConf(content);

    // Reinitialize NSI so the new InstallMgr reads the updated InstallMgr.conf and
    // registers the new source in its in-memory map before updateSingleRepositoryConfig is called.
    this._reinitializeNsi();

    let isSuccessful = false;
    try {
      isSuccessful = await this._getNsi().updateSingleRepositoryConfig(name);
    } catch (e) {
      isSuccessful = false;
    }

    if (!isSuccessful) {
      let rollbackContent = this._removeEntryFromConf(this._readInstallMgrConf(), name);
      this._writeInstallMgrConf(rollbackContent);
      this._reinitializeNsi();
      return { success: false, error: 'invalid-config' };
    }

    return { success: true };
  }

  removeCustomRepository(name) {
    let content = this._readInstallMgrConf();
    content = this._removeEntryFromConf(content, name);
    this._writeInstallMgrConf(content);

    this._reinitializeNsi();

    return { success: true };
  }

  _getInstallMgrConfPath() {
    return path.join(this._getNsi().getSwordPath(), 'InstallMgr', 'InstallMgr.conf');
  }

  _getMasterRepoListPath() {
    return path.join(this._getNsi().getSwordPath(), 'InstallMgr', 'masterRepoList.conf');
  }

  _getDefaultRepoUrlPathKeys() {
    const masterPath = this._getMasterRepoListPath();
    const urlPathKeys = new Set();
    if (!fs.existsSync(masterPath)) {
      return urlPathKeys;
    }

    const lines = fs.readFileSync(masterPath, 'utf8').split('\n');
    for (const line of lines) {
      // Trim the line to handle any trailing whitespace
      const trimmedLine = line.trim();

      // Skip empty lines, comment lines, and section headers
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('[')) {
        continue;
      }

      // Match repository entries in the format:
      // TIMESTAMP=PROTOCOL(Source|PackagePreference)=REPOSITORY_NAME|...
      // Examples:
      //   20220529224400=HTTPSPackagePreference=CrossWire|crosswire.org|/ftpmirror/pub/sword/raw
      //   20081216195754=FTPSource=CrossWire|ftp.crosswire.org|/pub/sword/raw
      //   20090224125400=FTPSource=CrossWire Beta|ftp.crosswire.org|/pub/sword/betaraw
      const match = trimmedLine.match(/^\d+=(?:[A-Z]+Source|[A-Z]+PackagePreference)=([^|]+)\|([^|]*)\|([^|]*)/);
      if (match) {
        const host = match[2];
        const repoPath = match[3];
        const repoUrlPathKey = this._buildRepoUrlPathKey(host, repoPath);
        if (repoUrlPathKey) {
          urlPathKeys.add(repoUrlPathKey);
        }
      }
    }

    return urlPathKeys;
  }

  _getCustomRepoUrlPathKeys() {
    const customRepos = this.getCustomRepositories();
    const urlPathKeys = new Set();

    for (const repo of customRepos) {
      const repoUrlPathKey = this._buildRepoUrlPathKey(repo.host, repo.path);
      if (repoUrlPathKey) {
        urlPathKeys.add(repoUrlPathKey);
      }
    }

    return urlPathKeys;
  }

  _buildRepoUrlPathKey(host, repoPath) {
    if (!host || !repoPath) {
      return null;
    }

    const normalizedHost = String(host).trim().toLowerCase();
    let normalizedPath = String(repoPath).trim();

    if (!normalizedHost || !normalizedPath) {
      return null;
    }

    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }

    normalizedPath = normalizedPath.replace(/\/+$/, '');
    if (!normalizedPath) {
      normalizedPath = '/';
    }

    return `${normalizedHost}|${normalizedPath}`;
  }

  _readInstallMgrConf() {
    const confPath = this._getInstallMgrConfPath();
    if (!fs.existsSync(confPath)) {
      return '';
    }
    return fs.readFileSync(confPath, 'utf8');
  }

  _writeInstallMgrConf(content) {
    const confPath = this._getInstallMgrConfPath();
    fs.writeFileSync(confPath, content, 'utf8');
  }

  _buildRepoEntry(protocol, name, host, repoPath) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const protocolPrefix = protocol.toUpperCase() + 'Source';
    return `${protocolPrefix}=${name}|${host}|${repoPath}|||${date}`;
  }

  _removeEntryFromConf(content, repoName) {
    const lines = content.split('\n');
    const filtered = lines.filter(line => {
      const match = line.match(/^([A-Z]+)Source=(.+?)\|/);
      return !(match && match[2] === repoName);
    });
    return filtered.join('\n');
  }
}

module.exports = CustomRepositoryHelper;
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
const PlatformHelper = require('../../lib/platform_helper.js');

const VINES_MODULE_CODE = 'Vines';

/**
 * VinesHelper provides functionality for indexing and querying the Vine's
 * Expository Dictionary SWORD module by Strong's number.
 * 
 * The Vines module is keyed by English words (e.g. "ARMY", "DAWN"), and each
 * entry may reference multiple Greek Strong's numbers. This helper builds a
 * reverse index mapping each Strong's number to the Vines key(s) that reference it,
 * enabling lookup of Vines content for a given Strong's number.
 * 
 * Only Greek Strong's numbers are supported (Vines covers the Greek NT).
 */
class VinesHelper {
  constructor() {
    this._platformHelper = new PlatformHelper();
    this._indexCache = null;
  }

  _getIndexPath() {
    const userDataDir = this._platformHelper.getUserDataPath();
    return path.join(userDataDir, 'vines-strongs-index.json');
  }

  /**
   * Checks whether the Vines Strong's index exists (in cache or on disk).
   * @returns {boolean}
   */
  indexExists() {
    if (this._indexCache != null) {
      return true;
    }

    const indexPath = this._getIndexPath();
    return fs.existsSync(indexPath);
  }

  /**
   * Builds the Vines Strong's index by iterating all Vines dictionary keys,
   * fetching each entry, and extracting Strong's number references.
   * 
   * The resulting index maps normalized Strong's numbers (e.g. "G3722") to
   * arrays of Vines keys that reference them.
   * 
   * @param {object} nsi - The node-sword-interface instance
   * @param {function} [progressCallback] - Optional callback receiving { totalPercent, message }
   * @returns {object} The generated index
   */
  async buildIndex(nsi, progressCallback) {
    const keys = nsi.getDictModuleKeys(VINES_MODULE_CODE);
    const index = {};

    // Regex to match Strong's references in Vines entries
    // Matches patterns like: Strongs <a href="sword://StrongsRealGreek/03722"
    const strongsRefRegex = /Strongs\s+<a\s+href="sword:\/\/StrongsRealGreek\/0*(\d+)"/g;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const content = nsi.getRawModuleEntry(VINES_MODULE_CODE, key);

      if (!content) {
        continue;
      }

      strongsRefRegex.lastIndex = 0;
      let match;

      while ((match = strongsRefRegex.exec(content)) !== null) {
        const strongsNum = 'G' + parseInt(match[1], 10);

        if (index[strongsNum] == null) {
          index[strongsNum] = [];
        }

        if (!index[strongsNum].includes(key)) {
          index[strongsNum].push(key);
        }
      }

      if (progressCallback) {
        const percent = Math.round(((i + 1) / keys.length) * 100);
        progressCallback({ totalPercent: percent, message: key });
      }
    }

    const indexPath = this._getIndexPath();
    const indexDir = path.dirname(indexPath);

    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    this._indexCache = index;

    return index;
  }

  /**
   * Loads the Vines index from cache or disk.
   * @returns {object|null} The index object or null if not found
   */
  _getIndex() {
    if (this._indexCache != null) {
      return this._indexCache;
    }

    const indexPath = this._getIndexPath();

    if (!fs.existsSync(indexPath)) {
      return null;
    }

    const data = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(data);
    this._indexCache = index;
    return index;
  }

  /**
   * Deletes the Vines Strong's index from cache and disk.
   */
  deleteIndex() {
    this._indexCache = null;

    const indexPath = this._getIndexPath();

    if (fs.existsSync(indexPath)) {
      fs.unlinkSync(indexPath);
    }
  }

  /**
   * Gets the Vines dictionary keys that reference a given Greek Strong's number.
   * 
   * @param {string} strongsKey - The Strong's number (e.g. "G3722")
   * @returns {string[]|null} Array of Vines keys, or null if not found
   */
  getVinesKeysForStrongs(strongsKey) {
    // Vines only covers Greek
    if (!strongsKey || strongsKey[0] !== 'G') {
      return null;
    }

    const index = this._getIndex();
    if (index == null) {
      return null;
    }

    const vinesKeys = index[strongsKey];
    if (!vinesKeys || vinesKeys.length === 0) {
      return null;
    }

    return vinesKeys;
  }
}

module.exports = VinesHelper;

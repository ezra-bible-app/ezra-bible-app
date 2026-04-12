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
const PlatformHelper = require('../lib/platform_helper.js');

class StrongsIndexHelper {
  constructor() {
    this._platformHelper = new PlatformHelper();
    this._indexCache = {};
  }

  _getIndexPath(moduleCode) {
    const userDataDir = this._platformHelper.getUserDataPath();
    return path.join(userDataDir, `strongs-index-${moduleCode.toLowerCase()}.json`);
  }

  /**
   * Normalizes a Strong's number by removing leading zeros.
   * E.g. "H0001" -> "H1", "G0025" -> "G25"
   */
  _normalizeStrongsNumber(strongsNum) {
    const prefix = strongsNum[0];
    const num = parseInt(strongsNum.substring(1), 10);
    return prefix + num;
  }

  _formatIndex(index) {
    const lines = ['{'];
    const keys = Object.keys(index);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const books = index[key];
      const bookEntries = [];

      for (const [book, refs] of Object.entries(books)) {
        bookEntries.push(`      "${book}": ${JSON.stringify(refs)}`);
      }

      lines.push(`  "${key}": {`);
      lines.push(bookEntries.join(',\n'));
      lines.push(i < keys.length - 1 ? '  },' : '  }');
    }

    lines.push('}');
    return lines.join('\n');
  }

  indexExists(moduleCode) {
    if (this._indexCache[moduleCode] != null) {
      return true;
    }

    const indexPath = this._getIndexPath(moduleCode);
    return fs.existsSync(indexPath);
  }

  async generateIndex(moduleCode, nsi, progressCallback) {
    const bookList = nsi.getBookList(moduleCode);
    const index = {};
    const strongsRegex = /strong:([GH]\d+)/g;

    for (let i = 0; i < bookList.length; i++) {
      const bookCode = bookList[i];
      const bookText = nsi.getBookText(moduleCode, bookCode);

      for (let j = 0; j < bookText.length; j++) {
        const verse = bookText[j];
        const content = verse.content;

        let match;
        const seenInVerse = new Set();
        // Reset lastIndex since we reuse the regex
        strongsRegex.lastIndex = 0;

        while ((match = strongsRegex.exec(content)) !== null) {
          const normalizedKey = this._normalizeStrongsNumber(match[1]);

          if (seenInVerse.has(normalizedKey)) {
            continue;
          }

          seenInVerse.add(normalizedKey);

          if (index[normalizedKey] == null) {
            index[normalizedKey] = {};
          }

          if (index[normalizedKey][bookCode] == null) {
            index[normalizedKey][bookCode] = [];
          }

          index[normalizedKey][bookCode].push(`${verse.chapter}:${verse.verseNr}`);
        }
      }

      if (progressCallback) {
        const percent = Math.round(((i + 1) / bookList.length) * 100);
        progressCallback({ totalPercent: percent, message: bookCode });
      }
    }

    const indexPath = this._getIndexPath(moduleCode);
    const indexDir = path.dirname(indexPath);

    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }

    fs.writeFileSync(indexPath, this._formatIndex(index));

    this._indexCache[moduleCode] = index;

    return index;
  }

  getIndex(moduleCode) {
    if (this._indexCache[moduleCode] != null) {
      return this._indexCache[moduleCode];
    }

    const indexPath = this._getIndexPath(moduleCode);

    if (!fs.existsSync(indexPath)) {
      return null;
    }

    const data = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(data);
    this._indexCache[moduleCode] = index;
    return index;
  }

  getOccurrences(moduleCode, strongsKey) {
    const index = this.getIndex(moduleCode);

    if (index == null) {
      return null;
    }

    return index[strongsKey] || {};
  }

  deleteIndex(moduleCode) {
    delete this._indexCache[moduleCode];

    const indexPath = this._getIndexPath(moduleCode);

    if (fs.existsSync(indexPath)) {
      fs.unlinkSync(indexPath);
    }
  }
}

module.exports = StrongsIndexHelper;

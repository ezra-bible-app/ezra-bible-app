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

const crypto = require('crypto');

class GoogleTranslateService {
  constructor(onFailure = undefined, cacheSize = 300) {
    this._onFailure = onFailure;
    this._cacheSize = cacheSize;
    this._cache = new Map();
    this._translateClient = null;
  }

  normalizeLanguageCode(languageCode) {
    if (languageCode == null || languageCode === '') {
      return null;
    }

    const normalized = languageCode.replace('_', '-').trim();
    const languageParts = normalized.split('-');

    if (languageParts.length === 1) {
      return languageParts[0].toLowerCase();
    }

    const firstPart = languageParts[0].toLowerCase();
    const remainingParts = languageParts.slice(1).map((part) => {
      if (part.length === 2) {
        return part.toUpperCase();
      }

      if (part.length === 4) {
        return part[0].toUpperCase() + part.slice(1).toLowerCase();
      }

      return part;
    });

    return [firstPart].concat(remainingParts).join('-');
  }

  getBaseLanguageCode(languageCode) {
    if (languageCode == null || languageCode === '') {
      return null;
    }

    return this.normalizeLanguageCode(languageCode).split('-')[0];
  }

  getCacheKey(sourceLang, targetLang, htmlString) {
    const hash = crypto.createHash('sha1').update(htmlString).digest('hex');
    return `${sourceLang}|${targetLang}|${hash}`;
  }

  getCachedTranslation(cacheKey) {
    if (!this._cache.has(cacheKey)) {
      return null;
    }

    const cachedValue = this._cache.get(cacheKey);
    this._cache.delete(cacheKey);
    this._cache.set(cacheKey, cachedValue);

    return cachedValue;
  }

  setCachedTranslation(cacheKey, translation) {
    this._cache.set(cacheKey, translation);

    if (this._cache.size > this._cacheSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
  }

  getClient() {
    if (this._translateClient == null) {
      const { Translate } = require('@google-cloud/translate').v2;
      this._translateClient = new Translate();
    }

    return this._translateClient;
  }

  shouldSkipTranslation(htmlString, sourceLanguageCode, targetLanguageCode) {
    if (htmlString == null || htmlString === '') {
      return true;
    }

    if (sourceLanguageCode == null || targetLanguageCode == null) {
      return true;
    }

    return sourceLanguageCode === targetLanguageCode;
  }

  async executeTranslateRequest(htmlString, sourceLanguageCode, targetLanguageCode) {
    const translateClient = this.getClient();

    const options = {
      from: sourceLanguageCode,
      to: targetLanguageCode,
      format: 'html'
    };

    const [translatedString] = await translateClient.translate(htmlString, options);
    return translatedString;
  }

  async translateHtml(htmlString, sourceLanguageCode, targetLanguageCode) {
    const normalizedSource = this.normalizeLanguageCode(sourceLanguageCode);
    const normalizedTarget = this.normalizeLanguageCode(targetLanguageCode);

    if (this.shouldSkipTranslation(htmlString, normalizedSource, normalizedTarget)) {
      return htmlString;
    }

    const cacheKey = this.getCacheKey(normalizedSource, normalizedTarget, htmlString);
    const cached = this.getCachedTranslation(cacheKey);

    if (cached != null) {
      return cached;
    }

    try {
      const translated = await this.executeTranslateRequest(htmlString, normalizedSource, normalizedTarget);
      this.setCachedTranslation(cacheKey, translated);
      return translated;
    } catch (error) {
      const sourceBase = this.getBaseLanguageCode(normalizedSource);
      const targetBase = this.getBaseLanguageCode(normalizedTarget);

      if ((sourceBase !== normalizedSource || targetBase !== normalizedTarget) && sourceBase != null && targetBase != null) {
        try {
          const translated = await this.executeTranslateRequest(htmlString, sourceBase, targetBase);
          const baseCacheKey = this.getCacheKey(sourceBase, targetBase, htmlString);
          this.setCachedTranslation(baseCacheKey, translated);
          this.setCachedTranslation(cacheKey, translated);
          return translated;
        } catch (fallbackError) {
          if (this._onFailure !== undefined) {
            this._onFailure(fallbackError);
          }
          return htmlString;
        }
      }

      if (this._onFailure !== undefined) {
        this._onFailure(error);
      }

      return htmlString;
    }
  }
}

module.exports = GoogleTranslateService;

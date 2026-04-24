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

  getSettingsConfig() {
    if (global.ipc && global.ipc.ipcSettingsHandler != null) {
      return global.ipc.ipcSettingsHandler.getConfig();
    }

    if (global.ipcSettingsHandler != null) {
      return global.ipcSettingsHandler.getConfig();
    }

    return null;
  }

  getSettingValue(settingsKey, defaultValue) {
    const config = this.getSettingsConfig();

    if (config == null) {
      return defaultValue;
    }

    return config.get(settingsKey, defaultValue);
  }

  async maybeTranslateStrongsEntry(strongsEntry, sourceLanguageCode, targetLanguageCode) {
    if (strongsEntry == null || strongsEntry.definition == null || strongsEntry.definition === '') {
      return strongsEntry;
    }

    const translatedDefinition = await this.maybeTranslateHtml(strongsEntry.definition, sourceLanguageCode, targetLanguageCode);

    return {
      ...strongsEntry,
      definition: translatedDefinition
    };
  }

  async maybeTranslateHtml(htmlString, sourceLanguageCode, targetLanguageCode) {
    const autoTranslationEnabled = this.getSettingValue('enableAutoTranslation', false);

    if (!autoTranslationEnabled) {
      return htmlString;
    }

    const charCount = htmlString != null ? htmlString.length : 0;
    console.log(`[AutoTranslation] Requesting translation: '${sourceLanguageCode}' -> '${targetLanguageCode}' (${charCount} chars)`);
    return await this.translateHtml(htmlString, sourceLanguageCode, targetLanguageCode);
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

  protectCustomTags(htmlString) {
    const originals = [];

    const replacer = (match, innerText) => {
      const idx = originals.length;
      originals.push(match);
      return `<span translate="no" data-eba-idx="${idx}">${innerText}</span>`;
    };

    let protected_ = htmlString.replace(/<scripref\b[^>]*>([\s\S]*?)<\/scripref>/gi, replacer);
    protected_ = protected_.replace(/<div\b[^>]*class="[^"]*sword-markup[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, replacer);
    protected_ = protected_.replace(/<reference\b[^>]*>([\s\S]*?)<\/reference>/gi, replacer);

    return { protected: protected_, originals };
  }

  restoreCustomTags(htmlString, originals) {
    return htmlString.replace(/<span\b[^>]*data-eba-idx="(\d+)"[^>]*>[\s\S]*?<\/span>/gi, (match, idx) => {
      const original = originals[parseInt(idx, 10)];
      return original !== undefined ? original : match;
    });
  }

  async executeTranslateRequest(htmlString, sourceLanguageCode, targetLanguageCode) {
    const translateClient = this.getClient();

    const options = {
      from: sourceLanguageCode,
      to: targetLanguageCode,
      format: 'html'
    };

    const { protected: protectedHtml, originals } = this.protectCustomTags(htmlString);
    const [translatedString] = await translateClient.translate(protectedHtml, options);
    return this.restoreCustomTags(translatedString, originals);
  }

  async translateHtml(htmlString, sourceLanguageCode, targetLanguageCode) {
    const normalizedSource = this.normalizeLanguageCode(sourceLanguageCode);
    const normalizedTarget = this.normalizeLanguageCode(targetLanguageCode);

    if (this.shouldSkipTranslation(htmlString, normalizedSource, normalizedTarget)) {
      console.log(`[AutoTranslation] Skipping translation (source='${normalizedSource}', target='${normalizedTarget}', empty=${!htmlString})`);
      return htmlString;
    }

    const cacheKey = this.getCacheKey(normalizedSource, normalizedTarget, htmlString);
    const cached = this.getCachedTranslation(cacheKey);

    if (cached != null) {
      console.log(`[AutoTranslation] Cache hit for '${normalizedSource}' -> '${normalizedTarget}'`);
      return cached;
    }

    try {
      console.log(`[AutoTranslation] Calling Google Translate API: '${normalizedSource}' -> '${normalizedTarget}'`);
      const translated = await this.executeTranslateRequest(htmlString, normalizedSource, normalizedTarget);
      console.log(`[AutoTranslation] API call succeeded`);
      this.setCachedTranslation(cacheKey, translated);
      return translated;
    } catch (error) {
      const sourceBase = this.getBaseLanguageCode(normalizedSource);
      const targetBase = this.getBaseLanguageCode(normalizedTarget);

      if ((sourceBase !== normalizedSource || targetBase !== normalizedTarget) && sourceBase != null && targetBase != null) {
        console.log(`[AutoTranslation] API error, retrying with base language codes: '${sourceBase}' -> '${targetBase}'. Error: ${error.message}`);
        try {
          const translated = await this.executeTranslateRequest(htmlString, sourceBase, targetBase);
          console.log(`[AutoTranslation] Fallback API call succeeded`);
          const baseCacheKey = this.getCacheKey(sourceBase, targetBase, htmlString);
          this.setCachedTranslation(baseCacheKey, translated);
          this.setCachedTranslation(cacheKey, translated);
          return translated;
        } catch (fallbackError) {
          console.error(`[AutoTranslation] Fallback API call also failed: ${fallbackError.message}`);
          if (this._onFailure !== undefined) {
            this._onFailure(fallbackError);
          }
          return htmlString;
        }
      }

      console.error(`[AutoTranslation] API call failed: ${error.message}`);
      if (this._onFailure !== undefined) {
        this._onFailure(error);
      }

      return htmlString;
    }
  }
}

module.exports = GoogleTranslateService;

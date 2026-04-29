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
const fs = require('fs');
const path = require('path');
const PlatformHelper = require('../../lib/platform_helper.js');

class TranslationService {
  // Ring-buffer size: ~2 KB average entry × 5000 = ~10 MB on disk
  static MAX_ENTRIES = 5000;

  constructor(onFailure = undefined) {
    this._onFailure = onFailure;
    this._cache = new Map();

    this._platformHelper = new PlatformHelper();
    this._cachePath = path.join(this._platformHelper.getUserDataPath(), 'translation-cache.json');
    this._slots = new Array(TranslationService.MAX_ENTRIES).fill(null);
    this._head = 0;

    this._loadCache();
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

  _loadCache() {
    if (!fs.existsSync(this._cachePath)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this._cachePath, 'utf-8'));
      this._head = data.head || 0;
      this._slots = data.slots || new Array(TranslationService.MAX_ENTRIES).fill(null);

      for (const slot of this._slots) {
        if (slot != null) {
          this._cache.set(slot.k, slot.v);
        }
      }

      console.log(`[AutoTranslation] Loaded ${this._cache.size} entries from persistent cache`);
    } catch (e) {
      console.warn('[AutoTranslation] Failed to load persistent cache, starting fresh:', e.message);
      this._slots = new Array(TranslationService.MAX_ENTRIES).fill(null);
      this._head = 0;
    }
  }

  _persistCache() {
    try {
      fs.writeFileSync(this._cachePath, JSON.stringify({ version: 1, head: this._head, slots: this._slots }, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[AutoTranslation] Failed to persist cache:', e.message);
    }
  }

  getCacheKey(sourceLang, targetLang, htmlString) {
    const hash = crypto.createHash('sha1').update(htmlString).digest('hex');
    return `${sourceLang}|${targetLang}|${hash}`;
  }

  getCachedTranslation(cacheKey) {
    return this._cache.get(cacheKey) ?? null;
  }

  setCachedTranslation(cacheKey, translation) {
    // Evict the oldest slot from the lookup map before overwriting it
    const evicted = this._slots[this._head];
    if (evicted != null) {
      this._cache.delete(evicted.k);
    }

    this._slots[this._head] = { k: cacheKey, v: translation };
    this._cache.set(cacheKey, translation);
    this._head = (this._head + 1) % TranslationService.MAX_ENTRIES;

    this._persistCache();
  }

  static get TRANSLATE_API_URL() {
    return 'https://gcloud-translate-service.vercel.app/api/translate';
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

  async maybeTranslateStrongsEntry(strongsEntry, sourceLanguageCode, targetLanguageCode, meta=null) {
    if (strongsEntry == null || strongsEntry.definition == null || strongsEntry.definition === '') {
      return strongsEntry;
    }

    const translatedDefinition = await this.maybeTranslateHtml(strongsEntry.definition, sourceLanguageCode, targetLanguageCode, meta);

    return {
      ...strongsEntry,
      definition: translatedDefinition
    };
  }

  async maybeTranslateHtml(htmlString, sourceLanguageCode, targetLanguageCode, meta=null) {
    const autoTranslationEnabled = this.getSettingValue('enableAutoTranslation', false);

    if (!autoTranslationEnabled) {
      return htmlString;
    }

    const charCount = htmlString != null ? htmlString.length : 0;
    console.log(`[AutoTranslation] Requesting translation: '${sourceLanguageCode}' -> '${targetLanguageCode}' (${charCount} chars)`);
    return await this.translateHtml(htmlString, sourceLanguageCode, targetLanguageCode, meta);
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

  async executeTranslateRequest(htmlString, sourceLanguageCode, targetLanguageCode, meta=null) {
    const apiSecret = this.getSettingValue('translateApiToken', process.env.TRANSLATE_API_SECRET || '');
    const { protected: protectedHtml, originals } = this.protectCustomTags(htmlString);

    const requestBody = {
      text: protectedHtml,
      target: targetLanguageCode
    };

    if (sourceLanguageCode != null && sourceLanguageCode !== '') {
      requestBody.source = sourceLanguageCode;
    }

    if (meta != null) {
      requestBody.meta = meta;
    }

    const response = await fetch(TranslationService.TRANSLATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(`Translation API error ${response.status}: ${errorText}`);
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    return this.restoreCustomTags(data.translatedText, originals);
  }

  async translateHtml(htmlString, sourceLanguageCode, targetLanguageCode, meta=null) {
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
      const translated = await this.executeTranslateRequest(htmlString, normalizedSource, normalizedTarget, meta);
      console.log(`[AutoTranslation] API call succeeded`);
      this.setCachedTranslation(cacheKey, translated);
      return translated;
    } catch (error) {
      const sourceBase = this.getBaseLanguageCode(normalizedSource);
      const targetBase = this.getBaseLanguageCode(normalizedTarget);

      if ((sourceBase !== normalizedSource || targetBase !== normalizedTarget) && sourceBase != null && targetBase != null) {
        console.log(`[AutoTranslation] API error, retrying with base language codes: '${sourceBase}' -> '${targetBase}'. Error: ${error.message}`);
        try {
          const translated = await this.executeTranslateRequest(htmlString, sourceBase, targetBase, meta);
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

module.exports = TranslationService;

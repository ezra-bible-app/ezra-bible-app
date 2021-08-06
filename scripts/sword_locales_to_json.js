const fetchline = require('nodefetchline');
const fs = require('fs');
const iso6393 = require('iso-639-3');
const i18nController = require('../app/frontend/controllers/i18n_controller.js');


const SWORD_LANGUAGES_URL = "https://crosswire.org/svn/sword/trunk/locales.d/locales.conf";

// https://nodejs.org/dist/latest-v14.x/docs/api/intl.html#intl_detecting_internationalization_support
const hasFullICU = (() => {
  try {
    const ukrainian = new Intl.DisplayNames('uk', { type: 'language', fallback: 'none' });
    return ukrainian.of('en') === 'англійська';
  } catch (err) {
    return false;
  }
})();
console.log(`Running on node version ${process.version}. Full ICU support: ${hasFullICU}`);

parseSwordLocales().then(languages => {
  const allLocales = i18nController.getAvailableLocales();
  for (const code in languages) {
    for (const locale of allLocales) {
      languages[code] = addI18nData(code, locale, languages[code]);
    }
    if (code.length < 4) {
      languages[code] = addIso639Details(code, languages[code]);
    }
  }

  fs.writeFileSync(`lib/languages.json`, JSON.stringify(languages, null, 2));
});
const indexedLangs = getIndexedLangs();




/**
 * Converts SWORD locales.conf to object/JSON:
 * SWORD locale data:
 *   ...
 *   az-Cyrl=Азәрбајҹан
 *   az=Azərbaycan / Азәрбајҹан / آذربایجان
 *   az-Arab=آذربایجان
 *   az.en=Azerbaijani
 *   az-Latn=Azərbaycan
 *   ...
 * will be converted to
 *   "az": {
 *     "name": "Azərbaycan / Азәрбајҹан / آذربایجان",
 *     "en": "Azerbaijani",
 *     "scripts": [ "Cyrl", "Arab", "Latn" ]
 *   }
 * 
 * @returns {Object} Map of languages by code
 */
async function parseSwordLocales() {
  var languages = {};
  var isTextSection = false;

  const lineIterator = fetchline(SWORD_LANGUAGES_URL);
  for await (const line of lineIterator) {
    if (line.trim() == '[Text]') {
      isTextSection = true;
      continue;
    }
    if (!isTextSection || line[0] == '#' || line.trim() == '') {
      continue;
    }

    const data = parseLine(line.trim());
    if (!data) {
      continue;
    }

    languages[data.code] = addDataToMap(languages[data.code] || {}, data.name, data.script, data.locale, data.region);

  }
  return languages;
}

function parseLine(line) {
  const found = line.match(/^(?<code>[a-z0-9]{2,})(?:-(?<script>[a-z]{4}))?(?:-(?<region>[a-z]{2}))?(?:\.(?<locale>[a-z]{2,3}))?=(?<name>.+)$/i);
  if (!found) {
    console.log(`Skipping line: "${line}"`);
    return undefined;
  }
  return {
    code: found.groups.code,
    script: found.groups.script,
    region: found.groups.region,
    locale: found.groups.locale,
    name: found.groups.name,
  };
}

function addDataToMap(langObj, name, script = undefined, locale = undefined, region = undefined) {
  const nameObj = locale ? { [locale]: name } : { 'name': name };
  if (script) {
    if (!langObj.scripts || langObj.scripts && !langObj.scripts.includes(script)) {
      langObj = {
        ...langObj,
        scripts: langObj.scripts ? [...langObj.scripts, script] : [script]
      };
    }
  } else if (region) { // region will be skipped if script is present. So far SWORD data has either script or region present
    langObj = {
      ...langObj,
      regions: {
        ...langObj.regions,
        [region]: nameObj
      }
    };
  } else {
    langObj = { ...langObj, ...nameObj };
  }

  return langObj;
}

function addIso639Details(code, data) {
  if (indexedLangs[code]) {
    return {
      ...indexedLangs[code],
      ...data,
    };
  }
  console.log(`Couldn't find "${code}" in iso639-3 package`);
  return data;
}

function getIndexedLangs() {
  var indexedLangs = {};

  for (const currentLang of iso6393) {
    if (currentLang.iso6391) {
      indexedLangs[currentLang.iso6391] = currentLang;
    } else if (currentLang.iso6393) {
      indexedLangs[currentLang.iso6393] = currentLang;
    }
  }

  return indexedLangs;
}

function addI18nData(code, localeCode, data) {
  // Try to get localized name through standard Internationalization API, requires node >= 14
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/of
  if (hasFullICU) {

    if (code.length >= 2 && code.length <= 3) {
      const languagesInLocale = new Intl.DisplayNames(localeCode, { type: 'language', fallback: 'none' });
      const languageName = languagesInLocale.of(code);
      if (languageName) {
        data[localeCode] = toTitleCase(languageName);
      }
    } else if (code.length == 4) {
      const languageScript = (new Intl.DisplayNames(localeCode, { type: 'script', fallback: 'none' })).of(code);
      if (languageScript) {
        data[localeCode] = languageScript;
      }
    } else {
      console.log(`Non standard language code "${code}" while trying to i18n in "${localeCode}"`);
    }

    if (data.regions) {
      for (const regionCode in data.regions) {
        const languageRegion = (new Intl.DisplayNames(localeCode, { type: 'region', fallback: 'none' })).of(regionCode);
        if (languageRegion) {
          data.regions[regionCode][localeCode] = languageRegion;
        }
      }
    }

  }
  return data;
}

function toTitleCase(str) {
  return str.slice(0, 1).toLocaleUpperCase() + str.slice(1);
}


// export functions for unit testing
module.exports = {
  parseLine,
  addDataToMap,
};
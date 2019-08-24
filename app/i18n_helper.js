const i18n = require('i18next');
const i18nextBackend = require('i18next-node-fs-backend');
const LanguageDetector = require('i18next-electron-language-detector');
const jqueryI18next = require('jquery-i18next');

const i18nextOptions = {
  debug: true,
  backend:{
    // path where resources get loaded from
    loadPath: './locales/{{lng}}/{{ns}}.json',

    // path to post missing resources
    addPath: './locales/{{lng}}/{{ns}}.missing.json',

    // jsonIndent to use when storing json files
    jsonIndent: 2,
  },
  interpolation: {
    escapeValue: false
  },
  saveMissing: true,
  fallbackLng: 'en',
  whitelist: ['en','de'],
  react: {
    wait: false
  }
};

class I18nHelper {
  constructor() {
  }

  async init() {
    await i18n
    .use(LanguageDetector)
    .use(i18nextBackend)
    .init(i18nextOptions);

    jqueryI18next.init(i18n, $, {
      tName: 't', // --> appends $.t = i18next.t
      i18nName: 'i18n', // --> appends $.i18n = i18next
      handleName: 'localize', // --> appends $(selector).localize(opts);
      selectorAttr: 'i18n', // selector for translating elements
      targetAttr: 'i18n-target', // data-() attribute to grab target element to translate (if different than itself)
      optionsAttr: 'i18n-options', // data-() attribute that contains options, will load/set if useOptionsAttr = true
      useOptionsAttr: false, // see optionsAttr
      parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
    });
  }
}

module.exports = I18nHelper;

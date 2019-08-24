const i18n = require('i18next');
const i18nextBackend = require('i18next-node-fs-backend');
const LanguageDetector = require('i18next-electron-language-detector');
const jqueryI18next = require('jquery-i18next');
const NodeSwordInterface = require('node-sword-interface');
const path = require('path');

const i18nextOptions = {
  debug: false,
  backend:{
    // path where resources get loaded from
    loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),

    // path to post missing resources
    addPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.missing.json'),

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
    this._nodeSwordInterface = new NodeSwordInterface();
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

  getSwordTranslation(originalString) {
    return this._nodeSwordInterface.getSwordTranslation(originalString, i18n.language);
  }
}

module.exports = I18nHelper;

/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

/**
 * This module offers sword module related functionality
 * @module sword_module_helper
 * @category Helper
 */

const i18nHelper = require('./i18n_helper.js');
const rtfHelper = require('./rtf_helper.js');

const PUBLIC_LICENSES = ['Public Domain', 'General public license for distribution for any purpose'];

var _moduleVersificationCache = {};
var _cachedModule;

module.exports.getSwordModule = async function(moduleId, isRemote=false, repositoryName=null) {
  if (moduleId == null) {
    return null;
  }

  if (!_cachedModule || _cachedModule.name !== moduleId || (_cachedModule.name === moduleId && _cachedModule.remote !== isRemote)) {
    let swordModule = null;

    try {
      if (isRemote) {
        swordModule = await ipcNsi.getRepoModule(repositoryName, moduleId);
      } else {
        swordModule = await ipcNsi.getLocalModule(moduleId);
      }
      swordModule.remote = isRemote;

      _cachedModule = swordModule;
    } catch (e) {
      console.log(`Could not get ${isRemote ? 'remote' : 'local'} sword module for ${moduleId}`);
    }

  }
  return _cachedModule;
};

module.exports.resetModuleCache = function() {
  _cachedModule = null;
};

module.exports.getModuleDescription = async function(moduleId, isRemote=false, repositoryName=null) {

  const swordModule = await this.getSwordModule(moduleId, isRemote, repositoryName);

  if (!swordModule) {
    return "No info available!";
  }

  var moduleInfo = "";   
  if (isRemote) {
    moduleInfo += "<b>" + swordModule.description + "</b><br><br>";
  }
  moduleInfo += await this.getModuleAbout(swordModule);

  moduleInfo = urlify(moduleInfo);

  return moduleInfo;
};

module.exports.getModuleInfo = async function(moduleId, isRemote=false, includeModuleDescription=true, repositoryName=null) {

  const swordModule = await this.getSwordModule(moduleId, isRemote, repositoryName);

  if (!swordModule) {
    return "No info available!";
  }

  var moduleInfo = "No info available!";

  try {
    
    moduleInfo = "";

    if (includeModuleDescription) {
      moduleInfo += await this.getModuleDescription(moduleId, isRemote, repositoryName);
    }
    
    var yes = i18n.t("general.yes");
    var no = i18n.t("general.no");

    if (includeModuleDescription) {
      moduleInfo += `<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>${i18n.t("general.sword-module-info")}</p>`;
    }

    let lastUpdate = swordModule.lastUpdate;

    if (lastUpdate != "") {
      try {
        lastUpdate = i18nHelper.getLocalizedDate(lastUpdate);
      } catch (e) {
        console.log(e);
      }
    }
    
    // Get version info for current module version
    let versionInfo = '';
    if (swordModule.version) {
      versionInfo = await this.getModuleVersionInfo(moduleId, swordModule.version);
    }

    moduleInfo += "<table>";
    moduleInfo += "<tr><td style='width: 11em;'>" + i18n.t("general.module-name") + ":</td><td>" + swordModule.name + "</td></tr>";
    moduleInfo += "<tr><td>" + i18n.t("general.module-version") + ":</td><td>" + swordModule.version + "</td></tr>";
    
    // Add version info row if available
    if (versionInfo) {
      moduleInfo += "<tr><td>" + i18n.t("general.module-version-info") + ":</td><td>" + versionInfo + "</td></tr>";
    }
    
    moduleInfo += "<tr><td>" + i18n.t("general.module-last-update") + ":</td><td>" + lastUpdate + "</td></tr>";
    moduleInfo += "<tr><td>" + i18n.t("general.module-language") + ":</td><td>" + i18nHelper.getLanguageName(swordModule.language) + "</td></tr>";
    moduleInfo += "<tr><td>" + i18n.t("general.module-license") + ":</td><td>" + swordModule.distributionLicense + "</td></tr>";

    if (swordModule.type == 'Biblical Texts') {
      moduleInfo += "<tr><td>" + i18n.t("general.module-strongs") + ":</td><td>" + (swordModule.hasStrongs ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-headings") + ":</td><td>" + (swordModule.hasHeadings ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-footnotes") + ":</td><td>" + (swordModule.hasFootnotes ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-xrefs") + ":</td><td>" + (swordModule.hasCrossReferences ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-redletter") + ":</td><td>" + (swordModule.hasRedLetterWords ? yes : no) + "</td></tr>";
    }

    moduleInfo += "<tr><td>" + i18n.t("general.module-size") + ":</td><td>" + this.getModuleSize(swordModule) + "</td></tr>";

    if (swordModule.repository != '') {
      moduleInfo += "<tr><td>" + i18n.t("module-assistant.repository_singular") + ":</td><td>" + swordModule.repository + "</td></tr>";
    }

    if (!isRemote) {
      moduleInfo += "<tr><td>" + i18n.t("general.module-location") + ":</td><td>" + swordModule.location + "</td></tr>";
    }

    moduleInfo += "</table>";

    if (isRemote && swordModule.locked && swordModule.unlockInfo != "") {
      moduleInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>" + i18n.t("general.sword-unlock-info") + "</p>";
      moduleInfo += "<p class='external'>" + swordModule.unlockInfo + "</p>";
    }
  } catch (ex) {
    console.error("Got exception while trying to get module info: " + ex);
  }

  return moduleInfo;
};

module.exports.getModuleAbout = async function(swordModuleOrId) {
  var swordModule;
  if (typeof swordModuleOrId === 'string') {
    swordModule = await this.getSwordModule(swordModuleOrId);
  } else {
    swordModule = swordModuleOrId;
  }

  if (!swordModule || !swordModule.about) {
    return '';
  }
  
  const about = `
    <div class="external">
      ${rtfHelper.rtfToHtml(swordModule.about)}
    </div>`;

  return about;
};

module.exports.getModuleSize = function(swordModule) {
  return Math.round(swordModule.size / 1024) + " KB";
};

module.exports.moduleHasStrongs = async function(moduleId) {
  if (moduleId == null) {
    return false;
  }

  const swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.hasStrongs;
  } else {
    return false;
  }
};

module.exports.moduleIsRTL = async function(moduleId) {
  const swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.isRightToLeft;
  } else {
    return false;
  }
};

module.exports.bookHasHeaders = async function(moduleId, book, validate=true) {
  var hasHeaders = false;
  const swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    hasHeaders = swordModule.hasHeadings;

    if (hasHeaders && validate) {
      const headerList = await ipcNsi.getBookHeaderList(moduleId, book);
      if (headerList.length == 0) {
        hasHeaders = false;
      }
    }
  }

  return hasHeaders;
};

module.exports.moduleHasApocryphalBooks = async function(moduleId) {
  return await ipcNsi.moduleHasApocryphalBooks(moduleId);
};

module.exports.getVersification = async function(moduleId) {
  if (moduleId == null) {
    return null;
  }

  if (moduleId in _moduleVersificationCache) {
    return _moduleVersificationCache[moduleId];
  }

  var versification = null;
  var psalm3Verses = [];
  var revelation12Verses = [];

  try {
    psalm3Verses = await ipcNsi.getChapterText(moduleId, 'Psa', 3);
  } catch (e) {
    console.log("sword_module_helper.getVersification: Could not retrieve chapter text for Psalm 3 of " + moduleId);
  }

  try {
    revelation12Verses = await ipcNsi.getChapterText(moduleId, 'Rev', 12);
  } catch (e) {
    console.log("sword_module_helper.getVersification: Could not retrieve chapter text for Revelation 12 of " + moduleId);
  }

  if (psalm3Verses.length == 8 || revelation12Verses.length == 17) { // ENGLISH versification
    versification = "ENGLISH";

  } else if (psalm3Verses.length == 9 || revelation12Verses.length == 18) { // HEBREW versification
    versification = "HEBREW";

  } else { // Unknown versification

    versification = "UNKNOWN";

    /*console.log("Unknown versification!");
    console.log("Psalm 3 has " + psalm3Verses.length + " verses.");
    console.log("Revelation 12 has " + revelation12Verses.length + " verses.");*/
  }

  _moduleVersificationCache[moduleId] = versification;
  return versification;
};

module.exports.getThreeLetterVersification = async function(moduleId) {
  var versification = (await this.getVersification(moduleId) == 'ENGLISH' ? 'eng' : 'heb');
  return versification;
};

module.exports.getModuleLanguage = async function(moduleId) {
  const swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.language;
  } else {
    return false;
  }
};

module.exports.getModuleFullName = async function(moduleId) {
  const swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.description;
  } else {
    return moduleId;
  }
};

module.exports.getModuleCopyright = async function(moduleId) {
  const swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.shortCopyright || swordModule.copyright;
  } else {
    return false;
  }
};

module.exports.getModuleLicense = async function(moduleId) {
  const swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.distributionLicense;
  } else {
    return false;
  }
};

module.exports.isPublicDomain = async function(moduleId) {
  const license = await this.getModuleLicense(moduleId);
  return !license || PUBLIC_LICENSES.includes(license);
};

module.exports.getLanguages = async function(moduleType='BIBLE', localModules=undefined) {
  if (localModules == undefined) {
    localModules = await ipcNsi.getAllLocalModules(moduleType);
  }

  if (localModules == null) {
    return [];
  }
  
  var languages = [];
  var languageCodes = [];

  for (let i = 0; i < localModules.length; i++) {
    const module = localModules[i];
    const languageName = i18nHelper.getLanguageName(module.language);

    if (!languageCodes.includes(module.language)) {
      languages.push({
        'languageName': languageName,
        'languageCode': module.language
      });
      languageCodes.push(module.language);
    }
  }

  return languages;
};

module.exports.isStrongsTranslationAvailable = async function() {
  var allTranslations = await ipcNsi.getAllLocalModules();

  if (allTranslations == null) {
    return false;
  }

  for (var dbTranslation of allTranslations) {
    if (dbTranslation.hasStrongs) {
      return true;
    }
  }

  return false;
};

module.exports.sortModules = function(a,b) {
  const isMobile = platformHelper.isMobile();
  let aDescription = isMobile ? a.name : a.description;
  aDescription = aDescription.toLowerCase();

  let bDescription = isMobile ? b.name : b.description;
  bDescription = bDescription.toLowerCase();

  if (aDescription < bDescription) {
    return -1;
  } else if (aDescription > bDescription) {
    return 1;
  } else {
    return 0;
  }
};

module.exports.getModuleVersionInfo = async function(moduleId, version, getRemoteModule=false) {
  let versionInfo = '';
  
  // Get the repo module to access history
  let module = null;
  
  if (getRemoteModule) {
    module = await ipcNsi.getRepoModule(moduleId);
  } else {
    module = await ipcNsi.getLocalModule(moduleId);
  }

  if (module && module.history) {
    // Find the history entry that matches the module version
    const historyEntry = module.history.find(entry => entry.startsWith(`${version}=`));
    if (historyEntry) {
      // Extract just the text after the version=
      versionInfo = historyEntry.substring(historyEntry.indexOf('=') + 1);
    }
  }
  
  return versionInfo;
};

function makeCharUpperCase(str, index) {
    let newChar = str[index].toUpperCase();

    if (index >= 0 && index < str.length) {
        return str.substring(0, index) + newChar + str.substring(index + 1);
    }

    return str; // Return the original string if index is out of bounds
}

function transformReferenceToOsis(reference) {
  reference = reference.replace(' ', '.');
  reference = reference.replace(':', '.');
  reference = reference.replace('..', '.');

  // Perform some book code corrections
  reference = reference.replace('Ge.', 'Gen.');
  reference = reference.replace('Ex.', 'Exod.');
  reference = reference.replace('Le.', 'Lev.');
  reference = reference.replace('Nu.', 'Num.');
  reference = reference.replace('De.', 'Deut.');
  reference = reference.replace('Jud.', 'Judg.');
  reference = reference.replace('1Ki', '1Kgs');
  reference = reference.replace('2Ki', '2Kgs');
  reference = reference.replace('Pr.', 'Prov.');
  reference = reference.replace('Ec.', 'Eccl.');
  reference = reference.replace('La.', 'Lam.');
  reference = reference.replace('Ne.', 'Neh.');
  reference = reference.replace('Da.', 'Dan.');
  reference = reference.replace('Ho.', 'Hos.');
  reference = reference.replace('Am.', 'Amos.');
  reference = reference.replace('Na.', 'Nah.');
  reference = reference.replace('Mt', 'Matt');
  reference = reference.replace('Mr', 'Mark');
  reference = reference.replace('Lk', 'Luke');
  reference = reference.replace('Lu.', 'Luke.');
  reference = reference.replace('Jn', 'John');
  reference = reference.replace('Ac.', 'Acts.');
  reference = reference.replace('Ro.', 'Rom.');
  reference = reference.replace('Ga.', 'Gal.');
  reference = reference.replace('1Timm', '1Tim');
  reference = reference.replace('Phm', 'Phlm');
  reference = reference.replace('Php', 'Phil');
  reference = reference.replace('Re.', 'Rev.');

  if (reference[0] >= 'a' && reference[0] <= 'z') {
    reference = makeCharUpperCase(reference, 0);
  }

  if (reference[0] >= '1' && reference[0] <= '3' && reference[1] >= 'a' && reference[1] <= 'z') {
    reference = makeCharUpperCase(reference, 1);
  }

  return reference;
}

module.exports.getReferencesFromOsisRef = async function(bibleTranslationId, osisRef) {
  let references = [];

  // Remove Bible: prefix from osisref.
  // This prefix is used in Easton's Bible Dictionary, the International Standard Bible Encyclopedia, ...
  osisRef = osisRef.replace('Bible:', '');

  // We fix weird references that look like this: 1Th 2. 1-20 
  osisRef = osisRef.replace('. ', ':');

  if (osisRef != null) {
    let splittedOsisRef = osisRef.split(' ');

    if (splittedOsisRef.length > 2) {
      // We have gotten an osisRef consisting of multiple references (like joh 1:3-5 joh 1:9 joh 1:14-18)
      
      for (let i = 0; i < splittedOsisRef.length; i+=2) {
        let currentOsisRef = splittedOsisRef[i] + ' ' + splittedOsisRef[i+1];
        let parsedReferences = await this.getReferencesFromIndividualOsisRef(bibleTranslationId, currentOsisRef);

        references.push(...parsedReferences);
      }

    } else {
      references = await this.getReferencesFromIndividualOsisRef(bibleTranslationId, osisRef);
    }
  }

  return references;
}

module.exports.isReferenceValid = async function(bibleTranslationId, osisRef) {
  let splittedOsisRef = osisRef.split('.');

  if (splittedOsisRef.length < 2 || splittedOsisRef.length > 3) {
    return false;
  }

  let book = splittedOsisRef[0];

  let chapter = null;
  let chapterValid = false;

  try {
    chapter = parseInt(splittedOsisRef[1]);

    if (!Number.isNaN(chapter)) {
      chapterValid = true;
    }
  } catch (e) {
    console.log(`WARNING: Could not parse chapter of reference ${osisRef}`);
  }

  let verseValid = false;

  if (splittedOsisRef.length == 3) {
    let verse = null;

    try {
      verse = parseInt(splittedOsisRef[2]);

      if (!Number.isNaN(verse)) {
        verseValid = true;
      }
    } catch (e) {
      console.log(`WARNING: Could not parse verse of reference ${osisRef}`);
    }
  } else {
    verseValid = true;
  }

  let bookValid = await ipcNsi.moduleHasBook(bibleTranslationId, book);
  let referenceValid = bookValid && chapterValid && verseValid;

  if (!referenceValid) {
    console.log(`WARNING: The reference ${osisRef} is not valid (bookValid: ${bookValid}; chapterValid: ${chapterValid}; verseValid: ${verseValid}).`);
  }

  return referenceValid;
};

module.exports.getReferencesFromIndividualOsisRef = async function(bibleTranslationId, osisRef) {
  let references = [];

  if (osisRef != null) {
    osisRef = transformReferenceToOsis(osisRef);

    if (osisRef.indexOf('-') != -1) {
      // We have gotten a range (like Gal.1.15-Gal.1.16)
      // We need to first turn into a list of individual references using node-sword-interface
      let referenceList = await ipcNsi.getReferencesFromReferenceRange(osisRef);

      for (let i = 0; i < referenceList.length; i++) {
        let ref = referenceList[i];
        ref = transformReferenceToOsis(ref);

        if (await this.isReferenceValid(bibleTranslationId, ref)) {
          references.push(ref);
        }
      }

    } else if (osisRef.indexOf(',') != -1) {
      // We have gotten a list of non-contiguous verses (like Ps 32.5,7)

      // First split with chapter/verse separator
      let splittedOsisRef = osisRef.split('.');
      let verseList = splittedOsisRef.pop();

      // Now split the verses
      let verses = verseList.split(',');

      // Now build several individual osisRefs based on the verse list
      for (let i = 0; i < verses.length; i++) {
        let currentRef = splittedOsisRef.join('.') + '.' + verses[i];
        currentRef = transformReferenceToOsis(currentRef);

        if (await this.isReferenceValid(bibleTranslationId, currentRef)) {
          references.push(currentRef);
        }
      }

    } else {
      // We have got one single verse reference
      osisRef = transformReferenceToOsis(osisRef);
      if (await this.isReferenceValid(bibleTranslationId, osisRef)) {
        references.push(osisRef);
      }
    }
  }

  return references;
};

module.exports.getReferencesFromScripRef = async function(referenceString, book, chapter) {
  const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  const xrefs = [];

  // We fix weird references that look like this: 1Thes 2:9,10,
  referenceString = referenceString.replace(', ', ';');

  const references = referenceString.split(';');

  for (let i = 0; i < references.length; i++) {
    let currentReference = references[i].trim();

    if (currentReference.indexOf(' ') == -1) {

      if (currentReference.indexOf(':') == -1) {
        // Add the chapter if it is missing
        currentReference = chapter + ':' + currentReference;
      }

      // Reference does not contain a space and is therefore missing a book. We need to add the book in front of the reference.
      currentReference = book + ' ' + currentReference;

      currentReference = transformReferenceToOsis(currentReference);
      let splitOsisRefs = await this.getReferencesFromOsisRef(bibleTranslationId, currentReference);
      xrefs.push(...splitOsisRefs);
    } else {
      // Reference contains a space

      book = currentReference.split(' ')[0];

      // Remove any dot that may appear at the end of the book
      book = book.replace('.', '');

      currentReference = transformReferenceToOsis(currentReference);
      let splitOsisRefs = await this.getReferencesFromOsisRef(bibleTranslationId, currentReference);
      xrefs.push(...splitOsisRefs);
    }
  }

  return xrefs;
};

function urlify(text) {
  // replace urls in text with <a> html tag
  var aTagRegex = /(<a href.*?>.*?<\/a>)/g;
  var aSplits = text.split(aTagRegex);

  // regex extracted from https://www.codegrepper.com/code-examples/whatever/use+regex+to+get+urls+from+string
  // eslint-disable-next-line no-useless-escape
  var urlRegex = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/igm;

  var cleanedText = "";

  for (let index = 0; index < aSplits.length; index++) {
    var split = aSplits[index];

    if (split.substring(0, 2) === '<a') {
      cleanedText += split;
    } else {
      cleanedText += split.replace(urlRegex, function (url) {
        if (url.startsWith('www')) {
          url = 'http://' + url;
        }

        return `<a href="${url}" target="_blank">${url}</a>`;
      });
    }
  }

  return cleanedText;
}

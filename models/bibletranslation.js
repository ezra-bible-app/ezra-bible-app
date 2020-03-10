/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

var bookMap = {
  "Gen"    : 1,
  "Exod"   : 2,
  "Lev"    : 3,
  "Num"    : 4,
  "Deut"   : 5,
  "Josh"   : 6,
  "Judg"   : 7,
  "Ruth"   : 8,
  "1Sam"   : 9,
  "2Sam"   : 10,
  "1Kgs"   : 11,
  "2Kgs"   : 12,
  "1Chr"   : 13,
  "2Chr"   : 14,
  "Ezra"   : 15,
  "Neh"    : 16,
  "Esth"   : 17,
  "Job"    : 18,
  "Ps"     : 19,
  "Prov"   : 20,
  "Eccl"   : 21,
  "Song"   : 22,
  "Isa"    : 23,
  "Jer"    : 24,
  "Lam"    : 25,
  "Ezek"   : 26,
  "Dan"    : 27,
  "Hos"    : 28,
  "Joel"   : 29,
  "Amos"   : 30,
  "Obad"   : 31,
  "Jonah"  : 32,
  "Mic"    : 33,
  "Nah"    : 34,
  "Hab"    : 35,
  "Zeph"   : 36,
  "Hag"    : 37,
  "Zech"   : 38,
  "Mal"    : 39,
  "Matt"   : 40,
  "Mark"   : 41,
  "Luke"   : 42,
  "John"   : 43,
  "Acts"   : 44,
  "Rom"    : 45,
  "1Cor"   : 46,
  "2Cor"   : 47,
  "Gal"    : 48,
  "Eph"    : 49,
  "Phil"   : 50,
  "Col"    : 51,
  "1Thess" : 52,
  "2Thess" : 53,
  "1Tim"   : 54,
  "2Tim"   : 55,
  "Titus"  : 56,
  "Phlm"   : 57,
  "Heb"    : 58,
  "Jas"    : 59,
  "1Pet"   : 60,
  "2Pet"   : 61,
  "1John"  : 62,
  "2John"  : 63,
  "3John"  : 64,
  "Jude"   : 65,
  "Rev"    : 66 
};

'use strict';
module.exports = (sequelize, DataTypes) => {
  var BibleTranslation = sequelize.define('BibleTranslation', {
    name: DataTypes.STRING,
    repository: DataTypes.STRING,
    languageCode: DataTypes.STRING,
    languageName: DataTypes.STRING,
    isFree: DataTypes.BOOLEAN,
    hasStrongs: DataTypes.BOOLEAN,
    versification: DataTypes.ENUM('ENGLISH', 'HEBREW')
  }, {
    timestamps: false
  });

  BibleTranslation.getLanguages = function() {
    var localModules = nsi.getAllLocalModules();
    
    var languages = [];
    var languageCodes = [];

    var languageMapper = new LanguageMapper();

    for (var i = 0; i < localModules.length; i++) {
      var module = localModules[i];
      var languageName = languageMapper.getLanguageName(module.language);

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

  BibleTranslation.getTranslations = async function() {
    var localModules = nsi.getAllLocalModules();
    var translations = [];

    for (var i = 0; i < localModules.length; i++) {
      translations.push(localModules[i].name);
    }

    return translations;
  };

  BibleTranslation.getName = async function(id) {
    var localModule = nsi.getLocalModule(id);

    if (localModule != null) {
      return localModule.description;
    } else {
      return null;
    }
  };

  BibleTranslation.importSwordTranslation = async function(translationCode, modelsInstance=undefined) {
    var reImport = false;
    
    if (modelsInstance === undefined) {
      modelsInstance = models;
    } else {
      reImport = true;
    }

    var module = nsi.getLocalModule(translationCode);

    var languageMapper = new LanguageMapper();
    var languageName = languageMapper.getLanguageName(module.language);

    if (!reImport) {
      var translation = await modelsInstance.BibleTranslation.create({
        id: translationCode,
        name: module.description,
        languageCode: module.language,
        languageName: languageName,
        isFree: 1,
        hasStrongs: module.hasStrongs,
        versification: "ENGLISH"
      });
    }

    if (!reImport) {
      await modelsInstance.BibleTranslation.updateVersification(translationCode);
    }
  };

  BibleTranslation.removeFromDb = async function(translationCode) {
    await models.BibleTranslation.destroy({
      where: {
        id: translationCode
      }
    });
  };

  BibleTranslation.updateVersification = async function(translationCode) {
    models.BibleTranslation.findByPk(translationCode).then(translation => {
      translation.updateVersification();
    });
  };

  BibleTranslation.swordBooktoEzraBook = function(swordBook) {
    return bookMap[swordBook];
  };

  BibleTranslation.prototype.getVersificationPostfix = function() {
    var versificationPostfix = "Eng";
    if (this.versification == 'HEBREW') {
      versificationPostfix = "Heb";
    }

    return versificationPostfix;
  };

  // This function tests the versification by checking passages in Psalms and Revelation that
  // are having different numbers of verses in English and Hebrew versification
  BibleTranslation.prototype.updateVersification = async function() {
    var psalm3Verses = nsi.getChapterText(this.id, 'Psa', 3);
    var revelation12Verses = nsi.getChapterText(this.id, 'Rev', 12);

    if (psalm3Verses.length == 8 || revelation12Verses.length == 17) { // ENGLISH versification
      this.versification = "ENGLISH";
      console.log("Updated versification of " + this.id + " to ENGLISH!");

    } else if (psalm3Verses.length == 9 || revelation12Verses.length == 18) { // HEBREW versification
      this.versification = "HEBREW";
      console.log("Updated versification of " + this.id + " to HEBREW!");

    } else { // Unknown versification
      console.log("Unknown versification!");
      console.log("Psalm 3 has " + psalm3Verses.length + " verses.");
      console.log("Revelation 12 has " + revelation12Verses.length + " verses.");
    }

    await this.save();
  };

  return BibleTranslation;
};

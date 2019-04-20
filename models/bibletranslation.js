/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

const NodeSwordInterface = require('node-sword-interface');
const ISO6391 = require('iso-639-1');

'use strict';
module.exports = (sequelize, DataTypes) => {
  var BibleTranslation = sequelize.define('BibleTranslation', {
    name: DataTypes.STRING,
    language: DataTypes.STRING,
    isFree: DataTypes.BOOLEAN,
    versification: DataTypes.ENUM('ENGLISH', 'HEBREW')
  }, {
    timestamps: false
  });

  BibleTranslation.associate = function(models) {
    BibleTranslation.hasMany(models.Verse);
  };

  BibleTranslation.getLanguages = async function() {
    var query = "SELECT * FROM BibleTranslations ORDER BY language ASC";
    var translations = await sequelize.query(query, { model: models.BibleTranslation });
    var languages = [];

    for (var i = 0; i < translations.length; i++) {
      if (!languages.includes(translations[i].language)) {
        languages.push(translations[i].language);
      }
    }

    return languages;
  };

  BibleTranslation.getTranslations = async function() {
    var query = "SELECT id FROM BibleTranslations ORDER BY language ASC";
    var translationRecords = await sequelize.query(query, { model: models.BibleTranslation });
    var translations = [];

    for (var i = 0; i < translationRecords.length; i++) {
      translations.push(translationRecords[i].id);
    }

    return translations;
  };

  BibleTranslation.getName = async function(id) {
    var query = "SELECT name FROM BibleTranslations WHERE id='" + id + "'";
    var translationRecords = await sequelize.query(query, { model: models.BibleTranslation });

    if (translationRecords.length > 0) {
      return translationRecords[0].name;
    } else {
      return null;
    }
  };

  BibleTranslation.importSwordTranslation = async function(translationCode) {
    var nodeSwordInterface = new NodeSwordInterface();
    var bibleText = nodeSwordInterface.getBibleText(translationCode);
    if (bibleText.length == 0) {
      console.log("ERROR: Bible text for " + translationCode + " has 0 verses!");
    }

    var importVerses = [];
    var lastBook = "";
    var absoluteVerseNr = 1;

    for (var i = 0; i < bibleText.length; i++) {
      var inputVerse = bibleText[i];
      var reference = inputVerse.split('|')[0];
      var book = reference.split(' ')[0];
      var verseReference = reference.split(' ')[1];
      var chapter = verseReference.split(':')[0];
      var verseNr = verseReference.split(':')[1];
      var verseContent = inputVerse.split('|')[1];
      
      if (book != lastBook) {
        absoluteVerseNr = 1;
      } else {
        absoluteVerseNr += 1;
      }

      var verseObject = {};
      verseObject['chapter'] = chapter;
      verseObject['verseNr'] = verseNr;
      verseObject['content'] = verseContent;
      verseObject['bibleBookId'] = models.BibleTranslation.swordBooktoEzraBook(book);
      verseObject['bibleTranslationId'] = translationCode;
      verseObject['absoluteVerseNr'] = absoluteVerseNr;

      importVerses.push(verseObject);
      lastBook = book;
    }

    var module = nodeSwordInterface.getLocalModule(translationCode);

    var translation = await models.BibleTranslation.create({
      id: translationCode,
      name: module.description,
      language: ISO6391.getName(module.language),
      isFree: 1,
      versification: "ENGLISH"
    });

    await models.Verse.bulkCreate(importVerses);
  };

  BibleTranslation.removeFromDb = async function(translationCode) {
    await models.Verse.destroy({
      where: {
        bibleTranslationId: translationCode
      }
    });

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
    var psalm3Query = "SELECT * FROM Verses v INNER JOIN BibleBooks b ON " +
                      " b.id = v.bibleBookId" +
                      " WHERE v.bibleTranslationId='" + this.id + "'" +
                      " AND b.shortTitle='Psa'" +
                      " AND v.chapter=3";

    var revelationQuery = "SELECT * FROM Verses v INNER JOIN BibleBooks b ON " +
                          " b.id = v.bibleBookId" +
                          " WHERE v.bibleTranslationId='" + this.id + "'" +
                          " AND b.shortTitle='Rev'" +
                          " AND v.chapter=12";

    var psalm3Verses = await sequelize.query(psalm3Query, { model: models.Verse });
    var revelation12Verses = await sequelize.query(revelationQuery, { model: models.Verse });

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

  BibleTranslation.getBookList = async function(translationCode) {
    var booklistQuery = "SELECT b.* FROM Verses v INNER JOIN BibleBooks b " +
                        " ON v.bibleBookId = b.id " +
                        " WHERE bibleTranslationId='" + translationCode + "'" +
                        " GROUP BY bibleBookId";
    var books = await sequelize.query(booklistQuery, { model: models.BibleBook });
    var bookList = [];

    for (var i = 0; i < books.length; i++) {
      if (!bookList.includes(books[i].shortTitle)) {
        bookList.push(books[i].shortTitle);
      }
    }

    return bookList;
  };

  return BibleTranslation;
};

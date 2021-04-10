/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

/* NOTE
   This model is only needed by database migrations (folder migrations).
   The actual application code does not depend on this model any longer
   since Ezra Bible App 0.12.0 was released (2020-03-17).
*/

'use strict';
module.exports = (sequelize, DataTypes) => {
  var Verse = sequelize.define('Verse', {
    chapter: DataTypes.INTEGER,
    verseNr: DataTypes.INTEGER,
    content: DataTypes.STRING,
    absoluteVerseNr: DataTypes.INTEGER,
    bibleBookId: DataTypes.INTEGER,
    bibleTranslationId: DataTypes.STRING(5),
    verseReferenceId: DataTypes.INTEGER,
    bibleBookShortTitle: DataTypes.VIRTUAL,
    bibleBookLongTitle: DataTypes.VIRTUAL
  }, {
    timestamps: false
  });

  /*Verse.associate = function(models) {
  };*/

  Verse.findByTagIds = function(bibleTranslationId, tagIds) {
    return models.BibleTranslation.findByPk(bibleTranslationId).then(bibleTranslation => {
      var versificationPostfix = bibleTranslation.getVersificationPostfix();

      var query = "SELECT v.*, " +
                  " b.shortTitle as bibleBookShortTitle, " +
                  " b.longTitle AS bibleBookLongTitle," +
                  " vr.id AS verseReferenceId" +
                  " FROM Verses v" +
                  " INNER JOIN BibleBooks b ON" +
                  " v.bibleBookId = b.id" +
                  " INNER JOIN VerseReferences vr ON" +
                  " vr.absoluteVerseNr" + versificationPostfix + "=v.absoluteVerseNr" +
                  " AND vr.bibleBookId=v.bibleBookId" +
                  " INNER JOIN VerseTags vt ON" +
                  " vt.verseReferenceId = vr.id" +
                  " WHERE v.bibleTranslationId='" + bibleTranslationId + "'" +
                  " AND vt.tagId IN (" + tagIds + ")" +
                  " ORDER BY v.absoluteVerseNr ASC";

      return sequelize.query(query, { model: models.Verse });
    });
  };

  Verse.findBySearchResult = function(bibleTranslationId, searchResult) {
    return models.BibleTranslation.findByPk(bibleTranslationId).then(bibleTranslation => {
      var versificationPostfix = bibleTranslation.getVersificationPostfix();
      var bibleBookId = models.BibleTranslation.swordBooktoEzraBook(searchResult.bibleBookShortTitle);

      var query = "SELECT v.*, " +
                  " b.shortTitle as bibleBookShortTitle, " +
                  " b.longTitle AS bibleBookLongTitle, " +
                  " vr.id AS verseReferenceId" +
                  " FROM Verses v" +
                  " INNER JOIN BibleBooks b ON" +
                  " v.bibleBookId = b.id" +
                  " LEFT JOIN VerseReferences vr ON" +
                  " vr.absoluteVerseNr" + versificationPostfix + "=v.absoluteVerseNr" +
                  " AND vr.bibleBookId=v.bibleBookId" +
                  " WHERE v.bibleTranslationId='" + bibleTranslationId + "'" +
                  " AND v.bibleBookId=" + bibleBookId + 
                  " AND v.chapter='" + searchResult.chapter + "'" +
                  " AND v.verseNr='" + searchResult.verseNr + "'" + " LIMIT 1";

      return sequelize.query(query, { model: models.Verse, raw: true, plain: true });
    });
  };

  Verse.findByAbsoluteVerseNr = function(bibleTranslationId, bibleBookId, absoluteVerseNr) {
    return models.BibleTranslation.findByPk(bibleTranslationId).then(bibleTranslation => {
      var versificationPostfix = bibleTranslation.getVersificationPostfix();

      var query = "SELECT v.*, " +
                  " b.shortTitle as bibleBookShortTitle, " +
                  " b.longTitle AS bibleBookLongTitle, " +
                  " vr.id AS verseReferenceId" +
                  " FROM Verses v" +
                  " INNER JOIN BibleBooks b ON" +
                  " v.bibleBookId = b.id" +
                  " LEFT JOIN VerseReferences vr ON" +
                  " vr.absoluteVerseNr" + versificationPostfix + "=v.absoluteVerseNr" +
                  " AND vr.bibleBookId=v.bibleBookId" +
                  " WHERE v.bibleTranslationId='" + bibleTranslationId + "'" +
                  " AND v.bibleBookId=" + bibleBookId +
                  " AND v.absoluteVerseNr=" + absoluteVerseNr + " LIMIT 1";

      return sequelize.query(query, { model: models.Verse, raw: true, plain: true });
    });
  };

  Verse.prototype.getBibleTranslation = function() {
    return models.BibleTranslation.findByPk(this.bibleTranslationId);
  };

  Verse.prototype.getBibleBook = function() {
    return models.BibleBook.findByPk(this.bibleBookId);
  };

  Verse.prototype.getVerseReference = function() {
    return this.getBibleTranslation().then(bibleTranslation => {
      var versificationPostfix = bibleTranslation.getVersificationPostfix();

      var query = "SELECT * FROM VerseReferences vr WHERE vr.absoluteVerseNr" + versificationPostfix + "=" + this.absoluteVerseNr +
                  " AND vr.bibleBookId = " + this.bibleBookId + " LIMIT 1";

      return sequelize.query(query, { model: models.VerseReference }).then(results => {
        return results[0];
      });
    });
  };

  Verse.prototype.getAbsoluteVerseNrs = function() {
    return this.getBibleBook().then(bibleBook => {
      return this.getBibleTranslation().then(bibleTranslation => {
        var absoluteVerseNrEng = null;
        var absoluteVerseNrHeb = null;

        if (bibleTranslation.versification == 'ENGLISH') {
          absoluteVerseNrEng = this.absoluteVerseNr;
          absoluteVerseNrHeb = this.getAbsoluteVerseNrHebFromEng(bibleBook.shortTitle, absoluteVerseNrEng);
        } else if (bibleTranslation.versification == 'HEBREW') {
          absoluteVerseNrHeb = this.absoluteVerseNr;
          absoluteVerseNrEng = this.getAbsoluteVerseNrEngFromHeb(bibleBook.shortTitle, absoluteVerseNrHeb);
        }

        return {
          "absoluteVerseNrEng": absoluteVerseNrEng,
          "absoluteVerseNrHeb": absoluteVerseNrHeb
        };
      });
    });
  };

  Verse.prototype.findOrCreateVerseReference = function() {
    return this.getAbsoluteVerseNrs().then(absoluteVerseNrs => {
      var newVerseReference = {
        bibleBookId: this.bibleBookId,
        chapter: this.chapter,
        verseNr: this.verseNr,
        absoluteVerseNrEng: absoluteVerseNrs["absoluteVerseNrEng"],
        absoluteVerseNrHeb: absoluteVerseNrs["absoluteVerseNrHeb"]
      };

      return this.getVerseReference().then(verseReference => {
        if (verseReference == undefined) {
          return models.VerseReference.create(newVerseReference).then(() => {
            // TODO: Update the verse reference also for the corresponding verses of all other bible translations
            return this.getVerseReference();
          });
        } else {
          return verseReference;
        }
      });
    });
  };

  Verse.prototype.getAbsoluteVerseNrHebFromEng = function(bibleBookShortTitle, absoluteVerseNrEng) {
    var offset = this.getOffsetForVerseReference(bibleBookShortTitle);
    var absoluteVerseNrHeb = absoluteVerseNrEng + offset;
    return absoluteVerseNrHeb;
  };

  Verse.prototype.getAbsoluteVerseNrEngFromHeb = function(bibleBookShortTitle, absoluteVerseNrHeb) {
    var offset = this.getOffsetForVerseReference(bibleBookShortTitle);
    var absoluteVerseNrEng = absoluteVerseNrHeb - offset;
    return absoluteVerseNrEng;
  };

  Verse.prototype.getOffsetForVerseReference = function(bibleBookShortTitle) {
    var offset_tables = this.getOffsetTables();

    var offset = 0
    var offset_table = offset_tables[bibleBookShortTitle]

    if (offset_table != undefined) {
      for (var i = 0; i < offset_table.length; i++) {
          var currentSection = offset_table[i];
          
          if (this.isInVerseRange(currentSection['start'], currentSection['end'])) {
            offset = currentSection['offset'];
            break;
          }
      }
    }

    return offset;
  };

  Verse.prototype.getOffsetTables = function() {
    // The following mapping tables define offsets for various books.
    // The defined offsets are always from the perspective of the ENGLISH versification compared to the HEBREW versification

    var offset_table_1_samuel = [
      { 'start'   : '21:1',
        'end'     : '26:25',
        'offset'  : +1
      }
    ];

    var offset_table_1_kings = [
      { 'start'   : '22:44',
        'end'     : '22:54',
        'offset'  : +1
      }
    ];

    var offset_table_2_kings = [
      { 'start'  : '15:39',
        'end'    : '25:30',
        'offset' : +1
      }
    ];

    var offset_table_1_chronicles = [
      { 'start'  : '12:5',
        'end'    : '29:30',
        'offset' : +1
      }
    ];

    var offset_table_nehemiah = [
      { 'start'  : '9:38',
        'end'    : '13:31',
        'offset' : -1 // TODO
      }
    ];

    var offset_table_psalms = [
      { 'start'  : "3:2",   'end'   : "4:1",   'offset' : +1 },
      { 'start'  : "4:2",   'end'   : "5:1",   'offset' : +2 },
      { 'start'  : "5:2",   'end'   : "6:1",   'offset' : +3 },
      { 'start'  : "6:2",   'end'   : "7:1",   'offset' : +4 },
      { 'start'  : "7:2",   'end'   : "8:1",   'offset' : +5 },
      { 'start'  : "8:2",   'end'   : "9:1",   'offset' : +6 },
      { 'start'  : "9:2",   'end'   : "12:1",  'offset' : +7 },
      { 'start'  : "12:2",  'end'   : "13:1",  'offset' : +8 },
      { 'start'  : "13:2",  'end'   : "13:5",  'offset' : +9 },
      { 'start'  : "13:6",  'end'   : "18:1",  'offset' : +8 },
      { 'start'  : "18:2",  'end'   : "19:1",  'offset' : +9 },
      { 'start'  : "19:2",  'end'   : "20:1",  'offset' : +10 },
      { 'start'  : "20:2",  'end'   : "21:1",  'offset' : +11 },
      { 'start'  : "21:2",  'end'   : "22:1",  'offset' : +12 },
      { 'start'  : "22:2",  'end'   : "30:1",  'offset' : +13 },
      { 'start'  : "30:2",  'end'   : "31:1",  'offset' : +14 },
      { 'start'  : "31:2",  'end'   : "34:1",  'offset' : +15 },
      { 'start'  : "34:2",  'end'   : "36:1",  'offset' : +16 },
      { 'start'  : "36:2",  'end'   : "38:1",  'offset' : +17 },
      { 'start'  : "38:2",  'end'   : "39:1",  'offset' : +18 },
      { 'start'  : "39:2",  'end'   : "40:1",  'offset' : +19 },
      { 'start'  : "40:2",  'end'   : "41:1",  'offset' : +20 },
      { 'start'  : "41:2",  'end'   : "42:1",  'offset' : +21 },
      { 'start'  : "42:2",  'end'   : "44:1",  'offset' : +22 },
      { 'start'  : "44:2",  'end'   : "45:1",  'offset' : +23 },
      { 'start'  : "45:2",  'end'   : "46:1",  'offset' : +24 },
      { 'start'  : "46:2",  'end'   : "47:1",  'offset' : +25 },
      { 'start'  : "47:2",  'end'   : "48:1",  'offset' : +26 },
      { 'start'  : "48:2",  'end'   : "49:1",  'offset' : +27 },
      { 'start'  : "49:2",  'end'   : "51:1",  'offset' : +28 },
      { 'start'  : "51:2",  'end'   : "51:2",  'offset' : +29 },
      { 'start'  : "51:3",  'end'   : "52:1",  'offset' : +30 },
      { 'start'  : "52:2",  'end'   : "52:2",  'offset' : +31 },
      { 'start'  : "52:3",  'end'   : "53:1",  'offset' : +32 },
      { 'start'  : "53:2",  'end'   : "54:1",  'offset' : +33 },
      { 'start'  : "54:2",  'end'   : "54:2",  'offset' : +34 },
      { 'start'  : "54:3",  'end'   : "55:1",  'offset' : +35 },
      { 'start'  : "55:2",  'end'   : "56:1",  'offset' : +36 },
      { 'start'  : "56:2",  'end'   : "57:1",  'offset' : +37 },
      { 'start'  : "57:2",  'end'   : "58:1",  'offset' : +38 },
      { 'start'  : "58:2",  'end'   : "59:1",  'offset' : +39 },
      { 'start'  : "59:2",  'end'   : "60:1",  'offset' : +40 },
      { 'start'  : "60:2",  'end'   : "60:2",  'offset' : +41 },
      { 'start'  : "60:3",  'end'   : "61:1",  'offset' : +42 },
      { 'start'  : "61:2",  'end'   : "62:1",  'offset' : +43 },
      { 'start'  : "62:2",  'end'   : "63:1",  'offset' : +44 },
      { 'start'  : "63:2",  'end'   : "64:1",  'offset' : +45 },
      { 'start'  : "64:2",  'end'   : "65:1",  'offset' : +46 },
      { 'start'  : "65:2",  'end'   : "67:1",  'offset' : +47 },
      { 'start'  : "67:2",  'end'   : "68:1",  'offset' : +48 },
      { 'start'  : "68:2",  'end'   : "69:1",  'offset' : +49 },
      { 'start'  : "69:2",  'end'   : "70:1",  'offset' : +50 },
      { 'start'  : "70:2",  'end'   : "75:1",  'offset' : +51 },
      { 'start'  : "75:2",  'end'   : "76:1",  'offset' : +52 },
      { 'start'  : "76:2",  'end'   : "77:1",  'offset' : +53 },
      { 'start'  : "77:2",  'end'   : "80:1",  'offset' : +54 },
      { 'start'  : "80:2",  'end'   : "81:1",  'offset' : +55 },
      { 'start'  : "81:2",  'end'   : "83:1",  'offset' : +56 },
      { 'start'  : "83:2",  'end'   : "84:1",  'offset' : +57 },
      { 'start'  : "84:2",  'end'   : "85:1",  'offset' : +58 },
      { 'start'  : "85:2",  'end'   : "88:1",  'offset' : +59 },
      { 'start'  : "88:2",  'end'   : "89:1",  'offset' : +60 },
      { 'start'  : "89:2",  'end'   : "92:1",  'offset' : +61 },
      { 'start'  : "92:2",  'end'   : "102:1", 'offset' : +62 },
      { 'start'  : "102:2", 'end'   : "108:1", 'offset' : +63 },
      { 'start'  : "108:2", 'end'   : "140:1", 'offset' : +64 },
      { 'start'  : "140:2", 'end'   : "142:1", 'offset' : +65 },
      { 'start'  : "142:2", 'end'   : "150:6", 'offset' : +66 },
    ];

    var offset_table_isaiah = [
      { 'start'  : '64:1',
        'end'    : '66:24',
        'offset' : -1
      }
    ];

    var offset_table_acts = [
      { 'start'  : '19:41',
        'end'    : '28:31',
        'offset' : -1
      }
    ];

    var offset_table_2co = [
      { 'start'  : '13:13',
        'end'    : '13:14',
        'offset' : -1
      }
    ];

    var offset_table_revelation = [
      { 'start'  : '12:17',
        'end'    : '22:21',
        'offset' : +1
      }
    ];

    var offset_tables = {
      '1Sa' : offset_table_1_samuel,
      '1Ki' : offset_table_1_kings,
      '2Ki' : offset_table_2_kings,
      '1Ch' : offset_table_1_chronicles,
      'Neh' : offset_table_nehemiah,
      'Psa' : offset_table_psalms,
      'Isa' : offset_table_isaiah,
      'Act' : offset_table_acts,
      '2Co' : offset_table_2co,
      'Rev' : offset_table_revelation
    };

    return offset_tables;
  };

  Verse.prototype.isInVerseRange = function(startReference, endReference) {
    var startChapter = parseInt(startReference.split(':')[0]);
    var startVerse = parseInt(startReference.split(':')[1]);
    var endChapter = parseInt(endReference.split(':')[0]);
    var endVerse = parseInt(endReference.split(':')[1]);

    var inChapterRange = false;
    var inVerseRange = false;

    if (this.chapter >= startChapter &&
        this.chapter <= endChapter) {

      inChapterRange = true;
    }

    if (this.chapter == startChapter &&
        this.chapter == endChapter &&
        this.verseNr >= startVerse &&
        this.verseNr <= endVerse) {

      inVerseRange = true;
    } else if (this.chapter == startChapter &&
               this.chapter != endChapter &&
               this.verseNr >= startVerse) {

      inVerseRange = true;
    } else if (this.chapter == endChapter &&
               this.chapter != startChapter &&
               this.verseNr <= endVerse) {

      inVerseRange = true;
    } else if (this.chapter > startChapter &&
               this.chapter < endChapter) {

      inVerseRange = true;
    }

    return inChapterRange && inVerseRange;
  };

  return Verse;
};

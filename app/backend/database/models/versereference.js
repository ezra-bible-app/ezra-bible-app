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
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

'use strict';

/**
 * The VerseReference model is used to manage verse references.
 * @typedef VerseReference
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const VerseReference = sequelize.define('VerseReference', {
    bibleBookId: DataTypes.INTEGER,
    chapter: DataTypes.INTEGER,
    verseNr: DataTypes.INTEGER,
    absoluteVerseNrEng: DataTypes.INTEGER,
    absoluteVerseNrHeb: DataTypes.INTEGER,
    bibleBookShortTitle: DataTypes.VIRTUAL,
    bibleBookLongTitle: DataTypes.VIRTUAL
  }, {
    timestamps: false
  });

  VerseReference.associate = function(models) {
    VerseReference.belongsToMany(models.Tag, {through: 'VerseTags'});
    VerseReference.hasOne(models.Note);
  };

  VerseReference.prototype.getBibleBook = function() {
    return models.BibleBook.findByPk(this.bibleBookId);
  };

  VerseReference.prototype.getOrCreateNote = async function() {
    var note = await this.getNote();
    if (note == null) { // create the note if it does not exist yet
      note = await this.createNote();
    }

    return note;
  };

  VerseReference.findOrCreateFromVerseObject = async function(verseObject, versification) {
    var bibleBookId = null;
    var conditions = null;
    var chapter = null;
    var verseNr = null;
    var absoluteVerseNrs = null;

    if (verseObject._isBookNoteVerse) {
      var bibleBookShortTitle = verseObject._bibleBookShortTitle;
      var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: bibleBookShortTitle } });

      conditions = { bibleBookId: bibleBook.id, chapter: 0, verseNr: 0 };
      chapter = 0;
      verseNr = 0;
      absoluteVerseNrs = {};
      absoluteVerseNrs['absoluteVerseNrEng'] = 0;
      absoluteVerseNrs['absoluteVerseNrHeb'] = 0;

    } else {

      var bibleBookShortTitle = verseObject._bibleBookShortTitle;
      var bibleBookId = verseObject._bibleBookId;
      var absoluteVerseNr = verseObject._absoluteVerseNr;
      chapter = verseObject._chapter;
      verseNr = verseObject._verseNr;

      var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: bibleBookShortTitle } });
      bibleBookId = bibleBook.id;

      absoluteVerseNrs = models.VerseReference.getAbsoluteVerseNrs(versification, bibleBookShortTitle, absoluteVerseNr, chapter, verseNr);

      conditions = { bibleBookId: bibleBookId, absoluteVerseNrEng: absoluteVerseNr };
      if (versification == 'HEBREW') {
        conditions = { bibleBookId: bibleBookId, absoluteVerseNrHeb: absoluteVerseNr };
      }
    }

    const [ verseReference, created ] = await models.VerseReference.findOrCreate({
      where: conditions,
      defaults: {
        bibleBookId: bibleBook.id,
        chapter: chapter,
        verseNr: verseNr,
        absoluteVerseNrEng: absoluteVerseNrs["absoluteVerseNrEng"],
        absoluteVerseNrHeb: absoluteVerseNrs["absoluteVerseNrHeb"]
      }
    });

    return verseReference;
  };

  VerseReference.getBookReference = async function(bookShortTitle) {
    var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: bookShortTitle } });
    var bibleBookId = bibleBook.id;

    return await this.findOne({
      where: { bibleBookId: bibleBookId, chapter: 0, verseNr: 0 }
    });
  }

  VerseReference.findByBookAndAbsoluteVerseNumber = function(bookShortTitle, absoluteVerseNr, versification) {
    var absoluteVerseNrField = (versification == 'eng' ? 'absoluteVerseNrEng' : 'absoluteVerseNrHeb');

    var query = "SELECT vr.*, " +
                " b.shortTitle as bibleBookShortTitle, " +
                " b.longTitle AS bibleBookLongTitle" +
                " FROM VerseReferences vr" +
                " INNER JOIN BibleBooks b ON" +
                " vr.bibleBookId = b.id" +
                " WHERE b.shortTitle = '" + bookShortTitle + "'" +
                " AND vr." + absoluteVerseNrField + "=" + absoluteVerseNr;
                " ORDER BY vr.absoluteVerseNrEng ASC";

    return sequelize.query(query, { model: models.VerseReference });    
  }

  VerseReference.findByTagIds = function(tagIds) {
    var query = "SELECT vr.*, " +
                " b.shortTitle as bibleBookShortTitle, " +
                " b.longTitle AS bibleBookLongTitle" +
                " FROM VerseReferences vr" +
                " INNER JOIN BibleBooks b ON" +
                " vr.bibleBookId = b.id" +
                " INNER JOIN VerseTags vt ON" +
                " vt.verseReferenceId = vr.id" +
                " WHERE vt.tagId IN (" + tagIds + ")" +
                " ORDER BY vr.absoluteVerseNrEng ASC";

    return sequelize.query(query, { model: models.VerseReference });
  };

  VerseReference.findByXrefs = async function(xrefs) {
    var verseReferences = [];

    for (var i = 0; i < xrefs.length; i++) {
      var splittedReference = xrefs[i].split('.');
      var book = splittedReference[0];
      var chapter = splittedReference[1];
      var verseNr = splittedReference[2];

      var currentReferenceQuery = "SELECT vr.*, " +
                                  " b.shortTitle as bibleBookShortTitle, " +
                                  " b.longTitle as bibleBookLongTitle" +
                                  " FROM VerseReferences vr" +
                                  " INNER JOIN BibleBooks b ON" +
                                  " vr.bibleBookId = b.id" +
                                  " WHERE vr.bibleBookId = b.id" +
                                  " AND vr.chapter = " + chapter +
                                  " AND vr.verseNr = " + verseNr +
                                  " AND b.shortTitle = '" + book + "'";
      //console.log("CURRENT REFERENCE: ");
      //console.log(currentReferenceQuery);

      var currentDbReferenceList = await sequelize.query(currentReferenceQuery, { model: models.VerseReference });

      if (currentDbReferenceList.length > 0) {
        verseReferences.push(currentDbReferenceList[0]);
      }
    }

    return verseReferences;
  };

  VerseReference.getAbsoluteVerseNrs = function(versification, bibleBook, absoluteVerseNr, chapter, verseNr) {
    var absoluteVerseNrEng = null;
    var absoluteVerseNrHeb = null;

    if (versification == 'HEBREW') {
      absoluteVerseNrHeb = absoluteVerseNr;
      absoluteVerseNrEng = this.getAbsoluteVerseNrEngFromHeb(bibleBook, absoluteVerseNrHeb, chapter, verseNr);
    } else {
      absoluteVerseNrEng = absoluteVerseNr;
      absoluteVerseNrHeb = this.getAbsoluteVerseNrHebFromEng(bibleBook, absoluteVerseNrEng, chapter, verseNr);
    }

    return {
      "absoluteVerseNrEng": absoluteVerseNrEng,
      "absoluteVerseNrHeb": absoluteVerseNrHeb
    };
  };

  VerseReference.getAbsoluteVerseNrHebFromEng = function(bibleBookShortTitle, absoluteVerseNrEng, chapter, verseNr) {
    var offset = models.VerseReference.getOffsetForVerseReference(bibleBookShortTitle, chapter, verseNr);
    var absoluteVerseNrHeb = absoluteVerseNrEng + offset;
    return absoluteVerseNrHeb;
  };

  VerseReference.getAbsoluteVerseNrEngFromHeb = function(bibleBookShortTitle, absoluteVerseNrHeb, chapter, verseNr) {
    var offset = models.VerseReference.getOffsetForVerseReference(bibleBookShortTitle, chapter, verseNr);
    var absoluteVerseNrEng = absoluteVerseNrHeb - offset;
    return absoluteVerseNrEng;
  };

  VerseReference.getOffsetTable = function(bibleBookShortTitle) {
    var offset_tables = models.VerseReference.getAllOffsetTables();

    for (var key in offset_tables) {
      if (key.toLowerCase() == bibleBookShortTitle.toLowerCase()) {
        return offset_tables[key];
      }
    }

    return null;
  }

  VerseReference.getOffsetForVerseReference = function(bibleBookShortTitle, chapter, verseNr) {
    var offset = 0;
    var offset_table = models.VerseReference.getOffsetTable(bibleBookShortTitle);

    if (offset_table != undefined) {
      for (var i = 0; i < offset_table.length; i++) {
          var currentSection = offset_table[i];
          
          if (models.VerseReference.isInVerseRange(currentSection['start'], currentSection['end'], chapter, verseNr)) {
            offset = currentSection['offset'];
            break;
          }
      }
    }

    return offset;
  };

  VerseReference.getAllOffsetTables = function() {
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
      '1Sam' : offset_table_1_samuel,
      '1Kgs' : offset_table_1_kings,
      '2Kgs' : offset_table_2_kings,
      '1Chr' : offset_table_1_chronicles,
      'Neh'  : offset_table_nehemiah,
      'Ps'   : offset_table_psalms,
      'Isa'  : offset_table_isaiah,
      'Acts' : offset_table_acts,
      '2Cor' : offset_table_2co,
      'Rev'  : offset_table_revelation
    };

    return offset_tables;
  };

  VerseReference.isInVerseRange = function(startReference, endReference, chapter, verseNr) {
    var startChapter = parseInt(startReference.split(':')[0]);
    var startVerse = parseInt(startReference.split(':')[1]);
    var endChapter = parseInt(endReference.split(':')[0]);
    var endVerse = parseInt(endReference.split(':')[1]);

    var inChapterRange = false;
    var inVerseRange = false;

    if (chapter >= startChapter &&
        chapter <= endChapter) {

      inChapterRange = true;
    }

    if (chapter == startChapter &&
        chapter == endChapter &&
        verseNr >= startVerse &&
        verseNr <= endVerse) {

      inVerseRange = true;
    } else if (chapter == startChapter &&
               chapter != endChapter &&
               verseNr >= startVerse) {

      inVerseRange = true;
    } else if (chapter == endChapter &&
               chapter != startChapter &&
               verseNr <= endVerse) {

      inVerseRange = true;
    } else if (chapter > startChapter &&
               chapter < endChapter) {

      inVerseRange = true;
    }

    return inChapterRange && inVerseRange;
  };

  return VerseReference;
};

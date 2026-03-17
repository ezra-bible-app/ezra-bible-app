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
    bibleBookLongTitle: DataTypes.VIRTUAL,
    tagList: DataTypes.VIRTUAL,
    tagGroupList: DataTypes.VIRTUAL,
    noteText: DataTypes.VIRTUAL,
  }, {
    timestamps: false
  });

  VerseReference.associate = function(models) {
    VerseReference.belongsToMany(models.Tag, {through: 'VerseTags'});
    VerseReference.hasMany(models.Note);
  };

  VerseReference.prototype.getBibleBook = function() {
    return global.models.BibleBook.findByPk(this.bibleBookId);
  };

  VerseReference.prototype.getOrCreateNote = async function(activeNoteFileId=null) {
    if (activeNoteFileId == 0) {
      activeNoteFileId = null;
    }

    var note = await global.models.Note.findOne({
      where: { verseReferenceId: this.id, noteFileId: activeNoteFileId }
    });

    if (note == null) { // create the note if it does not exist yet
      note = await this.createNote();

      if (activeNoteFileId != null) {
        note.noteFileId = activeNoteFileId;
      }
    }

    return note;
  };

  VerseReference.findOrCreateFromVerseObject = async function(verseObject, versification) {
    var bibleBook = null;
    var bibleBookId = null;
    var bibleBookShortTitle = null;
    var conditions = null;
    var chapter = null;
    var verseNr = null;
    var absoluteVerseNrs = null;

    if (verseObject._isBookNoteVerse) {
      bibleBookShortTitle = verseObject._bibleBookShortTitle;
      bibleBook = await global.models.BibleBook.findOne({ where: { shortTitle: bibleBookShortTitle } });
      if (bibleBook == null) {
        throw `Could not get Bible book with title ${bibleBookShortTitle}`;
      }

      conditions = { bibleBookId: bibleBook.id, chapter: 0, verseNr: 0 };
      chapter = 0;
      verseNr = 0;
      absoluteVerseNrs = {};
      absoluteVerseNrs['absoluteVerseNrEng'] = 0;
      absoluteVerseNrs['absoluteVerseNrHeb'] = 0;

    } else {

      bibleBookShortTitle = verseObject._bibleBookShortTitle;
      bibleBookId = verseObject._bibleBookId;
      var absoluteVerseNr = verseObject._absoluteVerseNr;
      chapter = verseObject._chapter;
      verseNr = verseObject._verseNr;

      bibleBook = await global.models.BibleBook.findOne({ where: { shortTitle: bibleBookShortTitle } });
      if (bibleBook == null) {
        throw `Could not get Bible book with title ${bibleBookShortTitle}`;
      }

      bibleBookId = bibleBook.id;

      absoluteVerseNrs = global.models.VerseReference.getAbsoluteVerseNrs(versification, bibleBookShortTitle, absoluteVerseNr, chapter, verseNr);

      conditions = { bibleBookId: bibleBookId, absoluteVerseNrEng: absoluteVerseNr };
      if (versification == 'HEBREW') {
        conditions = { bibleBookId: bibleBookId, absoluteVerseNrHeb: absoluteVerseNr };
      }
    }

    // eslint-disable-next-line no-unused-vars
    const [ verseReference, created ] = await global.models.VerseReference.findOrCreate({
      where: conditions,
      defaults: {
        bibleBookId: bibleBook.id,
        chapter: chapter,
        verseNr: verseNr,
        absoluteVerseNrEng: absoluteVerseNrs["absoluteVerseNrEng"],
        absoluteVerseNrHeb: absoluteVerseNrs["absoluteVerseNrHeb"]
      }
    });

    if (!created) {
      // Rewrite the chapter and verseNr in case the existing values are null
      // This may be the case due to a bug that existed in the frontend (see #979)

      // We cannot undo the wrongful saving of verse references, but we can rewrite the verse reference
      // if we encounter one that has inconsistent data like missing chapter / verseNr attributes
      // or wrong absolute verse numbers.

      let changed = false;

      if (verseReference.dataValues.chapter == null) {
        verseReference.chapter = chapter;
        changed = true;
      }
      
      if (verseReference.dataValues.verseNr == null) {
        verseReference.verseNr = verseNr;
        changed = true;
      }
      
      if (verseReference.dataValues.absoluteVerseNrEng != absoluteVerseNrs['absoluteVerseNrEng']) {
        verseReference.absoluteVerseNrEng = absoluteVerseNrs['absoluteVerseNrEng'];
        changed = true;
      }
      
      if (verseReference.dataValues.absoluteVerseNrHeb != absoluteVerseNrs['absoluteVerseNrHeb']) {
        verseReference.absoluteVerseNrHeb = absoluteVerseNrs['absoluteVerseNrHeb'];
        changed = true;
      }

      if (changed) {
        await verseReference.save();
      }
    }

    return verseReference;
  };

  VerseReference.getBookReference = async function(bookShortTitle) {
    var bibleBook = await global.models.BibleBook.findOne({ where: { shortTitle: bookShortTitle } });
    var bibleBookId = bibleBook.id;

    return await this.findOne({
      where: { bibleBookId: bibleBookId, chapter: 0, verseNr: 0 }
    });
  };

  VerseReference.findByBookAndAbsoluteVerseNumber = function(bookShortTitle, absoluteVerseNr, versification) {
    var absoluteVerseNrField = (versification == 'eng' ? 'absoluteVerseNrEng' : 'absoluteVerseNrHeb');

    var query = "SELECT vr.*, " +
                " b.shortTitle as bibleBookShortTitle, " +
                " b.longTitle AS bibleBookLongTitle" +
                " FROM VerseReferences vr" +
                " INNER JOIN BibleBooks b ON" +
                " vr.bibleBookId = b.id" +
                " WHERE b.shortTitle = '" + bookShortTitle + "'" +
                " AND vr." + absoluteVerseNrField + "=" + absoluteVerseNr +
                " ORDER BY vr.absoluteVerseNrEng ASC";

    return sequelize.query(query, { model: global.models.VerseReference });    
  };

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

    return sequelize.query(query, { model: global.models.VerseReference });
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

      var currentDbReferenceList = await sequelize.query(currentReferenceQuery, { model: global.models.VerseReference });

      if (currentDbReferenceList.length > 0) {
        verseReferences.push(currentDbReferenceList[0]);
      }
    }

    return verseReferences;
  };

  VerseReference.findAllWithUserData = function() {
    var verseReferences = null;

    var query = `SELECT vr.*, 
                 b.shortTitle as bibleBookShortTitle,
                 b.longTitle AS bibleBookLongTitle,
                 REPLACE(GROUP_CONCAT(DISTINCT t.title), ',', ';') AS tagList,
                 REPLACE(GROUP_CONCAT(DISTINCT tg.title), ',', ';') AS tagGroupList,
                 n.text AS noteText
                 FROM VerseReferences vr
                 INNER JOIN BibleBooks b ON
                 vr.bibleBookId = b.id
                 LEFT JOIN VerseTags vt ON
                 vt.verseReferenceId = vr.id
                 LEFT JOIN Tags t ON
                 vt.verseReferenceId = vr.id AND vt.tagId = t.id
                 LEFT JOIN TagGroupMembers tgm ON
                 tgm.tagId = t.id
                 LEFT JOIN TagGroups tg ON
                 tg.id = tgm.tagGroupId
                 LEFT JOIN Notes n ON n.verseReferenceId = vr.id
                 GROUP BY vr.id
                 ORDER BY b.number ASC, vr.absoluteVerseNrEng ASC`;

    verseReferences = sequelize.query(query, { model: global.models.VerseReference });    

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
    var offset = global.models.VerseReference.getOffsetForVerseReference(bibleBookShortTitle, chapter, verseNr);
    var absoluteVerseNrHeb = absoluteVerseNrEng + offset;
    return absoluteVerseNrHeb;
  };

  VerseReference.getAbsoluteVerseNrEngFromHeb = function(bibleBookShortTitle, absoluteVerseNrHeb, chapter, verseNr) {
    var offset = global.models.VerseReference.getOffsetForVerseReference(bibleBookShortTitle, chapter, verseNr);
    var absoluteVerseNrEng = absoluteVerseNrHeb - offset;
    return absoluteVerseNrEng;
  };

  VerseReference.getOffsetTable = function(bibleBookShortTitle) {
    var offset_tables = global.models.VerseReference.getAllOffsetTables();

    for (var key in offset_tables) {
      if (key.toLowerCase() == bibleBookShortTitle.toLowerCase()) {
        return offset_tables[key];
      }
    }

    return null;
  };

  VerseReference.getOffsetForVerseReference = function(bibleBookShortTitle, chapter, verseNr) {
    var offset = 0;
    var offset_table = global.models.VerseReference.getOffsetTable(bibleBookShortTitle);

    if (offset_table != undefined) {
      for (var i = 0; i < offset_table.length; i++) {
        var currentSection = offset_table[i];
        
        if (global.models.VerseReference.isInVerseRange(currentSection['start'], currentSection['end'], chapter, verseNr)) {
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
      { 'start'  : "3:1",   'end'  : "3:9",   'offset' : +1 },
      { 'start'  : "4:1",   'end'  : "4:9",   'offset' : +2 },
      { 'start'  : "5:1",   'end'  : "5:13",  'offset' : +3 },
      { 'start'  : "6:1",   'end'  : "6:11",  'offset' : +4 },
      { 'start'  : "7:1",   'end'  : "7:18",  'offset' : +5 },
      { 'start'  : "8:1",   'end'  : "8:10",  'offset' : +6 },
      { 'start'  : "9:1",   'end'  : "11:7",  'offset' : +7 },
      { 'start'  : "12:1",  'end'  : "12:9",  'offset' : +8 },
      { 'start'  : "13:1",  'end'  : "13:5",  'offset' : +9 },
      { 'start'  : "13:6",  'end'  : "17:15", 'offset' : +8 },
      { 'start'  : "18:1",  'end'  : "18:51", 'offset' : +9 },
      { 'start'  : "19:1",  'end'  : "19:15", 'offset' : +10 },
      { 'start'  : "20:1",  'end'  : "20:10", 'offset' : +11 },
      { 'start'  : "21:1",  'end'  : "21:14", 'offset' : +12 },
      { 'start'  : "22:1",  'end'  : "29:11", 'offset' : +13 },
      { 'start'  : "30:1",  'end'  : "30:12", 'offset' : +14 },
      { 'start'  : "31:1",  'end'  : "33:22", 'offset' : +15 },
      { 'start'  : "34:1",  'end'  : "35:28", 'offset' : +16 },
      { 'start'  : "36:1",  'end'  : "37:40", 'offset' : +17 },
      { 'start'  : "38:1",  'end'  : "38:23", 'offset' : +18 },
      { 'start'  : "39:1",  'end'  : "39:14", 'offset' : +19 },
      { 'start'  : "40:1",  'end'  : "40:18", 'offset' : +20 },
      { 'start'  : "41:1",  'end'  : "41:14", 'offset' : +21 },
      { 'start'  : "42:1",  'end'  : "43:5",  'offset' : +22 },
      { 'start'  : "44:1",  'end'  : "44:27", 'offset' : +23 },
      { 'start'  : "45:1",  'end'  : "45:18", 'offset' : +24 },
      { 'start'  : "46:1",  'end'  : "46:12", 'offset' : +25 },
      { 'start'  : "47:1",  'end'  : "47:10", 'offset' : +26 },
      { 'start'  : "48:1",  'end'  : "48:15", 'offset' : +27 },
      { 'start'  : "49:1",  'end'  : "50:23", 'offset' : +28 },
      { 'start'  : "51:1",  'end'  : "51:19", 'offset' : +30 },
      { 'start'  : "52:1",  'end'  : "52:11", 'offset' : +32 },
      { 'start'  : "53:1",  'end'  : "53:7",  'offset' : +33 },
      { 'start'  : "54:1",  'end'  : "54:9",  'offset' : +35 },
      { 'start'  : "55:1",  'end'  : "55:24", 'offset' : +36 },
      { 'start'  : "56:1",  'end'  : "56:14", 'offset' : +37 },
      { 'start'  : "57:1",  'end'  : "57:12", 'offset' : +38 },
      { 'start'  : "58:1",  'end'  : "58:12", 'offset' : +39 },
      { 'start'  : "59:1",  'end'  : "59:18", 'offset' : +40 },
      { 'start'  : "60:1",  'end'  : "60:14", 'offset' : +42 },
      { 'start'  : "61:1",  'end'  : "61:9",  'offset' : +43 },
      { 'start'  : "62:1",  'end'  : "62:13", 'offset' : +44 },
      { 'start'  : "63:1",  'end'  : "63:12", 'offset' : +45 },
      { 'start'  : "64:1",  'end'  : "64:11", 'offset' : +46 },
      { 'start'  : "65:1",  'end'  : "66:20", 'offset' : +47 },
      { 'start'  : "67:1",  'end'  : "67:8",  'offset' : +48 },
      { 'start'  : "68:1",  'end'  : "68:36", 'offset' : +49 },
      { 'start'  : "69:1",  'end'  : "69:37", 'offset' : +50 },
      { 'start'  : "70:1",  'end'  : "74:23", 'offset' : +51 },
      { 'start'  : "75:1",  'end'  : "75:11", 'offset' : +52 },
      { 'start'  : "76:1",  'end'  : "76:13", 'offset' : +53 },
      { 'start'  : "77:1",  'end'  : "79:13", 'offset' : +54 },
      { 'start'  : "80:1",  'end'  : "80:20", 'offset' : +55 },
      { 'start'  : "81:1",  'end'  : "82:8",  'offset' : +56 },
      { 'start'  : "83:1",  'end'  : "83:19", 'offset' : +57 },
      { 'start'  : "84:1",  'end'  : "84:13", 'offset' : +58 },
      { 'start'  : "85:1",  'end'  : "87:7",  'offset' : +59 },
      { 'start'  : "88:1",  'end'  : "88:19", 'offset' : +60 },
      { 'start'  : "89:1",  'end'  : "91:16", 'offset' : +61 },
      { 'start'  : "92:1",  'end'  : "101:8", 'offset' : +62 },
      { 'start'  : "102:1", 'end'  : "107:43",'offset' : +63 },
      { 'start'  : "108:1", 'end'  : "139:24",'offset' : +64 },
      { 'start'  : "140:1", 'end'  : "141:10",'offset' : +65 },
      { 'start'  : "142:1", 'end'  : "150:6", 'offset' : +66 },
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

  VerseReference.isBookWithOffset = function(bibleBookShortTitle) {
    const offset_tables = global.models.VerseReference.getAllOffsetTables();

    for (var key in offset_tables) {
      if (key == bibleBookShortTitle) {
        return true;
      }
    }

    return false;
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

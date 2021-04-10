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

global.bookMap = {
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

global.bible_books = [
  { long_title : 'Genesis',
    short_title : "Gen" },
  { long_title : 'Exodus',
    short_title : "Exod" },
  { long_title : 'Leviticus',
    short_title : "Lev" },
  { long_title : 'Numbers',
    short_title : "Num" },
  { long_title : 'Deuteronomy',
    short_title : "Deut" },
  { long_title : 'Joshua',
    short_title : "Josh" },
  { long_title : 'Judges',
    short_title : "Judg" },
  { long_title : 'Ruth',
    short_title : "Ruth" },
  { long_title : 'I Samuel',
    short_title : "1Sam" },
  { long_title : 'II Samuel',
    short_title : "2Sam" },
  { long_title : 'I Kings',
    short_title : "1Kgs" },
  { long_title : 'II Kings',
    short_title : "2Kgs" },
  { long_title : 'I Chronicles',
    short_title : "1Chr" },
  { long_title : 'II Chronicles',
    short_title : "2Chr" },
  { long_title : 'Ezra',
    short_title : "Ezra" },
  { long_title : 'Nehemiah',
    short_title : "Neh" },
  { long_title : 'Esther',
    short_title : "Esth" },
  { long_title : 'Job',
    short_title : "Job" },
  { long_title : 'Psalms',
    short_title : "Ps" },
  { long_title : 'Proverbs',
    short_title : "Prov" },
  { long_title : 'Ecclesiastes',
    short_title : "Eccl" },
  { long_title : 'Song of Solomon',
    short_title : "Song" },
  { long_title : 'Isaiah',
    short_title : "Isa" },
  { long_title : 'Jeremiah',
    short_title : "Jer" },
  { long_title : 'Lamentations',
    short_title : "Lam" },
  { long_title : 'Ezekiel',
    short_title : "Ezek" },
  { long_title : 'Daniel',
    short_title : "Dan" },
  { long_title : 'Hosea',
    short_title : "Hos" },
  { long_title : 'Joel',
    short_title : "Joel" },
  { long_title : 'Amos',
    short_title : "Amos" },
  { long_title : 'Obadiah',
    short_title : "Obad" },
  { long_title : 'Jonah',
    short_title : "Jonah" },
  { long_title : 'Micah',
    short_title : "Mic" },
  { long_title : 'Nahum',
    short_title : "Nah" },
  { long_title : 'Habakkuk',
    short_title : "Hab" },
  { long_title : 'Zephaniah',
    short_title : "Zeph" },
  { long_title : 'Haggai',
    short_title : "Hag" },
  { long_title : 'Zechariah',
    short_title : "Zech" },
  { long_title : 'Malachi',
    short_title : "Mal" },
  { long_title : 'Matthew',
    short_title : "Matt" },
  { long_title : 'Mark',
    short_title : "Mark" },
  { long_title : 'Luke',
    short_title : "Luke" },
  { long_title : 'John',
    short_title : "John" },
  { long_title : 'Acts',
    short_title : "Acts" },
  { long_title : 'Romans',
    short_title : "Rom" },
  { long_title : 'I Corinthians',
    short_title : "1Cor" },
  { long_title : 'II Corinthians',
    short_title : "2Cor" },
  { long_title : 'Galatians',
    short_title : "Gal" },
  { long_title : 'Ephesians',
    short_title : "Eph" },
  { long_title : 'Philippians',
    short_title : "Phil" },
  { long_title : 'Colossians',
    short_title : "Col" },
  { long_title : 'I Thessalonians',
    short_title : "1Thess" },
  { long_title : 'II Thessalonians',
    short_title : "2Thess" },
  { long_title : 'I Timothy',
    short_title : "1Tim" },
  { long_title : 'II Timothy',
    short_title : "2Tim" },
  { long_title : 'Titus',
    short_title : "Titus" },
  { long_title : 'Philemon',
    short_title : "Phlm" },
  { long_title : 'Hebrews',
    short_title : "Heb" },
  { long_title : 'James',
    short_title : "Jas" },
  { long_title : 'I Peter',
    short_title : "1Pet" },
  { long_title : 'II Peter',
    short_title : "2Pet" },
  { long_title : 'I John',
    short_title : "1John" },
  { long_title : 'II John',
    short_title : "2John" },
  { long_title : 'III John',
    short_title : "3John" },
  { long_title : 'Jude',
    short_title : "Jude" },
  { long_title : 'Revelation of John',
    short_title : "Rev" }
];

const otBooks = [ "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
                  "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer",
                  "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph",
                  "Hag", "Zech", "Mal"];

const ntBooks = [ "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col",
                  "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet",
                  "1John", "2John", "3John", "Jude", "Rev" ];

'use strict';

/**
 * The BibleBook model is used to manage Bible books.
 * @typedef BibleBook
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const BibleBook = sequelize.define('BibleBook', {
    number: DataTypes.INTEGER,
    shortTitle: DataTypes.STRING,
    longTitle: DataTypes.STRING
  }, {
    timestamps: false
  });

  BibleBook.associate = function(models) {
    BibleBook.hasMany(models.VerseReference);
  };

  BibleBook.prototype.getVerseTags = function() {
    var query = "SELECT t.title AS tagTitle, b.shortTitle AS bibleBookId, vt.*, vr.absoluteVerseNrEng, vr.absoluteVerseNrHeb" + 
                " FROM VerseTags vt " +
                " INNER JOIN VerseReferences vr ON vt.verseReferenceId = vr.id" +
                " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                " INNER JOIN Tags t ON t.id = vt.tagId" +
                " WHERE vr.bibleBookId=" + this.id +
                " ORDER BY t.title ASC";

    return sequelize.query(query, { model: models.VerseTag });
  };

  BibleBook.prototype.getNotes = function() {
    var query = "SELECT n.*, b.shortTitle AS bibleBookId, vr.absoluteVerseNrEng, vr.absoluteVerseNrHeb" + 
                " FROM Notes n " +
                " INNER JOIN VerseReferences vr ON n.verseReferenceId = vr.id" +
                " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                " WHERE vr.bibleBookId=" + this.id;
    
    return sequelize.query(query, { model: models.Note });
  };

  BibleBook.getBookLongTitle = function(book_short_title) {
    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];
      if (current_book.short_title == book_short_title) {
        return current_book.long_title;
      }
    }

    return -1;
  };

  BibleBook.getBookTitleTranslation = function(shortName, language) {
    if (shortName == null || shortName.length == 0 || language == null) {
      return null;
    } else {
      var currentBookLongTitle = models.BibleBook.getBookLongTitle(shortName);
      var currentBookName = ipcNsiHandler.getNSI().getSwordTranslation(currentBookLongTitle, language);
    }
    
    return currentBookName;   
  };

  BibleBook.findByTagIds = function(tagIds) {
    var query = "SELECT b.* FROM VerseTags vt" +
                " INNER JOIN VerseReferences vr ON vt.verseReferenceId = vr.id" +
                " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                " WHERE vt.tagId IN (" + tagIds + ")" +
                " GROUP BY b.number ORDER BY b.number ASC";

    return sequelize.query(query, { model: models.BibleBook });
  };

  BibleBook.findByVerseReferenceIds = function(verseReferenceIds) {
    var query = "SELECT * FROM BibleBooks b" +
                " INNER JOIN VerseReferences vr ON vr.bibleBookId = b.id" +
                " WHERE vr.id IN (" + verseReferenceIds + ")" +
                " GROUP BY b.number ORDER BY b.number ASC";
    
    return sequelize.query(query, { model: models.BibleBook }); 
  }

  BibleBook.findByXrefs = function(xrefs) {
    var bibleBooks = [];
    for (var i = 0; i < xrefs.length; i++) {
      var currentBook = "'" + xrefs[i].split('.')[0] + "'";
      bibleBooks.push(currentBook);
    }

    var query = "SELECT * FROM BibleBooks b" +
                " WHERE b.shortTitle IN (" + bibleBooks.join(',') + ")" +
                " ORDER BY b.number ASC";
    
    return sequelize.query(query, { model: models.BibleBook });    
  }

  BibleBook.findBySearchResults = function(searchResults) {
    var bibleBookIds = [];
    for (var i = 0; i < searchResults.length; i++) {
      var bibleBookId = BibleBook.swordBooktoEzraBook(searchResults[i].bibleBookShortTitle);

      if (bibleBookId !== undefined && !bibleBookIds.includes(bibleBookId)) {
        bibleBookIds.push(bibleBookId);
      }
    }

    var query = "SELECT b.* FROM BibleBooks b" +
                " WHERE b.id IN (" + bibleBookIds.join(',') + ")" +
                " GROUP BY b.number ORDER BY b.number ASC";

    return sequelize.query(query, { model: models.BibleBook });   
  }

  BibleBook.getShortTitleById = async function(id) {
    if (id == null || id.length == 0) {
      return null;
    } else {
      var bibleBook = await BibleBook.findByPk(id);
      return bibleBook.shortTitle;
    }
  }

  BibleBook.swordBooktoEzraBook = function(swordBook) {
    return bookMap[swordBook];
  };

  BibleBook.getBookMap = function() {
    return bookMap;
  };

  BibleBook.findBookTitle = function(title) {
    for (entry of bible_books) {
      if (entry.short_title.indexOf(title) != -1) {
        return entry.short_title;
      }
    }

    return title;
  }

  BibleBook.isNtBook = function(bookCode) {
    return ntBooks.includes(bookCode);
  }

  BibleBook.isOtBook = function(bookCode) {
    return otBooks.includes(bookCode);
  }

  return BibleBook;
};

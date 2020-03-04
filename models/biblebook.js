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

var bible_books = [
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

'use strict';
module.exports = (sequelize, DataTypes) => {
  var BibleBook = sequelize.define('BibleBook', {
    number: DataTypes.INTEGER,
    shortTitle: DataTypes.STRING,
    longTitle: DataTypes.STRING
  }, {
    timestamps: false
  });

  BibleBook.associate = function(models) {
    BibleBook.hasMany(models.Verse);
    BibleBook.hasMany(models.VerseReference);
  };

  BibleBook.prototype.getVerseTags = function() {
    var query = "SELECT t.title AS tagTitle, b.shortTitle AS bibleBookId, vt.*, vr.absoluteVerseNrEng, vr.absoluteVerseNrHeb" + 
                " FROM VerseReferences vr " +
                " INNER JOIN VerseTags vt ON vt.verseReferenceId = vr.id" +
                " INNER JOIN Tags t ON t.id = vt.tagId" +
                " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                " WHERE vr.bibleBookId=" + this.id +
                " ORDER BY t.title ASC";

    return sequelize.query(query, { model: models.VerseTag });
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

  BibleBook.getBookTitleTranslation = function(shortName) {
    if (shortName == null || shortName.length == 0) {
      return null;
    } else {
      var currentBookLongTitle = models.BibleBook.getBookLongTitle(shortName);
      var currentBookName = i18nHelper.getSwordTranslation(currentBookLongTitle);
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

  BibleBook.findBySearchResults = function(searchResults) {
    var bibleBookIds = [];
    for (var i = 0; i < searchResults.length; i++) {
      var bibleBookId = models.BibleTranslation.swordBooktoEzraBook(searchResults[i].bibleBookShortTitle);

      if (!bibleBookIds.includes(bibleBookId)) {
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

  return BibleBook;
};

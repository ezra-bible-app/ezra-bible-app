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

  BibleBook.prototype.getVerses = function(bibleTranslationId,
                                           startVerseNumber = 0,
                                           numberOfVerses = 0) {

    return models.BibleTranslation.findByPk(bibleTranslationId).then(bibleTranslation => {
      var versificationPostfix = bibleTranslation.getVersificationPostfix();

      var query = "SELECT v.*, " +

                  "( SELECT id FROM VerseReferences vr " +
                  " WHERE vr.bibleBookId = v.bibleBookId " +
                  " AND vr.absoluteVerseNr" + versificationPostfix + " = v.absoluteVerseNr )" +
                  "verseReferenceId" +

                  " FROM Verses v " +
                  " WHERE v.bibleTranslationId='" + bibleTranslationId + "'" +
                  " AND v.bibleBookId=" + this.id;

      if (startVerseNumber != 0) {
        var maxVerseNumber = startVerseNumber + numberOfVerses - 1;

        query += " AND v.absoluteVerseNr >= " + startVerseNumber +
                 " AND v.absoluteVerseNr <= " + maxVerseNumber;
      }

      query += " ORDER BY v.absoluteVerseNr ASC";

      return sequelize.query(query, { model: models.Verse });
    });
  };

  BibleBook.prototype.getVerseTags = function(bibleTranslationId) {
    return models.BibleTranslation.findByPk(bibleTranslationId).then(bibleTranslation => {

      var versificationPostfix = "Eng";
      if (bibleTranslation.versification == 'HEBREW') {
        versificationPostfix = "Heb";
      }

      var query = "SELECT t.title AS tagTitle, t.bibleBookId AS bibleBookId, vt.*" + 
                  " FROM VerseReferences vr " +
                  " INNER JOIN VerseTags vt ON vt.verseReferenceId = vr.id" +
                  " INNER JOIN Tags t ON t.id = vt.tagId" +
                  " WHERE vr.bibleBookId=" + this.id +
                  " ORDER BY t.title ASC";

      return sequelize.query(query, { model: models.VerseTag });
    });
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
    var currentBookLongTitle = models.BibleBook.getBookLongTitle(shortName);
    var currentBookName = i18nHelper.getSwordTranslation(currentBookLongTitle); 
    return currentBookName;   
  };

  BibleBook.getChapterVerseCounts = function(bibleTranslationId='KJV') {
    var query = "SELECT b.*, v.chapter, COUNT(v.verseNr) AS verseCount " +
                "FROM Verses v " +
                "INNER JOIN BibleBooks b ON v.bibleBookId = b.id " +
                "WHERE bibleTranslationId='" + bibleTranslationId + "' " +
                "GROUP BY v.bibleBookId, v.chapter " +
                "ORDER BY b.number ASC, v.chapter ASC";

    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
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
    var bibleBook = await BibleBook.findByPk(id);
    return bibleBook.shortTitle;
  }

  return BibleBook;
};

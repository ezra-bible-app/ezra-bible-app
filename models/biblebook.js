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
      var query = "SELECT v.* FROM Verses v " +
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

      var query = "SELECT v.id AS verseId, t.title AS tagTitle, t.bibleBookId AS bibleBookId, vt.*" + 
                  " FROM Verses v " +
                  " INNER JOIN VerseReferences vr ON v.bibleBookId = vr.bibleBookId AND" +
                  " v.absoluteVerseNr = vr.absoluteVerseNr" + versificationPostfix +
                  " INNER JOIN VerseTags vt ON vt.verseReferenceId = vr.id" +
                  " INNER JOIN Tags t ON t.id = vt.tagId" +
                  " WHERE v.bibleTranslationId='" + bibleTranslationId + "'" +
                  " AND v.bibleBookId=" + this.id +
                  " ORDER BY v.absoluteVerseNr ASC, t.title ASC";

      return sequelize.query(query, { model: models.VerseTag });
    });
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

  return BibleBook;
};

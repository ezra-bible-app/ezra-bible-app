'use strict';
module.exports = (sequelize, DataTypes) => {
  var VerseTag = sequelize.define('VerseTag', {
    verseReferenceId: DataTypes.INTEGER,
    tagId: DataTypes.INTEGER,
    tagTitle: DataTypes.VIRTUAL,
    verseId: DataTypes.VIRTUAL,
    bibleBookId: DataTypes.VIRTUAL
  }, {});

  VerseTag.associate = function(models) {
    // associations can be defined here
  };

  VerseTag.groupVerseTagsByVerse = function(verseTags) {
    var groupedVerseTags = {};

    for (var i = 0; i < verseTags.length; i++) {
      var vt = verseTags[i];

      if (groupedVerseTags[vt.verseId] == null) {
        groupedVerseTags[vt.verseId] = [];
      }

      groupedVerseTags[vt.verseId].push(vt);
    }

    return groupedVerseTags;
  };

  VerseTag.findByVerseIds = function(bibleTranslationId, verseIds) {
    return models.BibleTranslation.findByPk(bibleTranslationId).then(bibleTranslation => {
      var versificationPostfix = bibleTranslation.getVersificationPostfix();

      var query = "SELECT v.id AS verseId, t.title AS tagTitle, t.bibleBookId AS bibleBookId, vt.* FROM Verses v" +
                  " INNER JOIN VerseReferences vr ON" +
                  " vr.absoluteVerseNr" + versificationPostfix + "=v.absoluteVerseNr" +
                  " AND vr.bibleBookId=v.bibleBookId" +
                  " INNER JOIN VerseTags vt ON vt.verseReferenceId = vr.id" +
                  " INNER JOIN Tags t ON t.id = vt.tagId" +
                  " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                  " WHERE v.id IN (" + verseIds + ")" +
                  " ORDER BY b.number ASC, vr.absoluteVerseNrEng ASC, t.title ASC";

      return sequelize.query(query, { model: models.VerseTag });
    });
  };

  return VerseTag;
};

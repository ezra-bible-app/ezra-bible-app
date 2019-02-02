'use strict';
module.exports = (sequelize, DataTypes) => {
  var Tag = sequelize.define('Tag', {
    title: DataTypes.STRING,
    bibleBookId: DataTypes.INTEGER,
    globalAssignmentCount: DataTypes.VIRTUAL,
    bookAssignmentCount: DataTypes.VIRTUAL
  }, {});

  Tag.associate = function(models) {
    Tag.belongsToMany(models.VerseReference, {through: 'VerseTags'});
  };

  Tag.getGlobalAndBookTags = function(bibleBookId = 0) {
    var query = "SELECT t.*," +
                 " SUM(CASE WHEN vt.tagId IS NULL THEN 0 ELSE 1 END) AS globalAssignmentCount," +
                 " SUM(CASE WHEN vr.bibleBookId=" + bibleBookId + " THEN 1 ELSE 0 END) AS bookAssignmentCount" +
                 " FROM Tags t" +
                 " LEFT JOIN VerseTags vt ON vt.tagId = t.id" +
                 " LEFT JOIN VerseReferences vr ON vt.verseReferenceId = vr.id" +
                 " GROUP BY t.id ORDER BY t.title ASC";

    return sequelize.query(query, { model: models.Tag });
  };

  return Tag;
};

'use strict';
module.exports = (sequelize, DataTypes) => {
  var VerseReference = sequelize.define('VerseReference', {
    bibleBookId: DataTypes.INTEGER,
    chapter: DataTypes.INTEGER,
    verseNr: DataTypes.INTEGER,
    absoluteVerseNrEng: DataTypes.INTEGER,
    absoluteVerseNrHeb: DataTypes.INTEGER
  }, {
    timestamps: false
  });

  VerseReference.associate = function(models) {
    VerseReference.hasMany(models.Verse);
    VerseReference.belongsToMany(models.Tag, {through: 'VerseTags'});
  };

  return VerseReference;
};

'use strict';
module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define('Note', {
    verseReferenceId: DataTypes.INTEGER,
    text: DataTypes.TEXT
  }, {});

  Note.associate = function(models) {
    Note.belongsTo(models.VerseReference);
  };
  
  return Note;
};
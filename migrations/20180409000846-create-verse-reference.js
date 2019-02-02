'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('VerseReferences', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      bibleBookId: {
        type: Sequelize.INTEGER
      },
      chapter: {
        type: Sequelize.INTEGER
      },
      verseNr: {
        type: Sequelize.INTEGER
      },
      absoluteVerseNrEng: {
        type: Sequelize.INTEGER
      },
      absoluteVerseNrHeb: {
        type: Sequelize.INTEGER
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('VerseReferences');
  }
};

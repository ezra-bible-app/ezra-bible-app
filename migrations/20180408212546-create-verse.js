'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Verses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      chapter: {
        type: Sequelize.INTEGER
      },
      verseNr: {
        type: Sequelize.INTEGER
      },
      content: {
        type: Sequelize.STRING
      },
      absoluteVerseNr: {
        type: Sequelize.INTEGER
      },
      bibleTranslationId: {
        type: Sequelize.STRING(5)
      },
      bibleBookId: {
        type: Sequelize.INTEGER
      },
      verseReferenceId: {
        type: Sequelize.INTEGER
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Verses');
  }
};

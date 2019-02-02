'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('BibleTranslations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING(5)
      },
      name: {
        type: Sequelize.STRING
      },
      language: {
        type: Sequelize.STRING
      },
      isFree: {
        type: Sequelize.BOOLEAN
      },
      versification: {
        type: Sequelize.ENUM('ENGLISH', 'HEBREW')
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('BibleTranslations');
  }
};

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('BibleTranslations');
  },

  down: (queryInterface, Sequelize) => {}
};

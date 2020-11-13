'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Verses');
  },

  down: (queryInterface, Sequelize) => {}
};

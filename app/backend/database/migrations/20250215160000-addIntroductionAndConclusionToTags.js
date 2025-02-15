'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Tags', 'introduction', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Tags', 'conclusion', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Tags', 'introduction');
    await queryInterface.removeColumn('Tags', 'conclusion');
  }
};

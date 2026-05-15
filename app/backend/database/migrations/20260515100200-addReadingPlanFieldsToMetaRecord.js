'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('MetaRecords', 'readingPlanActive', {
      type: Sequelize.BOOLEAN,
      allowNull: true
    });

    await queryInterface.addColumn('MetaRecords', 'readingPlanStartDate', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('MetaRecords', 'readingPlanActive');
    await queryInterface.removeColumn('MetaRecords', 'readingPlanStartDate');
  }
};

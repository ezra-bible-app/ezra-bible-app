'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ReadingPlanPassages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      readingPlanDayId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'ReadingPlanDays',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sequenceNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      startVerseReference: {
        type: Sequelize.STRING,
        allowNull: false
      },
      endVerseReference: {
        type: Sequelize.STRING,
        allowNull: false
      },
      label: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ReadingPlanPassages');
  }
};

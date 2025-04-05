'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TagNotes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tagId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Tags',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      introduction: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      conclusion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      introductionUpdatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      conclusionUpdatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('TagNotes');
  }
};

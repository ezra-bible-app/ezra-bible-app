'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Tags', 'noteFileId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'NoteFiles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Tags', 'noteFileId');
  }
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Notes', 'noteFileId', {
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
    await queryInterface.removeColumn('Notes', 'noteFileId');
  }
};

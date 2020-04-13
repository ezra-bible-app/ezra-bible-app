'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addIndex('Notes', { fields: ['verseReferenceId'] })
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeIndex('Notes', 'notes_verse_reference_id')
    ]);
  }
};

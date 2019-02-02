'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addIndex('VerseReferences', { fields: ['absoluteVerseNrEng'] }),
      queryInterface.addIndex('VerseReferences', { fields: ['absoluteVerseNrHeb'] }),
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeIndex('VerseReferences', 'verse_references_absolute_verse_nr_eng'),
      queryInterface.removeIndex('VerseReferences', 'verse_references_absolute_verse_nr_heb'),
    ]);
  }
};

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('Verses', { fields: ['absoluteVerseNr'] });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('Verses', 'verses_absolute_verse_nr');
  }
};

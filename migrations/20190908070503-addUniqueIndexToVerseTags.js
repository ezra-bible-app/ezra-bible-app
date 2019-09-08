'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('VerseTags', { fields: ['verseReferenceId', 'tagId'], unique: true });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('VerseTags', 'verse_tags_verse_reference_id_tag_id');
  }
};

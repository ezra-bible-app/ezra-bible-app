'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('VerseTags', ['verseReferenceId', 'tagId'], {
      type: 'unique',
      name: 'verse_tag_uniqueness'
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('VerseTags', 'verse_tag_uniqueness');
  }
};

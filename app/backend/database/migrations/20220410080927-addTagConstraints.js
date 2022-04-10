'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Tags', ['title'], {
      type: 'unique',
      name: 'tag_uniqueness'
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('Tags', 'tag_uniqueness');
  }
};

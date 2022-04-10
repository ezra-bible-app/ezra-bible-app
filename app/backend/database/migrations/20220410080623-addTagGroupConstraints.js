'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('TagGroups', ['title'], {
      type: 'unique',
      name: 'tag_group_uniqueness'
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('TagGroups', 'tag_group_uniqueness');
  }
};

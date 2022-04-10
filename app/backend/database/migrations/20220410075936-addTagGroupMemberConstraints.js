'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('TagGroupMembers', ['tagGroupId', 'tagId'], {
      type: 'unique',
      name: 'tag_group_members_uniqueness'
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('TagGroupMembers', 'tag_group_members_uniqueness');
  }
};

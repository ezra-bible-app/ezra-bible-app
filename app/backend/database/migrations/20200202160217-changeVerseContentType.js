'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
        'Verses',
        'content',
        {
            type: Sequelize.TEXT,
            allowNull: false
        }
    );
  },

  down: (queryInterface, Sequelize) => { }
};

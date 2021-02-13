'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {

    var query = "VACUUM";
    return queryInterface.sequelize.query(query);
  },

  down: (queryInterface, Sequelize) => {}
};

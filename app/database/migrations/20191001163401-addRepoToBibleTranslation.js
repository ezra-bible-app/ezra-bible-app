'use strict';

function getRepositoryForModule(nsi, moduleName) {
  var allRepositories = nsi.getRepoNames();

  for (var i = 0; i < allRepositories.length; i++) {
    var currentRepo = allRepositories[i];
    var allRepoModules = nsi.getAllRepoModules(currentRepo);

    for (var j = 0; j < allRepoModules.length; j++) {
      var currentRepoModule = allRepoModules[j];

      if (currentRepoModule.name == moduleName) {
        return currentRepo;
      }
    }
  }

  return null;
}

module.exports = {
  up: (queryInterface, Sequelize) => {
    const NodeSwordInterface = require('node-sword-interface');
    const nsi = new NodeSwordInterface();

    var query = "SELECT * FROM BibleTranslations WHERE isFree=1 ORDER BY languageName ASC";

    return queryInterface.sequelize.query(query).then(translations => {
      var updates = [];

      updates.push(queryInterface.addColumn('BibleTranslations', 'repository', Sequelize.STRING));

      for (var i = 0; i < translations[0].length; i++) {
        var currentRecord = translations[0][i];
        var repository = getRepositoryForModule(nsi, currentRecord.id);

        if (repository != null) {
          var query = "UPDATE BibleTranslations SET repository='" + repository + "' WHERE id='" + currentRecord.id + "'";
          var updateAction = queryInterface.sequelize.query(query);
          //console.log(query);
          updates.push(updateAction);
        }
      }

      return Promise.all(
        updates
      );
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('BibleTranslations', 'repository');
  }
};

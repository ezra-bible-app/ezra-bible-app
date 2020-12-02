'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const NodeSwordInterface = require('node-sword-interface');
    const nsi = new NodeSwordInterface();

    var query = "SELECT * FROM BibleTranslations ORDER BY languageName ASC";

    return queryInterface.sequelize.query(query).then(translations => {
      var updates = [];

      updates.push(queryInterface.addColumn('BibleTranslations', 'hasStrongs', Sequelize.BOOLEAN));

      for (var i = 0; i < translations[0].length; i++) {
        var currentRecord = translations[0][i];
        var hasStrongs = 0;

        try {
          var swordModule = nsi.getLocalModule(currentRecord.id);

          if (swordModule != null) {
            if (swordModule.hasStrongs) {
              hasStrongs = 1;
            }
          }
        } catch (e) {}

        var query = "UPDATE BibleTranslations SET hasStrongs='" + hasStrongs + "' WHERE id='" + currentRecord.id + "'";
        var updateAction = queryInterface.sequelize.query(query);
        updates.push(updateAction);
      }

      return Promise.all(
        updates
      );
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('BibleTranslations', 'hasStrongs');
  }
};

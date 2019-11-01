'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const NodeSwordInterface = require('node-sword-interface');
      const nsi = new NodeSwordInterface();
      const models = require('../models')(dbDir);

      var localSwordModules = nsi.getAllLocalModules();
      var dbModules = await models.BibleTranslation.findAndCountAll();

      for (var dbTranslation of dbModules.rows) {
        if (dbTranslation.hasStrongs) {
          var swordModuleFound = false;

          for (var i = 0; i < localSwordModules.length; i++) {
            if (localSwordModules[i].name == dbTranslation.id) {
              swordModuleFound = true;
              break;
            }
          }

          if (swordModuleFound) {
            console.log("Re-synchronizing translation: " + dbTranslation.name);

            await models.Verse.destroy({
              where: {
                bibleTranslationId: dbTranslation.id
              }
            });

            await models.BibleTranslation.importSwordTranslation(dbTranslation.id, models);
          }
        }
      }
    } catch (e) {

    }
  },

  down: (queryInterface, Sequelize) => {
  }
};

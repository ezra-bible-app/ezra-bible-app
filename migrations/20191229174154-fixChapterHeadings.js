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
          var swordModuleFound = false;

          for (var i = 0; i < localSwordModules.length && !swordModuleFound; i++) {
            if (localSwordModules[i].name == dbTranslation.id && localSwordModules[i].hasHeadings) {
              swordModuleFound = true;
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
      } catch (e) {
        console.log(e);
      }
  },

  down: (queryInterface, Sequelize) => {
  }
};

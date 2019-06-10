'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.renameColumn('BibleTranslations', 'language', 'languageName'),
      queryInterface.addColumn('BibleTranslations', 'languageCode', Sequelize.STRING),
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('BibleTranslations', 'languageCode'),
      queryInterface.renameColumn('BibleTranslations', 'languageName', 'language'),
    ]);
  }
};

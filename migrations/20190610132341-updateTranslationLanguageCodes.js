'use strict';

const LanguageMapper = require('../app/bible_browser/helpers/language_mapper.js');

module.exports = {
  up: (queryInterface, Sequelize) => {
    var languageMapper = new LanguageMapper();

    var query = "SELECT * FROM BibleTranslations ORDER BY languageName ASC";

    return queryInterface.sequelize.query(query).then(results => {
      var updates = [];

      for (var i = 0; i < results[0].length; i++) {
        var currentRecord = results[0][i];

        var newLanguageCode = languageMapper.getLanguageCode(currentRecord.languageName);
        var query = "UPDATE BibleTranslations SET languageCode='" + newLanguageCode + "' WHERE id='" + currentRecord.id + "'";
        var updateAction = queryInterface.sequelize.query(query);

        //console.log(query);
        updates.push(updateAction);
      }

      return Promise.all(
        updates
      );
    });
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
    ]);
  }
};
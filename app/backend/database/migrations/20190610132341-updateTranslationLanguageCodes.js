'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {

    var query = "SELECT * FROM BibleTranslations ORDER BY languageName ASC";

    return queryInterface.sequelize.query(query).then(results => {
      var updates = [];

      for (var i = 0; i < results[0].length; i++) {
        var currentRecord = results[0][i];

        var newLanguageCode = getLanguageCode(currentRecord.languageName);
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

/** returns ISO 639 language code (2-letter if available or 3-letter otherwise) */
function getLanguageCode(languageName) {
  var langs = getLangs();

  for (var i = 0; i < langs.length; i++) {
    var currentLang = langs[i];

    if (currentLang.name == languageName) {
      if (currentLang.iso6391 != null) {
        return currentLang.iso6391;
      }

      if (currentLang.iso6392T != null) {
        return currentLang.iso6392T;
      }

      if (currentLang.iso6392B != null) {
        return currentLang.iso6392B;
      }

      if (currentLang.iso6393 != null) {
        return currentLang.iso6393;
      }
    }
  }

  return null;
}

var langs = null;
function getLangs() {
  if (langs == null) {
    langs = require('iso-639-3');
  }

  return langs;
}

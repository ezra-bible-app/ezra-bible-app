'use strict';

var shortTitleUpdates = [
  { old_short_title : 'Exo',
    new_short_title : "Exod" },
  { old_short_title : 'Deu',
    new_short_title : "Deut" },
  { old_short_title : 'Jos',
    new_short_title : "Josh" },
  { old_short_title : 'Jdg',
    new_short_title : "Judg" },
  { old_short_title : 'Rut',
    new_short_title : "Ruth" },
  { old_short_title : '1Sa',
    new_short_title : "1Sam" },
  { old_short_title : '2Sa',
    new_short_title : "2Sam" },
  { old_short_title : '1Ki',
    new_short_title : "1Kgs" },
  { old_short_title : '2Ki',
    new_short_title : "2Kgs" },
  { old_short_title : '1Ch',
    new_short_title : "1Chr" },
  { old_short_title : '2Ch',
    new_short_title : "2Chr" },
  { old_short_title : 'Ezr',
    new_short_title : "Ezra" },
  { old_short_title : 'Est',
    new_short_title : "Esth" },
  { old_short_title : 'Psa',
    new_short_title : "Ps" },
  { old_short_title : 'Pro',
    new_short_title : "Prov" },
  { old_short_title : 'Ecc',
    new_short_title : "Eccl" },
  { old_short_title : 'Sol',
    new_short_title : "Song" },
  { old_short_title : 'Eze',
    new_short_title : "Ezek" },
  { old_short_title : 'Joe',
    new_short_title : "Joel" },
  { old_short_title : 'Amo',
    new_short_title : "Amos" },
  { old_short_title : 'Oba',
    new_short_title : "Obad" },
  { old_short_title : 'Jon',
    new_short_title : "Jonah" },
  { old_short_title : 'Zep',
    new_short_title : "Zeph" },
  { old_short_title : 'Zec',
    new_short_title : "Zech" },
  { old_short_title : 'Mat',
    new_short_title : "Matt" },
  { old_short_title : 'Mar',
    new_short_title : "Mark" },
  { old_short_title : 'Luk',
    new_short_title : "Luke" },
  { old_short_title : 'Joh',
    new_short_title : "John" },
  { old_short_title : 'Act',
    new_short_title : "Acts" },
  { old_short_title : '1Co',
    new_short_title : "1Cor" },
  { old_short_title : '2Co',
    new_short_title : "2Cor" },
  { old_short_title : 'Phi',
    new_short_title : "Phil" },
  { old_short_title : '1Th',
    new_short_title : "1Thess" },
  { old_short_title : '2Th',
    new_short_title : "2Thess" },
  { old_short_title : '1Ti',
    new_short_title : "1Tim" },
  { old_short_title : '2Ti',
    new_short_title : "2Tim" },
  { old_short_title : 'Tit',
    new_short_title : "Titus" },
  { old_short_title : 'Phm',
    new_short_title : "Phlm" },
  { old_short_title : 'Jam',
    new_short_title : "Jas" },
  { old_short_title : '1Pe',
    new_short_title : "1Pet" },
  { old_short_title : '2Pe',
    new_short_title : "2Pet" },
  { old_short_title : '1Jo',
    new_short_title : "1John" },
  { old_short_title : '2Jo',
    new_short_title : "2John" },
  { old_short_title : '3Jo',
    new_short_title : "3John" },
  { old_short_title : 'Jud',
    new_short_title : "Jude" }
];

module.exports = {
  up: (queryInterface, Sequelize) => {
    var updates = [];

    for (var i = 0; i < shortTitleUpdates.length; i++) {
      var oldShortTitle = shortTitleUpdates[i].old_short_title;
      var newShortTitle = shortTitleUpdates[i].new_short_title;
      var query = "UPDATE BibleBooks SET shortTitle='" + newShortTitle + "' WHERE shortTitle='" + oldShortTitle + "'";
      var updateAction = queryInterface.sequelize.query(query);
      updates.push(updateAction);
    }

    return Promise.all(
      updates
    );
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
    ]);
  }
};

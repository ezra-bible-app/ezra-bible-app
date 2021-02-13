'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    var duplicatesQuery = "SELECT GROUP_CONCAT(id) AS duplicateIds, tagId, verseReferenceId, COUNT(*) AS tagCount " +
                          "FROM VerseTags GROUP BY verseReferenceId, tagId ORDER BY tagCount DESC";
    
    return queryInterface.sequelize.query(duplicatesQuery).then(duplicates => {
      var allQueries = [];

      // This loop generates queries to delete duplicate VerseTags
      for (var i = 0; i < duplicates[0].length; i++) {
        var currentRecord = duplicates[0][i];
        var tagCount = currentRecord.tagCount;
        var duplicateIds = currentRecord.duplicateIds;

        if (tagCount > 1) {
          var ids = duplicateIds.split(',');
          ids.shift();

          var query = "DELETE FROM VerseTags WHERE id IN (" + ids.join(',') + ")";
          var deleteAction = queryInterface.sequelize.query(query);
          allQueries.push(deleteAction);
        }
      }

      allQueries.push(queryInterface.addIndex('VerseTags', { fields: ['verseReferenceId', 'tagId'], unique: true }));

      return Promise.all(
        allQueries
      );
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('VerseTags', 'verse_tags_verse_reference_id_tag_id');
  }
};

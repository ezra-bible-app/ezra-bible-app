'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addIndex('BibleBooks', { fields: ['number'] }),
      queryInterface.addIndex('Tags', { fields: ['bibleBookId'] }),
      queryInterface.addIndex('Verses', { fields: ['bibleBookId'] }),
      queryInterface.addIndex('Verses', { fields: ['bibleTranslationId'] }),
      queryInterface.addIndex('Verses', { fields: ['verseReferenceId'] }),
      queryInterface.addIndex('VerseReferences', { fields: ['bibleBookId'] }),
      queryInterface.addIndex('VerseTags', { fields: ['verseReferenceId'] }),
      queryInterface.addIndex('VerseTags', { fields: ['tagId'] }),
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeIndex('BibleBooks', 'bible_books_number'),
      queryInterface.removeIndex('Tags', 'tags_bible_book_id'),
      queryInterface.removeIndex('Verses', 'verses_bible_book_id'),
      queryInterface.removeIndex('Verses', 'verses_bible_translation_id'),
      queryInterface.removeIndex('Verses', 'verses_verse_reference_id'),
      queryInterface.removeIndex('VerseReferences', 'verse_references_bible_book_id'),
      queryInterface.removeIndex('VerseTags', 'verse_tags_verse_reference_id'),
      queryInterface.removeIndex('VerseTags', 'verse_tags_tag_id'),
    ]);
  }
};

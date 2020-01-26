/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

'use strict';
module.exports = (sequelize, DataTypes) => {
  var VerseTag = sequelize.define('VerseTag', {
    verseReferenceId: DataTypes.INTEGER,
    tagId: DataTypes.INTEGER,
    tagTitle: DataTypes.VIRTUAL,
    verseId: DataTypes.VIRTUAL,
    bibleBookId: DataTypes.VIRTUAL
  }, {});

  VerseTag.associate = function(models) {
    // associations can be defined here
  };

  VerseTag.groupVerseTagsByVerse = function(verseTags) {
    var groupedVerseTags = {};

    for (var i = 0; i < verseTags.length; i++) {
      var vt = verseTags[i];

      if (groupedVerseTags[vt.verseReferenceId] == null) {
        groupedVerseTags[vt.verseReferenceId] = [];
      }

      groupedVerseTags[vt.verseReferenceId].push(vt);
    }

    return groupedVerseTags;
  };

  VerseTag.findByVerseIds = function(bibleTranslationId, verseIds) {
    return models.BibleTranslation.findByPk(bibleTranslationId).then(bibleTranslation => {
      var versificationPostfix = bibleTranslation.getVersificationPostfix();

      var query = "SELECT v.id AS verseId, t.title AS tagTitle, t.bibleBookId AS bibleBookId, vt.* FROM Verses v" +
                  " INNER JOIN VerseReferences vr ON" +
                  " vr.absoluteVerseNr" + versificationPostfix + " = v.absoluteVerseNr" +
                  " AND vr.bibleBookId=v.bibleBookId" +
                  " INNER JOIN VerseTags vt ON vt.verseReferenceId = vr.id" +
                  " INNER JOIN Tags t ON t.id = vt.tagId" +
                  " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                  " WHERE v.id IN (" + verseIds + ")" +
                  " ORDER BY b.number ASC, vr.absoluteVerseNrEng ASC, t.title ASC";

      return sequelize.query(query, { model: models.VerseTag });
    });
  };

  return VerseTag;
};

/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

'use strict';
module.exports = (sequelize, DataTypes) => {
  var Tag = sequelize.define('Tag', {
    title: DataTypes.STRING,
    bibleBookId: DataTypes.INTEGER,
    globalAssignmentCount: DataTypes.VIRTUAL,
    bookAssignmentCount: DataTypes.VIRTUAL,
    lastUsed: DataTypes.VIRTUAL
  }, {});

  Tag.associate = function(models) {
    Tag.belongsToMany(models.VerseReference, {through: 'VerseTags'});
  };

  Tag.getGlobalAndBookTags = function(bibleBookId = 0, lastUsed=false) {
    var query = "SELECT t.*," +
                 " SUM(CASE WHEN vt.tagId IS NULL THEN 0 ELSE 1 END) AS globalAssignmentCount," +
                 " SUM(CASE WHEN vr.bibleBookId=" + bibleBookId + " THEN 1 ELSE 0 END) AS bookAssignmentCount," +
                 " MAX(vt.updatedAt) AS lastUsed" +
                 " FROM Tags t" +
                 " LEFT JOIN VerseTags vt ON vt.tagId = t.id" +
                 " LEFT JOIN VerseReferences vr ON vt.verseReferenceId = vr.id" +
                 " GROUP BY t.id";
    
    if (lastUsed) {
      query += " ORDER BY lastUsed DESC limit 5";
    } else {
      query += " ORDER BY t.title ASC";
    }

    return sequelize.query(query, { model: models.Tag });
  };

  Tag.getTagCount = async function() {
    var query = "SELECT id FROM Tags t";
    var records = await sequelize.query(query, { model: models.Tag });
    return records.length;
  };

  return Tag;
};

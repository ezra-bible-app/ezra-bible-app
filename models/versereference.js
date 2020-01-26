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
  var VerseReference = sequelize.define('VerseReference', {
    bibleBookId: DataTypes.INTEGER,
    chapter: DataTypes.INTEGER,
    verseNr: DataTypes.INTEGER,
    absoluteVerseNrEng: DataTypes.INTEGER,
    absoluteVerseNrHeb: DataTypes.INTEGER
  }, {
    timestamps: false
  });

  VerseReference.associate = function(models) {
    VerseReference.hasMany(models.Verse);
    VerseReference.belongsToMany(models.Tag, {through: 'VerseTags'});
  };

  return VerseReference;
};

/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
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
  const MetaRecord = sequelize.define('MetaRecord', {
    lastModifiedAt: DataTypes.DATE
  }, {
    timestamps: false
  });

  MetaRecord.associate = function(models) {
    // associations can be defined here
  };

  MetaRecord.getLastUpdate = async function() {
    var record = await models.MetaRecord.findOne({
      where: {
        id: 1,
      }
    });

    return record?.lastModifiedAt;
  };

  MetaRecord.updateLastModified = async function() {
    var currentTime = new Date(Date.now()).getTime();

    const [ metaRecord, created ] = await models.MetaRecord.findOrCreate({
      where: {
        id: 1,
      },
      defaults: {
        lastModifiedAt: currentTime
      }
    });

    if (!created) {
      metaRecord.lastModifiedAt = currentTime;
      await metaRecord.save();
    }

    return metaRecord;
  };

  return MetaRecord;
};
/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

'use strict';

/**
 * The MetaRecord model is used to manage meta information for the Ezra Bible App database, currently the time of the last modification.
 * @typedef MetaRecord
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const MetaRecord = sequelize.define('MetaRecord', {
    lastModifiedAt: DataTypes.DATE
  }, {
    timestamps: false
  });

  // eslint-disable-next-line no-unused-vars
  MetaRecord.associate = function(models) {
    // associations can be defined here
  };

  MetaRecord.getLastUpdate = async function() {
    var record = await global.models.MetaRecord.findOne({
      where: {
        id: 1,
      }
    });

    return (record != null ? record.lastModifiedAt : null);
  };

  MetaRecord.updateLastModified = async function() {
    var currentTime = new Date(Date.now()).getTime();

    const [ metaRecord, created ] = await MetaRecord.findOrCreate({
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
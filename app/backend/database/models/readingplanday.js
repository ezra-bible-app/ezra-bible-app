/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
 * The ReadingPlanDay model represents a single day in a Bible reading plan.
 * @typedef ReadingPlanDay
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const ReadingPlanDay = sequelize.define('ReadingPlanDay', {
    dayNumber: DataTypes.INTEGER,
    completedAt: DataTypes.DATE
  }, {});

  ReadingPlanDay.associate = function(models) {
    ReadingPlanDay.hasMany(models.ReadingPlanPassage, { foreignKey: 'readingPlanDayId', onDelete: 'CASCADE' });
  };

  /**
   * Creates a complete reading plan in one atomic transaction.
   * Any existing reading plan (days and passages) is deleted first before the new data is inserted.
   * @function
   * @param {Array<Object>} days - The list of days making up the plan.
   * @param {number} days[].dayNumber - Sequential position of this day in the plan (1-based).
   * @param {Array<Object>} [days[].passages=[]] - The Bible passages assigned to this day.
   * @param {number} days[].passages[].sequenceNumber - Display order of the passage within its day.
   * @param {string} days[].passages[].startVerseReference - OSIS verse reference for the start of the passage.
   * @param {string} days[].passages[].endVerseReference - OSIS verse reference for the end of the passage.
   * @param {string|null} [days[].passages[].label] - Optional human-readable label for the passage.
   * @returns {Promise<{success: boolean}>} A result object; on error a database exception object is returned instead.
   */
  ReadingPlanDay.createReadingPlan = async function(days) {
    try {
      await sequelize.transaction(async (t) => {
        await global.models.ReadingPlanPassage.destroy({ where: {}, transaction: t });
        await ReadingPlanDay.destroy({ where: {}, transaction: t });

        for (var i = 0; i < days.length; i++) {
          var dayData = days[i];

          var day = await ReadingPlanDay.create({
            dayNumber: dayData.dayNumber
          }, { transaction: t });

          var passages = dayData.passages || [];

          for (var j = 0; j < passages.length; j++) {
            var passage = passages[j];
            await global.models.ReadingPlanPassage.create({
              readingPlanDayId: day.id,
              sequenceNumber: passage.sequenceNumber,
              startVerseReference: passage.startVerseReference,
              endVerseReference: passage.endVerseReference,
              label: passage.label || null
            }, { transaction: t });
          }
        }
      });

      await global.models.MetaRecord.updateLastModified();

      return { success: true };
    } catch (error) {
      console.error('An error occurred while trying to create the reading plan: ' + error);
      return global.getDatabaseException(error);
    }
  };

  /**
   * Returns all reading plan days ordered by day number, each including its passages ordered by sequence number.
   * @function
   * @returns {Promise<Array<ReadingPlanDay>>} Array of ReadingPlanDay instances with associated ReadingPlanPassage records.
   */
  ReadingPlanDay.getAllReadingPlanDays = async function() {
    return await ReadingPlanDay.findAll({
      include: [{ model: global.models.ReadingPlanPassage }],
      order: [
        ['dayNumber', 'ASC'],
        [global.models.ReadingPlanPassage, 'sequenceNumber', 'ASC']
      ]
    });
  };

  /**
   * Marks a reading plan day as completed or resets it to incomplete.
   * @function
   * @param {number} id - The primary key of the ReadingPlanDay to update.
   * @param {Date|null} completedAt - The completion timestamp, or null to mark the day as incomplete.
   * @returns {Promise<{success: boolean}>} A result object; on error a database exception object is returned instead.
   */
  ReadingPlanDay.setCompleted = async function(id, completedAt) {
    try {
      await ReadingPlanDay.update({ completedAt: completedAt }, { where: { id: id } });
      await global.models.MetaRecord.updateLastModified();

      return { success: true };
    } catch (error) {
      console.error('An error occurred while trying to update reading plan day completion for id ' + id + ': ' + error);
      return global.getDatabaseException(error);
    }
  };

  /**
   * Deletes the entire reading plan, removing all passages first and then all days.
   * @function
   * @returns {Promise<{success: boolean}>} A result object; on error a database exception object is returned instead.
   */
  ReadingPlanDay.deleteReadingPlan = async function() {
    try {
      await global.models.ReadingPlanPassage.destroy({ where: {} });
      await ReadingPlanDay.destroy({ where: {} });
      await global.models.MetaRecord.updateLastModified();

      return { success: true };
    } catch (error) {
      console.error('An error occurred while trying to delete the reading plan: ' + error);
      return global.getDatabaseException(error);
    }
  };

  return ReadingPlanDay;
};

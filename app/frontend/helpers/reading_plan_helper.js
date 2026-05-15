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

/**
 * BOOK_CHAPTERS maps OSIS book abbreviations to their chapter counts.
 * The entries are in canonical Bible order (OT then NT).
 */
const BOOK_CHAPTERS = {
  'Gen': 50, 'Exod': 40, 'Lev': 27, 'Num': 36, 'Deut': 34,
  'Josh': 24, 'Judg': 21, 'Ruth': 4, '1Sam': 31, '2Sam': 24,
  '1Kgs': 22, '2Kgs': 25, '1Chr': 29, '2Chr': 36,
  'Ezra': 10, 'Neh': 13, 'Esth': 10, 'Job': 42, 'Ps': 150,
  'Prov': 31, 'Eccl': 12, 'Song': 8, 'Isa': 66, 'Jer': 52,
  'Lam': 5, 'Ezek': 48, 'Dan': 12, 'Hos': 14, 'Joel': 3,
  'Amos': 9, 'Obad': 1, 'Jonah': 4, 'Mic': 7, 'Nah': 3,
  'Hab': 3, 'Zeph': 3, 'Hag': 2, 'Zech': 14, 'Mal': 4,
  'Matt': 28, 'Mark': 16, 'Luke': 24, 'John': 21,
  'Acts': 28, 'Rom': 16, '1Cor': 16, '2Cor': 13, 'Gal': 6,
  'Eph': 6, 'Phil': 4, 'Col': 4, '1Thess': 5, '2Thess': 3,
  '1Tim': 6, '2Tim': 4, 'Titus': 3, 'Phlm': 1, 'Heb': 13,
  'Jas': 5, '1Pet': 5, '2Pet': 3, '1John': 5, '2John': 1,
  '3John': 1, 'Jude': 1, 'Rev': 22
};

/**
 * Built-in reading plan presets.
 * Each preset defines a list of book OSIS codes to include.
 * The generatePlanDays function will distribute chapters across the target day count.
 */
const PRESETS = {
  'whole-bible-365': {
    i18nKey: 'reading-plan.preset-whole-bible-365',
    days: 365,
    books: Object.keys(BOOK_CHAPTERS)
  },
  'nt-90': {
    i18nKey: 'reading-plan.preset-nt-90',
    days: 90,
    books: [
      'Matt', 'Mark', 'Luke', 'John',
      'Acts', 'Rom', '1Cor', '2Cor', 'Gal',
      'Eph', 'Phil', 'Col', '1Thess', '2Thess',
      '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb',
      'Jas', '1Pet', '2Pet', '1John', '2John',
      '3John', 'Jude', 'Rev'
    ]
  },
  'psalms-proverbs-30': {
    i18nKey: 'reading-plan.preset-psalms-proverbs-30',
    days: 30,
    books: ['Ps', 'Prov']
  }
};

/**
 * Groups a flat list of chapter refs (e.g. ['Gen.1','Gen.2','Matt.1']) into
 * passage objects, merging consecutive chapters of the same book into one passage.
 *
 * @param {string[]} chapterRefs
 * @returns {Array<{ sequenceNumber: number, startVerseReference: string, endVerseReference: string, label: null }>}
 */
function groupIntoPassages(chapterRefs) {
  var passages = [];
  var seqNum = 1;

  for (var i = 0; i < chapterRefs.length; ) {
    var startRef = chapterRefs[i];
    var startParts = startRef.split('.');
    var book = startParts[0];
    var chapterNum = parseInt(startParts[1], 10);
    var endRef = startRef;
    var expectedNext = chapterNum + 1;

    while (
      i + 1 < chapterRefs.length &&
      chapterRefs[i + 1] === book + '.' + expectedNext
    ) {
      i++;
      endRef = chapterRefs[i];
      expectedNext++;
    }

    passages.push({
      sequenceNumber: seqNum++,
      startVerseReference: startRef,
      endVerseReference: endRef,
      label: null
    });
    i++;
  }

  return passages;
}

/**
 * Generates an array of day objects for a reading plan preset.
 * Each day object has the shape:
 * { dayNumber: number, passages: [{ sequenceNumber, startVerseReference, endVerseReference, label }, ...] }
 *
 * Chapters are distributed as evenly as possible across the target number of days.
 * Consecutive chapters within the same book are merged into a single passage.
 *
 * @param {string} presetId - Key from the PRESETS map (e.g. 'whole-bible-365')
 * @returns {Array<{ dayNumber: number, passages: Array<{ sequenceNumber: number, startVerseReference: string, endVerseReference: string, label: null }> }>}
 */
function generatePlanDays(presetId) {
  var preset = PRESETS[presetId];
  if (!preset) {
    return [];
  }

  // Build a flat list of all chapter references in canonical order
  var allChapters = [];
  for (var i = 0; i < preset.books.length; i++) {
    var book = preset.books[i];
    var chapterCount = BOOK_CHAPTERS[book] || 0;
    for (var c = 1; c <= chapterCount; c++) {
      allChapters.push(book + '.' + c);
    }
  }

  var totalChapters = allChapters.length;
  var targetDays = preset.days;
  var days = [];

  if (totalChapters === 0) {
    return days;
  }

  if (totalChapters <= targetDays) {
    // One chapter per day; some days may be empty but we skip those
    for (var ci = 0; ci < totalChapters; ci++) {
      days.push({
        dayNumber: ci + 1,
        passages: groupIntoPassages([allChapters[ci]])
      });
    }
    return days;
  }

  // Distribute chapters across days using a "remainder" approach so that
  // chapters are spread as evenly as possible.
  var basePerDay = Math.floor(totalChapters / targetDays);
  var remainder = totalChapters % targetDays;
  var chapterIndex = 0;

  for (var d = 0; d < targetDays; d++) {
    var count = basePerDay + (d < remainder ? 1 : 0);
    var chapterSlice = [];
    for (var j = 0; j < count; j++) {
      if (chapterIndex < totalChapters) {
        chapterSlice.push(allChapters[chapterIndex]);
        chapterIndex++;
      }
    }
    days.push({
      dayNumber: d + 1,
      passages: groupIntoPassages(chapterSlice)
    });
  }

  return days;
}

module.exports = {
  PRESETS,
  generatePlanDays,
  groupIntoPassages
};

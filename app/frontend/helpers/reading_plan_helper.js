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
 * Books in a simplified historical/chronological order.
 * OT books are arranged roughly by the era they describe;
 * NT books follow in the order they were written/occurred.
 */
const CHRONOLOGICAL_ORDER = [
  // Primeval / Patriarchs
  'Job', 'Gen', 'Exod', 'Lev', 'Num', 'Deut',
  // Conquest & Judges
  'Josh', 'Judg', 'Ruth',
  // United & Divided Kingdom (Psalms interwoven with David's life)
  '1Sam', '2Sam', 'Ps', '1Kgs', '2Kgs', '1Chr', '2Chr',
  // Wisdom literature
  'Prov', 'Eccl', 'Song',
  // Major Prophets (period of the kings)
  'Isa', 'Jer', 'Lam', 'Ezek', 'Dan',
  // Minor Prophets
  'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech',
  // Post-exile
  'Esth', 'Ezra', 'Neh', 'Mal',
  // Gospels & Acts
  'Matt', 'Mark', 'Luke', 'John', 'Acts',
  // Pauline letters
  'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col',
  '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm',
  // General letters
  'Heb', 'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude',
  // Apocalypse
  'Rev'
];

var NT_BOOKS = [
  'Matt', 'Mark', 'Luke', 'John',
  'Acts', 'Rom', '1Cor', '2Cor', 'Gal',
  'Eph', 'Phil', 'Col', '1Thess', '2Thess',
  '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb',
  'Jas', '1Pet', '2Pet', '1John', '2John',
  '3John', 'Jude', 'Rev'
];

var OT_BOOKS = Object.keys(BOOK_CHAPTERS).filter(function(b) {
  return NT_BOOKS.indexOf(b) === -1;
});

/**
 * Built-in reading plan presets, keyed by preset ID.
 * Each preset defines a list of book OSIS codes and a target day count.
 * Presets with type 'ot-nt-daily' use a separate generation algorithm.
 */
const PRESETS = {
  'chronological-365': {
    i18nKey: 'reading-plan.pace-1-year',
    days: 365,
    books: CHRONOLOGICAL_ORDER
  },
  'chronological-180': {
    i18nKey: 'reading-plan.pace-6-months',
    days: 180,
    books: CHRONOLOGICAL_ORDER
  },
  'chronological-90': {
    i18nKey: 'reading-plan.pace-90-days',
    days: 90,
    books: CHRONOLOGICAL_ORDER
  },
  'canonical-365': {
    i18nKey: 'reading-plan.pace-1-year',
    days: 365,
    books: Object.keys(BOOK_CHAPTERS)
  },
  'canonical-nt-90': {
    i18nKey: 'reading-plan.pace-90-days-nt',
    days: 90,
    books: NT_BOOKS
  },
  'ot-nt-daily-365': {
    i18nKey: 'reading-plan.pace-ot-nt-proportional',
    days: 365,
    type: 'ot-nt-daily',
    ntRepeats: 1
  },
  'ot-nt-daily-365-nt-double': {
    i18nKey: 'reading-plan.pace-ot-nt-double',
    days: 365,
    type: 'ot-nt-daily',
    ntRepeats: 2
  },
  'psalms-proverbs-150': {
    i18nKey: 'reading-plan.pace-psalms-proverbs',
    days: 31,
    type: 'psalms-proverbs-cyclical'
  }
};

/**
 * Describes each plan type, its UI text keys, and which pace presets belong to it.
 */
const PLAN_TYPES = {
  'chronological': {
    titleKey:   'reading-plan.type-chronological',
    descKey:    'reading-plan.type-chronological-desc',
    bestForKey: 'reading-plan.type-chronological-best-for',
    prosKey:    'reading-plan.type-chronological-pros',
    consKey:    'reading-plan.type-chronological-cons',
    paces: [
      { presetId: 'chronological-365', i18nKey: 'reading-plan.pace-1-year' },
      { presetId: 'chronological-180', i18nKey: 'reading-plan.pace-6-months' },
      { presetId: 'chronological-90',  i18nKey: 'reading-plan.pace-90-days' }
    ]
  },
  'canonical': {
    titleKey:   'reading-plan.type-canonical',
    descKey:    'reading-plan.type-canonical-desc',
    bestForKey: 'reading-plan.type-canonical-best-for',
    prosKey:    'reading-plan.type-canonical-pros',
    consKey:    'reading-plan.type-canonical-cons',
    paces: [
      { presetId: 'canonical-365',   i18nKey: 'reading-plan.pace-1-year' },
      { presetId: 'canonical-nt-90', i18nKey: 'reading-plan.pace-90-days-nt' }
    ]
  },
  'ot-nt-daily': {
    titleKey:   'reading-plan.type-ot-nt-daily',
    descKey:    'reading-plan.type-ot-nt-daily-desc',
    bestForKey: 'reading-plan.type-ot-nt-daily-best-for',
    prosKey:    'reading-plan.type-ot-nt-daily-pros',
    consKey:    'reading-plan.type-ot-nt-daily-cons',
    paces: [
      { presetId: 'ot-nt-daily-365',           i18nKey: 'reading-plan.pace-ot-nt-proportional' },
      { presetId: 'ot-nt-daily-365-nt-double', i18nKey: 'reading-plan.pace-ot-nt-double' }
    ]
  },
  'psalms-proverbs': {
    titleKey:   'reading-plan.type-psalms-proverbs',
    descKey:    'reading-plan.type-psalms-proverbs-desc',
    bestForKey: 'reading-plan.type-psalms-proverbs-best-for',
    prosKey:    'reading-plan.type-psalms-proverbs-pros',
    consKey:    'reading-plan.type-psalms-proverbs-cons',
    paces: [
      { presetId: 'psalms-proverbs-150', i18nKey: 'reading-plan.pace-psalms-proverbs' }
    ]
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
 * Generates day objects where each day includes chapters from both the OT and NT,
 * distributed proportionally so both streams finish on the last day.
 *
 * @param {number} totalDays
 * @param {number} ntRepeats - How many times to cycle through the NT (1 = once, 2 = twice)
 * @returns {Array}
 */
function _generateOtNtDailyDays(totalDays, ntRepeats) {
  // Build flat chapter lists for each stream
  var otChapters = [];
  for (var oi = 0; oi < OT_BOOKS.length; oi++) {
    var otBook = OT_BOOKS[oi];
    var otCount = BOOK_CHAPTERS[otBook] || 0;
    for (var oc = 1; oc <= otCount; oc++) {
      otChapters.push(otBook + '.' + oc);
    }
  }

  var singleNtChapters = [];
  for (var ni = 0; ni < NT_BOOKS.length; ni++) {
    var ntBook = NT_BOOKS[ni];
    var ntCount = BOOK_CHAPTERS[ntBook] || 0;
    for (var nc = 1; nc <= ntCount; nc++) {
      singleNtChapters.push(ntBook + '.' + nc);
    }
  }

  // Repeat the NT stream as requested
  var ntChapters = [];
  for (var r = 0; r < ntRepeats; r++) {
    ntChapters = ntChapters.concat(singleNtChapters);
  }

  var totalOt = otChapters.length;
  var totalNt = ntChapters.length;
  var days = [];

  // Use an accumulator so each stream is spread proportionally across the days
  var otAcc = 0;
  var ntAcc = 0;
  var otIdx = 0;
  var ntIdx = 0;

  for (var d = 0; d < totalDays; d++) {
    otAcc += totalOt / totalDays;
    ntAcc += totalNt / totalDays;

    var otTarget = Math.round(otAcc);
    var ntTarget = Math.round(ntAcc);

    var dayOtRefs = [];
    while (otIdx < otTarget && otIdx < totalOt) {
      dayOtRefs.push(otChapters[otIdx]);
      otIdx++;
    }

    var dayNtRefs = [];
    while (ntIdx < ntTarget && ntIdx < totalNt) {
      dayNtRefs.push(ntChapters[ntIdx]);
      ntIdx++;
    }

    // Merge consecutive chapters within each stream, then combine and renumber
    var otPassages = groupIntoPassages(dayOtRefs);
    var ntPassages = groupIntoPassages(dayNtRefs);
    var combined = otPassages.concat(ntPassages);
    for (var p = 0; p < combined.length; p++) {
      combined[p].sequenceNumber = p + 1;
    }

    days.push({ dayNumber: d + 1, passages: combined });
  }

  return days;
}

/**
 * Generates day objects for the Psalms & Proverbs plan.
 * Covers all 150 Psalms across 31 days, pairing each day with the matching
 * Proverbs chapter (Prov.1 on day 1 … Prov.31 on day 31).
 * Psalm 119 always occupies its own day.
 * The 118 psalms before it are distributed evenly across 24 days;
 * the 31 psalms after it are distributed evenly across 6 days.
 *
 * @returns {Array}
 */
function _generatePsalmsProverbsDays() {
  var targetDays = BOOK_CHAPTERS['Prov']; // 31
  // Ps.119 gets its own isolated day; split the remaining 30 days proportionally
  // between the 118 psalms before it and the 31 psalms after it.
  var preCount  = 118; // Ps.1 – Ps.118
  var postCount = 31;  // Ps.120 – Ps.150
  var otherDays = targetDays - 1; // 30
  var preDays   = Math.round(preCount / (preCount + postCount) * otherDays); // 24
  var postDays  = otherDays - preDays; // 6

  // Build ordered psalm groups (one array per day)
  var psalmGroups = [];
  var psIdx = 1;
  var base, rem, gi, gk, group;

  // Pre-119 groups: Ps.1 – Ps.118 across preDays days
  base = Math.floor(preCount / preDays);
  rem  = preCount % preDays;
  for (gi = 0; gi < preDays; gi++) {
    group = [];
    for (gk = 0; gk < base + (gi < rem ? 1 : 0); gk++) {
      group.push('Ps.' + psIdx++);
    }
    psalmGroups.push(group);
  }

  // Ps.119 alone
  psalmGroups.push(['Ps.119']);
  psIdx = 120;

  // Post-119 groups: Ps.120 – Ps.150 across postDays days
  base = Math.floor(postCount / postDays);
  rem  = postCount % postDays;
  for (gi = 0; gi < postDays; gi++) {
    group = [];
    for (gk = 0; gk < base + (gi < rem ? 1 : 0); gk++) {
      group.push('Ps.' + psIdx++);
    }
    psalmGroups.push(group);
  }

  // Pair each psalm group with the corresponding Proverbs chapter
  var days = [];
  for (var i = 0; i < psalmGroups.length; i++) {
    var psPassages = groupIntoPassages(psalmGroups[i]);
    var provRef    = 'Prov.' + (i + 1);
    var provPassage = { sequenceNumber: psPassages.length + 1, startVerseReference: provRef, endVerseReference: provRef, label: null };
    days.push({
      dayNumber: i + 1,
      passages: psPassages.concat([provPassage])
    });
  }
  return days;
}

/**
 * Generates an array of day objects for a reading plan preset.
 * Each day object has the shape:
 * { dayNumber: number, passages: [{ sequenceNumber, startVerseReference, endVerseReference, label }, ...] }
 *
 * Chapters are distributed as evenly as possible across the target number of days.
 * Consecutive chapters within the same book are merged into a single passage.
 *
 * @param {string} presetId - Key from the PRESETS map (e.g. 'canonical-365')
 * @returns {Array<{ dayNumber: number, passages: Array<{ sequenceNumber: number, startVerseReference: string, endVerseReference: string, label: null }> }>}
 */
function generatePlanDays(presetId) {
  var preset = PRESETS[presetId];
  if (!preset) {
    return [];
  }

  // OT + NT daily plan uses a dedicated two-stream algorithm
  if (preset.type === 'ot-nt-daily') {
    return _generateOtNtDailyDays(preset.days, preset.ntRepeats || 1);
  }

  // Psalms + Proverbs cyclical: 1 psalm + 1 Proverbs chapter per day, Proverbs cycling
  if (preset.type === 'psalms-proverbs-cyclical') {
    return _generatePsalmsProverbsDays();
  }

  // Build a flat list of all chapter references in the preset's book order
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
  PLAN_TYPES,
  generatePlanDays,
  groupIntoPassages
};

/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

const dbHelper = require('./db_helper.js');

async function getVerseBox(verseReference) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var { absoluteVerseNumber } = await dbHelper.splitVerseReference(verseReference);
  return await verseListTabs.$(`.verse-nr-${absoluteVerseNumber}`);
}

module.exports = {
  getVerseBox,
}
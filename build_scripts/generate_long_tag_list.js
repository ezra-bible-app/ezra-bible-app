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

const path = require('path');

async function generateLongTagList() {
  let homedir = require('os').homedir();
  let userDataPath = path.join(homedir, '/.config/ezra-bible-app/');

  global.models = require('../app/backend/database/models')(userDataPath);

  for (let i = 1; i <= 1000; i++) {
    let tagTitle = `Tag ${i}`;

    await global.models.Tag.create({
      title: tagTitle,
      bibleBookId: null
    });
  }
}

(async () => {
  await generateLongTagList();
})();
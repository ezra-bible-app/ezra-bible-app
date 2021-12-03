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

const VerseBox = require('../ui_models/verse_box.js');

function getBibleBookStatsFromVerseList(tabIndex) {
  var bibleBookStats = {};    
  var currentVerseList = app_controller.getCurrentVerseList(tabIndex)[0];
  var verseBoxList = currentVerseList.querySelectorAll('.verse-box');

  for (var i = 0; i < verseBoxList.length; i++) {
    var currentVerseBox = verseBoxList[i];
    var bibleBookShortTitle = new VerseBox(currentVerseBox).getBibleBookShortTitle();

    if (bibleBookStats[bibleBookShortTitle] === undefined) {
      bibleBookStats[bibleBookShortTitle] = 1;
    } else {
      bibleBookStats[bibleBookShortTitle] += 1;
    }
  }

  return bibleBookStats;
}

function resetVerseListView() {
  var textType = app_controller.tab_controller.getTab().getTextType();
  if (textType != 'xrefs' && textType != 'tagged_verses') {
    var currentReferenceVerse = app_controller.getCurrentVerseListFrame().find('.reference-verse');
    currentReferenceVerse[0].innerHTML = "";
  }

  var currentVerseList = app_controller.getCurrentVerseList()[0];
  if (currentVerseList != undefined) {
    currentVerseList.innerHTML = "";
  }

  app_controller.docxExport.disableExportButton();
}

module.exports = {
  getBibleBookStatsFromVerseList,
  resetVerseListView
};
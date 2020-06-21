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


class SwordXrefs {
  constructor() {
  }

  getCurrentTabXrefs(tabIndex) {
    var verseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    var xrefSwordNotes = verseList.find('.sword-note[type="crossReference"]');
    return xrefSwordNotes;
  }

  initForTab(tabIndex=undefined) {
    console.time('SwordXrefs.initForTab');

    var xrefSwordNotes = this.getCurrentTabXrefs(tabIndex);
    console.log(`Got ${xrefSwordNotes.length} sword xref elements!`);
    
    // Remove text nodes containing ';'
    xrefSwordNotes.contents().filter(function() {
      return this.nodeType === 3; //Node.TEXT_NODE
    }).replaceWith("");

    xrefSwordNotes.addClass('sword-xref');

    console.timeEnd('SwordXrefs.initForTab');
  }
}

module.exports = SwordXrefs;
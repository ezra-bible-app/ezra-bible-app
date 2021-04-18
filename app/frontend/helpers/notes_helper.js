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

const removeMd = require('remove-markdown');

const MAX_TOOLTIP_LENGTH = 100;


function getTooltipText (noteText) {
  if(noteText && noteText.trim() !== "") {
    const deMarked = removeMd(noteText).replace(/\s*\n\s*/mg, ' - ');
    return deMarked.length > MAX_TOOLTIP_LENGTH ? deMarked.slice(0, MAX_TOOLTIP_LENGTH) + "..." : deMarked;
  } else {
    return i18n.t('bible-browser.new-note-hint');
  }
}


module.exports = {
  getTooltipText
}
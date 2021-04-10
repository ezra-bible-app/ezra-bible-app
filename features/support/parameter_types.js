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

const { defineParameterType } = require("cucumber");

defineParameterType({
  name: 'display_option',
  regexp: /tags|notes|indicators|xrefs|footnotes/,
  transformer: s => {
    switch (s) {
      case 'tags':
        return '#tags-switch';
      case 'notes':
        return '#verse-notes-switch';
      case 'indicators':
        return '#user-data-indicators-switch';
      case 'xrefs':
        return '#xrefs-switch';
      case 'footnotes':
        return '#footnotes-switch';
    }
  }
});

defineParameterType({
  name: 'state',
  regexp: /displayed|hidden/,
  type: 'boolean',
  transformer: s => s == 'displayed'
});

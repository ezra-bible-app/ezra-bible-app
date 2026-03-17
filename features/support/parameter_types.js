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

const { defineParameterType } = require("cucumber");

defineParameterType({
  name: 'bible_book',
  regexp: /Genesis|Ezra|Mark|Ephesians/,
});

defineParameterType({
  name: 'first_tab_menu',
  regexp: /book selection|search|options|translation selection|tag selection/,
  transformer: s => {
    switch (s) {
      case 'book selection':
        return '.book-select-button';
      case 'search':
        return '.module-search-button';
      case 'options':
        return '.display-options-button';
      case 'translation selection':
        return '.bible-select-block .ui-selectmenu';
      case 'tag selection':
        return '.tag-select-button';
    }
  }
});

defineParameterType({
  name: 'display_option',
  regexp: /tags|notes|indicators|xrefs|footnotes|navigation|current tab search|tag group filter/,
  transformer: s => {
    switch (s) {
      case 'tags':
        return '#showTagsOption';
      case 'notes':
        return '#showNotesOption';
      case 'indicators':
        return '#showUserDataIndicatorOption';
      case 'xrefs':
        return '#showXrefsOption';
      case 'footnotes':
        return '#showFootnotesOption';
      case 'navigation':
        return '#showBookChapterNavigationOption';
      case 'current tab search':
        return '#showTabSearchOption';
      case 'tag group filter':
        return '#useTagGroupFilterOption';
    }
  }
});

defineParameterType({
  name: 'state',
  regexp: /displayed|hidden|enabled|disabled/,
  type: 'boolean',
  transformer: s => s == 'displayed' || s == 'enabled'
});

defineParameterType({
  name: 'interface_element',
  regexp: /tag stat|dictionary header|search button|tab search case option|Revelation book name|selected locale|English option group/,
  transformer: s => {
    switch (s) {
      case 'tag stat':
        return '#tag-list-stats';
      case 'dictionary header':
        return '#dictionary-panel h3 > a';
      case 'search button':
        return '#verse-list-tabs-1 .module-search-label';
      case 'tab search case option':
        return '#verse-list-tabs-1 .tab-search-options label > span';
      case 'Revelation book name':
        return '#book-selection-menu li.book-Rev > a';
      case 'selected locale':
        return '#display-options-menu #localeSwitchOption .ui-selectmenu-status';
      case 'English option group':
        return '.ui-selectmenu-open .ui-selectmenu-group-0 .ui-selectmenu-group-label';
    }
  }
});

defineParameterType({
  name: 'tool_panel_type',
  regexp: /tag|dictionary|word-study/,
  transformer: s => `button[event="on-${s}-panel-switched"]`
});
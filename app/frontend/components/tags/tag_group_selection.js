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

const { html } = require('../../helpers/ezra_helper.js');

const template = html`
<style>
#tag-group-selection {
  margin: 0.1em 0 0 0;
  padding: 0.5em;
  padding-top: 0.7em;
  padding-bottom: 0.7em;
  user-select: none;
  box-sizing: border-box;
  border: 1px solid #555555;
}

#tag-group-selection a:link,
#tag-group-selection a:visited {
  text-decoration: none;
  color: var(--accent-color);
}

.darkmode--activated #tag-group-selection a:link,
.darkmode--activated #tag-group-selection a:visited {
  color: var(--accent-color-darkmode);
}

#tag-group-selection a:hover {
  text-decoration: underline;
}
</style>

<div id="tag-group-selection">
  <a href="">Tag groups</a> &rarr; General
</div>
`;
   
class TagGroupSelection extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {  
    this.appendChild(template.content);
  }
}

customElements.define('tag-group-selection', TagGroupSelection);
module.exports = TagGroupSelection;
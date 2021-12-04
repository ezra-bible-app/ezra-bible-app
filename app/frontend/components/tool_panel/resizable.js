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

// const { html } = require('../../helpers/ezra_helper.js');

// const template = html`
//   <div class="ui-resizable-handle"></div>
// `;

var toolPanel;
// var topHandle, sideHandle;

const MIN_WIDTH = 30 * 16;
const MIN_HEIGHT = 10 * 16;

module.exports.initResizable = function initResizable() {
  toolPanel = document.querySelector('#tool-panel');

  // TODO: to be used in a future with custom resizable
  // const topHandleFragment = template.content.cloneNode(true);
  // topHandle = topHandleFragment.children[0];
  // topHandle.classList.add('ui-resizable-n');
  // toolPanel.appendChild(topHandleFragment);

  // const sideHandleFragment = template.content.cloneNode(true);
  // sideHandle = sideHandleFragment.children[0];
  // sideHandle.classList.add('ui-resizable-e');
  // toolPanel.appendChild(sideHandleFragment);

  createResizable();

  window.addEventListener('resize', () => {
    $(toolPanel).resizable('destroy');
    createResizable();
  });

  loadSettings();
};

async function loadSettings() {
  const toolPanelWidthAvailable = await ipcSettings.has('toolPanelWidth');
  if (toolPanelWidthAvailable) {
    const toolPanelWidth = await ipcSettings.get('toolPanelWidth');
    toolPanel.style.width = toolPanelWidth + 'px';
  }

  const toolPanelHeightAvailable = await ipcSettings.has('toolPanelHeight');
  if (toolPanelHeightAvailable) {
    const toolPanelHeight = await ipcSettings.get('toolPanelHeight');
    toolPanel.style.height = toolPanelHeight + 'px';
  }
}


function createResizable() {
  const isPortrait = screen.orientation.type.startsWith('portrait');

  if (isPortrait) {

    $(toolPanel).resizable({
      handles: 'n',
      minHeight: MIN_HEIGHT,
      maxHeight: window.innerHeight - 3*MIN_HEIGHT,
      stop: function (event, ui) {
        ipcSettings.set('toolPanelHeight', ui.size.height);
      }
    });

  } else {

    $(toolPanel).resizable({
      handles: 'e',
      minWidth: MIN_WIDTH,
      maxWidth: window.innerWidth - 2*MIN_WIDTH,
      stop: function (event, ui) {
        ipcSettings.set('toolPanelWidth', ui.size.width);
      }
    });

  }
}




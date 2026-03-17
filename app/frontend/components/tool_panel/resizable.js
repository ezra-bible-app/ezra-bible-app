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

// const { html } = require('../../helpers/ezra_helper.js');

// const template = html`
//   <div class="ui-resizable-handle"></div>
// `;

const MIN_WIDTH = 25 * 16;
const MIN_HEIGHT = 15 * 16;

var toolPanel, panelHeight=MIN_HEIGHT, panelWidth=MIN_WIDTH;
// var topHandle, sideHandle;

module.exports.initResizable = async function initResizable() {
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

  await loadSettings();

  createResizable();

  window.addEventListener('resize', () => {
    $(toolPanel).resizable('destroy');
    createResizable();
  });

};

async function loadSettings() {
  const toolPanelWidthAvailable = await ipcSettings.has('toolPanelWidth');
  if (toolPanelWidthAvailable) {
    panelWidth = await ipcSettings.get('toolPanelWidth');
  }

  const toolPanelHeightAvailable = await ipcSettings.has('toolPanelHeight');
  if (toolPanelHeightAvailable) {
    panelHeight = await ipcSettings.get('toolPanelHeight');
  }
}


function createResizable() {
  const isPortrait = screen.orientation.type.startsWith('portrait');

  if (isPortrait) {

    toolPanel.style.height = panelHeight + 'px';
    $(toolPanel).resizable({
      handles: 'n',
      minHeight: MIN_HEIGHT,
      maxHeight: window.innerHeight - 2*MIN_HEIGHT,
      stop: function (event, ui) {
        panelHeight = ui.size.height;
        ipcSettings.set('toolPanelHeight', panelHeight);
      }
    });

  } else {

    toolPanel.style.width = panelWidth + 'px';
    $(toolPanel).resizable({
      handles: 'e',
      minWidth: MIN_WIDTH,
      stop: function (event, ui) {
        panelWidth = ui.size.width;
        ipcSettings.set('toolPanelWidth', panelWidth);
      }
    });

  }
}




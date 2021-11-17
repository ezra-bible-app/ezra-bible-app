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

const Mousetrap = require('mousetrap');
const { getPlatform } = require('../helpers/ezra_helper.js');
const wheelnavController = require('../controllers/wheelnav_controller.js');

/**
 * This controller handles the fullscreen toggling of the app.
 * @module fullscreenController
 * @category Controller
 */

/**
 * Initializes fullscreen handling
 */
module.exports.init = function() {
  if (platformHelper.isMac()) {
    require('electron').ipcRenderer.on('fullscreen-changed', (event, message) => {
      onFullscreenChanged();
    });
  } else {
    $('.fullscreen-button').bind('click', () => {
      toggleFullScreen();
    });
  }

  if (platformHelper.isWin() || platformHelper.isLinux()) {
    Mousetrap.bind('f11', () => {
      toggleFullScreen();
    });
  }
}

function toggleFullScreen() {
  var platform = getPlatform();
  platform.toggleFullScreen();

  onFullscreenChanged();
}

function onFullscreenChanged() {
  var platform = getPlatform();
  const fullScreenButton = document.getElementById('app-container').querySelector('.fullscreen-button');

  if (platform.isFullScreen()) {
    fullScreenButton.setAttribute('title', i18n.t('menu.exit-fullscreen'));
    fullScreenButton.firstElementChild.classList.add('fa-compress');
    fullScreenButton.firstElementChild.classList.remove('fa-expand');
    app_controller.verse_list_popup.disableNewTabButton();
    wheelnavController.bindEvents();
    document.getElementById('app-container').classList.add('fullscreen');

    if (!app_controller.optionsMenu._tagListOption.isChecked) {
      app_controller.tag_assignment_menu.moveTagAssignmentList("POPUP");
    }
  } else {
    fullScreenButton.setAttribute('title', i18n.t('menu.fullscreen'));
    fullScreenButton.firstElementChild.classList.add('fa-expand');
    fullScreenButton.firstElementChild.classList.remove('fa-compress');
    app_controller.verse_list_popup.enableNewTabButton();
    wheelnavController.unbindAndClose();
    document.getElementById('app-container').classList.remove('fullscreen');

    if (!app_controller.optionsMenu._tagListOption.isChecked) {
      app_controller.tag_assignment_menu.moveTagAssignmentList("PREVIOUS");
    }
  }    
}

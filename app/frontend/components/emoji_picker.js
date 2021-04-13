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

var picker;
var theButton;
var input;

function initPicker() {
  const { EmojiButton } = require('../../../lib/emoji-button/dist'); //rebuild version with CommonJS modules
  const isNightMode = app_controller.optionsMenu._nightModeOption && app_controller.optionsMenu._nightModeOption.isChecked();

  picker = new EmojiButton({
    position: 'auto',
    zIndex: 10000,
    showPreview: false,
    showVariants: false,
    theme: isNightMode ? 'dark' : 'light',
    styleProperties: {
      '--background-color': '#f2f5f7',
      '--dark-background-color': '#1e1e1e',
    }
  });

  picker.on('emoji', selection => {
    // `selection` object has an `emoji` property
    if (input && input.nodeName.toLowerCase() === 'input') {
      input.value += selection.emoji
    } else {
      console.log('Input is not defined. Can\'t add emoji', insertselection.emoji);
    }

  });
  return picker;
}

function initButton(inputElement) {
  input = inputElement;

  if (theButton === undefined) {
    theButton = document.createElement('button');
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-grin');
    theButton.appendChild(icon);
    theButton.style.cssText = `
      position: absolute; 
      left: 90%;
      font-size: 1.1rem;
      background: none;
      border: none;
      margin: 1px 2px;
      opacity: 0.4;
    `;

    theButton.addEventListener('click', () => {
      if (picker === undefined) {
        initPicker()
      }
      picker.togglePicker(theButton);
    });
  }

  const buttonWidth = theButton.getBoundingClientRect().width || 30; // approximate width when button is not yet attached to DOM
  theButton.style.left = `${getInputRigthOffset() - buttonWidth}px`;

  return theButton;
}

function getInputRigthOffset() {
  if (input === undefined) {
    return 0;
  }
  const inputRight = input.getBoundingClientRect().right;
  const parentLeft = input.parentNode.getBoundingClientRect().left;
  return inputRight - parentLeft;
}

module.exports = {
  appendTo: (inputElement) => {
    const button = initButton(inputElement);
    inputElement.parentNode.insertBefore(button, inputElement.nextSibling);
  },


}

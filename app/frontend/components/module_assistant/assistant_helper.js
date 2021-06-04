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
require('./assistant_checkbox.js');

module.exports.getSelectedSettingsAssistantElements = function (wizardPage) {
  var selectedElements = [];

  var allElements = $(wizardPage).find('p');
  for (var i = 0; i < allElements.length; i++) {
    var currentElement = $(allElements[i]);
    var currentCheckbox = currentElement.find('input');
    var isChecked = currentCheckbox.prop('checked');
    var isDisabled = currentCheckbox.prop('disabled');

    if (isChecked && !isDisabled) {
      var currentId = currentElement.find('span').attr('id');

      if (currentId != undefined) {
        selectedElements.push(currentId);
      }
    }
  }

  return selectedElements;
};

module.exports.bindLabelEvents = function (wizardPage) {
  wizardPage.find('.label').bind('click', function () {
    var checkbox = $(this).prev();
    checkbox.click();
  });
};

module.exports.lockDialogForAction = function (wizardId) {
  wizardId = '#' + wizardId;

  // Disable close button of dialog, at this point we don't allow the user to close the dialog any longer
  $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').hide();

  // Disable the back button, there is no way back from here
  $($(wizardId).find('.actions').find('li')[0]).addClass('disabled');

  // Disable the finish button as long as we haven't finished
  $($(wizardId).find('.actions').find('li')[2]).addClass('disabled');
};

module.exports.unlockDialog = function (wizardId) {
  wizardId = '#' + wizardId;

  // Enable the finish button
  $($(wizardId).find('.actions').find('li')[2]).removeClass('disabled');

  // Enable close button of dialog
  $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').show();
};

module.exports.sortSection = function(valuesMap) {
  return new Map([...valuesMap].sort(([codeA, detailsA], [codeB, detailsB]) => {
    const a = detailsA.text ? detailsA.text : codeA;
    const b = detailsB.text ? detailsB.text : codeB;

    return a.localeCompare(b, {sensitivity: 'base', ignorePunctuation: true});
  }));
};

module.exports.listCheckboxSection = function(valuesMap, selected, sectionTitle = "") {

  var checkboxes = [];
  for (const item of valuesMap) {
    let code, text = undefined, description = undefined, count = undefined;
    if (Array.isArray(item)) {
      [code, {text, description, count}] = item;
    } else {
      code = item;
    }

    const checkbox = `
    <assistant-checkbox 
      code="${code}" 
      ${selected.includes(code) ? 'checked' : ''}
      ${count ? `count="${count}"` : ''}
      ${description ? `description="${description}"` : ''}>
      ${text ? text : code}
    </assistant-checkbox>`;
    checkboxes.push(checkbox);
  }

  const template = html`
    <h3 style="margin: 1em 0 0;">${sectionTitle}</h3>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 0.5em; padding: 0.5em;">
      ${checkboxes}
    </div>`;
  return template.content;
};


module.exports.getSelelectedSettings = function(sectionElement) {
  const selectedCheckboxes = Array.from(sectionElement.querySelectorAll('assistant-checkbox[checked]'));
  return selectedCheckboxes.map(cb => cb.code);
}
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


module.exports.lockDialogForAction = function (elementId) {
  elementId = '#' + elementId;

  // Disable close button of dialog, at this point we don't allow the user to close the dialog any longer
  $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').hide();

  // Disable the back button, there is no way back from here
  $($(elementId).find('.actions').find('li')[0]).addClass('disabled');

  // Disable the finish button as long as we haven't finished
  $($(elementId).find('.actions').find('li')[2]).addClass('disabled');
};

module.exports.unlockDialog = function (elementId) {
  elementId = '#' + elementId;

  // Enable the finish button
  $($(elementId).find('.actions').find('li')[2]).removeClass('disabled');

  // Enable close button of dialog
  $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').show();
};

module.exports.sortByText = function(itemA, itemB) {
  const a = typeof itemA === 'string' ? itemA : itemA.text ? itemA.text : itemA.code;
  const b = typeof itemB === 'string' ? itemB : itemB.text ? itemB.text : itemB.code;

  return a.localeCompare(b, { sensitivity: 'base', ignorePunctuation: true });
};

/**
 * Generates an HTML fragment with title and checkboxes from array of items
 * @param {[]} arr array of items
 * @param {Set<string>} selected array of values that will be shown as checked
 * @param {string=} sectionTitle Section title
 * @param {object} options additional options for the layout
 * @param {number} [options.columns='auto-fill'] number of columns
 * @param {boolean} [options.disableSelected=false] mark all checked items as disabled
 * @param {boolean} [options.info=false] display info icon and generate event on click
 * @param {boolean} [options.extraIndent=false] add extra indent to make sure that all item icons will be visible
 * @param {string} [options.info="0.5em"] CSS size for the gap between the rows
 * @returns {DocumentFragment} HTML fragment with appropriate <assistant-checkbox> elements for each item
 */
module.exports.listCheckboxSection = function (arr, selected, sectionTitle="", options={}) {
  if (arr.length === 0) {
    return '';
  }

  const { html } = require('../../helpers/ezra_helper.js');
  require('./assistant_checkbox.js');

  options = {
    columns: 'auto-fill',
    disableSelected: false,
    info: false,
    extraIndent: false,
    rowGap: '0.5em',
    ...options
  };

  var checkboxes = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      checkboxes.push(`<assistant-checkbox code="${item}" ${selected.has(item) ? 'checked' : ''}>${item}</assistant-checkbox>`);
    } else {
      const {code, text, description, count, disabled, icon, ...rest} = item;
      const checkedProp = selected.has(code);
      const disabledProp = disabled || options.disableSelected && checkedProp;

      const style = text && text.length > 22 && (options.columns === 'auto-fill' || options.columns > 1) ? 'style="grid-column-end: span 2"' : '';

      const iconSpan = icon ? `<span slot="label-icon">${icon}</span>` : '';

      const extraAttr = Object.entries(rest).map(([attr, val]) => `${attr}="${val}"`);

      /**@type {import('./assistant_checkbox')} */
      const checkbox = `
        <assistant-checkbox 
          ${style}
          code="${code}" 
          ${checkedProp ? 'checked' : ''}
          ${disabledProp ? 'disabled' : ''}
          ${count ? `count="${count}"` : ''}
          ${description ? `description="${description}"` : ''}
          ${options.info ? `info="${i18n.t("module-assistant.show-module-info")}"` : ''}
          ${extraAttr.join(' ')}>
          ${iconSpan}
          <span slot="label-text">${text ? text : code}</span>
        </assistant-checkbox>`;

      if (count !== 0) {
        checkboxes.push(checkbox);
      }
    }
  }

  const paddingLeft = options.extraIndent ? '1em' : '0';

  const template = html`
    <h3 style="margin: 1em 0 0;">${sectionTitle}</h3>
    <div style="display: grid; grid-template-columns: repeat(${options.columns}, minmax(15em, 1fr)); grid-row-gap: ${options.rowGap}; grid-column-gap: 1em; grid-auto-flow: dense; padding: 0.5em 0 0.5em ${paddingLeft};">
      ${checkboxes}
    </div>`;
  return template.content;
};


module.exports.localize = function(container, moduleTypeText="") {
  container.querySelectorAll('[i18n]').forEach(element => {
    element.innerHTML = i18n.t(element.getAttribute('i18n'), {module_type: moduleTypeText});
  });
};

module.exports.localizeContainer = function(container, moduleType='BIBLE') {
  var moduleTypeText = "";

  if (moduleType == 'BIBLE') {
    moduleTypeText = i18n.t("module-assistant.module-type-bible");
  } else if (moduleType == 'DICT') {
    moduleTypeText = i18n.t("module-assistant.module-type-dict");
  }

  container.querySelector('.module-settings-assistant-section-header-module-type').textContent = moduleTypeText;

  this.localize(container);
};
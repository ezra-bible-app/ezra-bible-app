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
const assistantController = require('./assistant_controller.js');

const template = html`
<style>
  #unlock-failed-msg {
    color: red;
  }
  #unlock-key-input {
    width: 20em;
  }
</style>
 
<div id="module-settings-assistant-unlock-dialog" style="display: none;">
  <p id="dialog-unlock-info" class="external"></p>
  <p id="unlock-failed-msg" style="display: none;" i18n="module-assistant.unlock-failed"></p>
  <span id="unlock-key-label" i18n="module-assistant.unlock-key"></span>: <input id="unlock-key-input" type="text" maxlength="255" />
</div>
`;

class UnlockDialog extends HTMLElement {
  constructor() {
    super();

    this._unlockDialogOpened = true;
    this._unlockCancelled = false;
  }

  connectedCallback() {  
    this.appendChild(template.content);
    this.localize();

  }

  show(swordModule, checkbox=undefined) {

    const unlockInfoElement = this.querySelector('#dialog-unlock-info');
    const inputElement = this.querySelector('#unlock-key-input');

    if (swordModule.unlockInfo != "") {
      unlockInfoElement.innerHTML = swordModule.unlockInfo;
    }

    var $unlockDialog = $(this.querySelector('#module-settings-assistant-unlock-dialog'));
    var unlockFailedMsg = this.querySelector('#unlock-failed-msg');

    if (checkbox === undefined) {
      unlockFailedMsg.style.display = 'block';
    } else {
      unlockFailedMsg.style.display = 'none';
    }

    var unlockDialogOptions = {
      modal: true,
      title: i18n.t("module-assistant.enter-unlock-key", { moduleId: swordModule.name }),
      dialogClass: 'ezra-dialog',
      width: 450,
      minHeight: 200
    };

    unlockDialogOptions.buttons = {};    
    unlockDialogOptions.buttons[i18n.t("general.cancel")] = () => {
      $unlockDialog.dialog("close");
      this._unlockDialogOpened = false;
      this._unlockCancelled = true;
    };

    unlockDialogOptions.buttons[i18n.t("general.ok")] = () => {
      const unlockKey = inputElement.value.trim();

      if (unlockKey.length > 0) {
        assistantController.setUnlockKey(swordModule.name, unlockKey);

        if (checkbox !== undefined) {
          checkbox.setAttribute('checked', '');
        }

        $unlockDialog.dialog("close");
        this._unlockDialogOpened = false;
      }
    };
    
    $unlockDialog.dialog(unlockDialogOptions);
    inputElement.focus();
  }

  resetKey(swordModule) {
    this.querySelector('#unlock-key-input').value = '';
    assistantController.setUnlockKey(swordModule.name, '');
  }

  localize() {
    this.querySelectorAll('[i18n]').forEach(element => {
      element.innerHTML = i18n.t(element.getAttribute('i18n'));
    });
  }
}

customElements.define('unlock-dialog', UnlockDialog);
module.exports = UnlockDialog;
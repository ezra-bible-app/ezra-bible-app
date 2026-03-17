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

const i18nController = require('../controllers/i18n_controller.js');
const eventController = require('../controllers/event_controller.js');
const { html, sleep, waitUntilIdle } = require('../helpers/ezra_helper.js');

var emojiPicker; // to keep only one instance of the picker

const template = html`
  <style>
    :host {
      position: absolute; 
      right: 0;
      bottom: auto;
      width: 1em;
      margin-right: 1.8em;
      padding: 3px;
      fill: #5f5f5f;
      display: inline-block;
      cursor: pointer;
      z-index: 1000;
    }
  </style>

  <!-- using Font Awesome icon -->
  <svg viewBox="0 0 496 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm105.6-151.4c-25.9 8.3-64.4 13.1-105.6 13.1s-79.6-4.8-105.6-13.1c-9.9-3.1-19.4 5.4-17.7 15.3 7.9 47.1 71.3 80 123.3 80s115.3-32.9 123.3-80c1.6-9.8-7.7-18.4-17.7-15.3zM168 240c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"/></svg>
`;

/**
 * The emoji-picker component adds the possibility to insert emojis to the tag names and notes 
 * on desktop platforms (electron app). It provides an emoji picker trigger button and inserts
 * emoji in the previous DOM text input or codeMirror editor.
 * 
 * The Emoji Picker dialog is implemented via this external library:
 * https://github.com/zhuiks/emoji-button
 * This library is a customized version of the original:
 * https://github.com/joeattardi/emoji-button
 * 
 * The library instance is kept inside the module variable picker.
 * 
 * @category Component
 */

class EmojiButtonTrigger extends HTMLElement {
  constructor() {
    super();

    if (hasNativeEmoji()) {
      this.style.display = 'none';
      return;
    }

    this.editor = null;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.addEventListener('click', () => this._handleClick());
  }

  connectedCallback() {
    if (hasNativeEmoji()) {
      return;
    }
    
    this.parentNode.style.position = 'relative'; // emoji trigger position relative to the parent
    if (emojiPicker === undefined) { 
      emojiPicker = initPicker(); // attach picker early, it would be a promise at first and it won't block the startup flow
    }
  }

  disconnectedCallback() {
    this.editor = null;
    if (emojiPicker && typeof emojiPicker.hidePicker === 'function') {
      emojiPicker.hidePicker();
    }
  }

  /** 
   * Appends emoji picker button to codeMirror 
   * @param codeMirror - active codeMirror editor instance
   */
  attachEditor(codeMirror) {
    if (hasNativeEmoji()) {
      return;
    }

    this.editor = codeMirror;

    this.style.bottom = '0.8em';
  }

  /** 
   * Insert emoji into input or codeMirror depending on the context in the DOM
   * To be called only by the Picker library in the "emoji" event callback
   * @param {string} emoji - active codeMirror editor instance
   */
  insertEmoji(emoji) {
    const input = this.previousElementSibling;

    if (input && input.nodeName === 'INPUT') {
      input.value += emoji;
    } else if (this.editor && this.editor.getDoc()) {
      this.editor.getDoc().replaceSelection(emoji);
    } else {
      console.error('EmojiButtonTrigger: Input is not detected. Can\'t add emoji', emoji);
    }
  }

  restoreFocus() {
    const input = this.previousElementSibling;

    if (input && input.nodeName === 'INPUT') {
      input.focus();
    } else if (this.editor && this.editor.getDoc()) {
      this.editor.getInputField().focus();
    }
  }

  async _handleClick() {
    (await emojiPicker).togglePicker(this);
  }
}

customElements.define('emoji-button-trigger', EmojiButtonTrigger);
module.exports.EmojiButtonTrigger = EmojiButtonTrigger;

function hasNativeEmoji() {
  return platformHelper.isCordova();
}

async function initPicker(locale=i18nController.getLocale()) {
  await sleep(3000); // delay init as emoji picker is not a priority
  await waitUntilIdle();
  var emojiHelper = null;

  try {
    emojiHelper = require('../helpers/emoji_helper.js');
  } catch (e) {
    console.warn("Could not initialize emoji picker!");
    return;
  }

  const EmojiButton = emojiHelper.getEmojiButtonLib();

  // FIXME: get data from state instead of config option
  const nightModeOption = app_controller.optionsMenu._nightModeOption;
  const isNightMode = nightModeOption && nightModeOption.isChecked;

  const picker = new EmojiButton({ // https://emoji-button.js.org/docs/api
    emojiData: emojiHelper.getLocalizedData(locale),
    showPreview: false,
    showVariants: false,
    showAnimation: false,
    categories: ['smileys', 'people', 'animals', 'food', 'activities', 'travel', 'objects', 'symbols'],
    i18n: i18n.t('emoji', { returnObjects: true }),
    theme: isNightMode ? 'dark' : 'light',
    emojiSize: '1.3em',
    position: 'auto',
    zIndex: 10000,
    styleProperties: {
      '--background-color': '#f2f5f7',
      '--dark-background-color': '#1e1e1e',
    }
  });

  picker.on('emoji', ({ emoji, name, trigger }) => {
    if (!trigger || trigger.nodeName !== 'EMOJI-BUTTON-TRIGGER') {
      console.log('EmojiButtonTrigger: Something wrong. Trigger element is not detected :( But emoji was clicked:', emoji, name);
      return;
    }

    trigger.insertEmoji(emoji);
  });

  picker.on('hidden', ({ trigger }) => {
    if (trigger) {
      trigger.restoreFocus();
    }
  });

  subscribePicker();

  return picker;
}

var emojiPickerSubscribed = false; // subscribe to the state update only once
function subscribePicker() {
  if (emojiPickerSubscribed || !emojiPicker) {
    return;
  }

  emojiPickerSubscribed = true;

  eventController.subscribe('on-locale-changed', async locale => {
    // FIXME: Handle properly
    try {
      (await emojiPicker).destroyPicker();
    } catch (e) {
      console.log('EmojiButtonTrigger: Got the following error when destroying external emojiPicker after locale change:', e);
    }
    
    emojiPicker = await initPicker(locale);
  });

  eventController.subscribe('on-theme-changed', async theme => {
    const picker = await emojiPicker;
    switch (theme) {
      case 'dark':
        picker.setTheme('dark');
        break;

      case 'regular':
        picker.setTheme('light');
        break;

      default:
        console.error('Unknown theme ' + theme);
    }
  });
}


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

const i18n = require('i18next');

const template = html`
  <style>
    :host {
      position: absolute; 
      right: 0;
      bottom: auto;
      width: 1em;
      margin-right: 1.2em;
      padding: 3px;
      fill: #5f5f5f;
      display: inline-block;
    }
  </style>
  <svg viewBox="0 0 496 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm105.6-151.4c-25.9 8.3-64.4 13.1-105.6 13.1s-79.6-4.8-105.6-13.1c-9.9-3.1-19.4 5.4-17.7 15.3 7.9 47.1 71.3 80 123.3 80s115.3-32.9 123.3-80c1.6-9.8-7.7-18.4-17.7-15.3zM168 240c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"/></svg>
`;
class EmojiTrigger extends HTMLElement {
  constructor() {
    super();
    this.editor = null;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.addEventListener('click', () => this._handleClick());
  }

  connectedCallback() {
    this.parentNode.style.position = 'relative'; // emoji trigger position relative to the parent
  }

  disconnectedCallback() {
    this.editor = null;
    if (picker) {
      picker.hidePicker();
    }
  }

  attachEditor(codeMirror) {
    this.editor = codeMirror;

    this.style.bottom = '0.8em';
  }

  insertEmoji(emoji) {
    const input = this.previousElementSibling;
    if (input && input.nodeName === 'INPUT') {
      input.value += emoji;
    } else if (this.editor && this.editor.getDoc()) {
      this.editor.getDoc().replaceSelection(emoji);
    } else {
      console.log('EmojiPicker: Input is not detected. Can\'t add emoji', emoji);
    }
  }

  _handleClick() {
    if (picker === undefined) {
      initPicker();
    }
    picker.togglePicker(this);
  }
}

customElements.define('emoji-picker', EmojiTrigger);

// proof of concept; utilizing tagged templates https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates
// FIXME: move to utility module or use the npm package
function html(literals, ...substs) {
  const template = document.createElement('template');
  // based upon https://github.com/AntonioVdlC/html-template-tag/blob/main/src/index.ts
  template.innerHTML = literals.raw.reduce((acc, lit, i) => {
    let subst = substs[i - 1];
    if (Array.isArray(subst)) {
      subst = subst.join("");
    }
    return acc + subst + lit;
  });

  return template;
}

var picker;

function initPicker() {
  const { EmojiButton } = require('../../../node_modules/@joeattardi/emoji-button/dist/index.cjs.js');
  const isNightMode = app_controller.optionsMenu._nightModeOption && app_controller.optionsMenu._nightModeOption.isChecked;

  picker = new EmojiButton({ // https://emoji-button.js.org/docs/api
    emojiData: getLocalizedData(i18n.language),
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
    if (!trigger || trigger.nodeName !== 'EMOJI-PICKER') {
      console.log('EmojiPicker: Something wrong. Trigger element is not detected :( But emoji was clicked:', emoji, name);
      return;
    }
    trigger.insertEmoji(emoji);
  });

  return picker;
}

function setTheme(theme) {
  if (picker) {
    picker.setTheme(theme);
  }
}

function getLocalizedData(locale) {
  switch (locale) {
    case 'de':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_de.json');
    case 'en':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_en.json');
    case 'es':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_es.json');
    case 'fr':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_fr.json');
    case 'nl':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_nl.json');
    case 'ru':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_ru.json');
    case 'sk':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_sk.json');
    case 'uk':
      return require('../../../node_modules/@joeattardi/emoji-button/dist/locale/emoji_uk.json');
    default:
      console.log(`EmojiPicker: Can't upload emoji annotations for locale: ${locale}. Using default`);

  }
}

/**
 * The emojiPicker component adds posibility to insert emojis to the tag names and notes 
 * on desktop platforms (electron app). It attaches emoji picker button to the text input
 * field. 
 * Emoji Picker dialog is implemented via external library:
 * https://github.com/joeattardi/emoji-button
 * 
 * emojiPicker keeps it's state inside module variables. So it can be just imported/requested
 * where it needed (without using app_controller instance).
 * 
 * @category Component
 */

module.exports = {
  /** 
   * Appends emoji picker button to input field
   * @param {HTMLElement} inputElement - input element to append to
   */
  appendTo: async (inputElement) => {
    if (platformHelper.isElectron()) {
      const trigger = initButtonTrigger(inputElement);
      inputElement.parentNode.insertBefore(trigger, inputElement.nextSibling);
    }
  },
  /** 
   * Appends emoji picker button to codeMirror 
   * @param {HTMLElement} textArea - textArea used for codeMirror editor instance  
   * @param codeMirror - active codeMirror editor instance
   */
  appendToCodeMirror: async (textArea, codeMirror) => {
    if (platformHelper.isElectron() && codeMirror) {
      const trigger = initButtonTrigger(textArea, codeMirror);
      textArea.parentNode.insertBefore(trigger, null); // insert as last child
    }
  },

  setDarkTheme: () => setTheme('dark'),
  setLightTheme: () => setTheme('light'),
}

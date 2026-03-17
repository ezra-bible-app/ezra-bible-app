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


/**
 * This module dynamically includes emoji annotations from emoji-button packet based on requested locale
 * It should not be included in browserify build as it doesn't support dynamic requires
 * and there is no need for emoji picker under Android or other mobile platform
 * @module emojiHelper
 * @category Utility
 */

const LIB_PATH = 'simple-emoji-button/dist/';

module.exports.getEmojiButtonLib = function() {
  const { EmojiButton } = require(LIB_PATH + '/index.cjs');
  return EmojiButton;
};

module.exports.getLocalizedData = function(locale) {
  const localePath = LIB_PATH + 'locale/emoji_' + locale;

  try {
    return require(localePath);
  } catch (error) {
    console.log(`EmojiButtonTrigger: Can't upload emoji annotations for locale: ${locale}. Using default`);    
  }
};
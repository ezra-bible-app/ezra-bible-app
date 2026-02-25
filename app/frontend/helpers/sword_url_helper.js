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

const swordModuleHelper = require('./sword_module_helper.js');

/**
 * This module handles sword:// URL navigation across the application.
 * It parses sword:// URLs, determines the target module type, and routes
 * to the appropriate tool panel (Dictionary, Word Study, or Commentary).
 *
 * sword:// URL format: sword://ModuleName/Key
 * When no module is specified (sword:///Key), the key is treated as a
 * scripture reference using the current Bible translation.
 *
 * @module sword_url_helper
 * @category Helper
 */

/**
 * Parse a sword:// URL into its module and key components.
 * @param {string} href - The sword:// URL to parse
 * @returns {{ moduleName: string, key: string } | null} Parsed URL components, or null if invalid
 */
function parseSwordUrl(href) {
  if (href == null || href.indexOf('sword://') == -1) {
    return null;
  }

  let path = href.replace('sword://', '');

  // Remove any trailing slashes
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  if (path.length == 0) {
    return null;
  }

  let moduleName = '';
  let key = '';

  // Handle sword:///Key (no module, starts with /)
  if (path.startsWith('/')) {
    moduleName = '';
    key = path.substring(1);
  } else if (path.indexOf('/') != -1) {
    // Handle sword://Module/Key
    let slashIndex = path.indexOf('/');
    moduleName = path.substring(0, slashIndex);
    key = path.substring(slashIndex + 1);
  } else {
    // Handle sword://Key (just a key, no slash)
    moduleName = '';
    key = path;
  }

  if (key.length == 0) {
    return null;
  }

  return { moduleName: moduleName, key: key };
}

/**
 * Check whether a given href string is a sword:// URL.
 * @param {string} href - The URL to check
 * @returns {boolean} True if the href is a sword:// URL
 */
module.exports.isSwordUrl = function(href) {
  return href != null && href.indexOf('sword://') != -1;
};

/**
 * Handle a sword:// URL by determining the target module type and
 * routing to the appropriate panel.
 *
 * - Strongs dictionary modules -> Word Study Panel
 * - Dictionary / Map / Image modules -> Dictionary Panel
 * - Bible modules or no module specified -> Reference box (scripture navigation)
 *
 * @param {string} href - The sword:// URL to handle
 * @param {Object} [referenceBoxHelper=null] - Optional ReferenceBoxHelper instance
 *        for handling scripture references. If provided, Bible references will be
 *        shown in the reference box of the calling panel.
 */
module.exports.handleSwordUrl = async function(href, referenceBoxHelper) {
  let parsed = parseSwordUrl(href);

  if (parsed == null) {
    return;
  }

  let moduleName = parsed.moduleName;
  let key = parsed.key;

  // If no module specified, treat the key as a scripture reference
  if (moduleName == '') {
    await handleScriptureReference(key, referenceBoxHelper);
    return;
  }

  // Check if the module is installed locally
  let moduleInfo = await ipcNsi.getLocalModule(moduleName);

  if (moduleInfo == null) {
    showModuleNotInstalledMessage(moduleName);
    return;
  }

  // Determine the module type and route accordingly
  let hasStrongs = moduleInfo.hasHebrewStrongsKeys || moduleInfo.hasGreekStrongsKeys;

  if (hasStrongs) {
    await handleStrongsReference(moduleName, key);
  } else if (swordModuleHelper.isDictionaryModule(moduleInfo)) {
    await handleDictionaryReference(moduleName, key);
  } else if (swordModuleHelper.isCommentaryModule(moduleInfo)) {
    await handleCommentaryReference(moduleName, key);
  } else if (swordModuleHelper.isBibleModule(moduleInfo)) {
    await handleScriptureReference(key, referenceBoxHelper);
  } else {
    // For unknown types, try opening as a dictionary entry
    await handleDictionaryReference(moduleName, key);
  }
};

/**
 * Handle navigation to a Strongs dictionary entry.
 * Builds the proper Strongs key (e.g., G4652 or H1234) and opens it
 * in the Word Study Panel.
 * @param {string} moduleName - The Strongs module name
 * @param {string} key - The raw key from the URL
 */
async function handleStrongsReference(moduleName, key) {
  let strongsNumber = key.replace(/^0+/, ''); // Remove leading zeros
  let isGreek = moduleName.indexOf('Greek') != -1;
  let prefix = isGreek ? 'G' : 'H';

  // If the key already has a prefix (G/H), use it directly
  if (key.match(/^[GH]\d/)) {
    prefix = key[0];
    strongsNumber = key.substring(1).replace(/^0+/, '');
  }

  let strongsKey = prefix + strongsNumber;

  let wordStudyPanel = app_controller.word_study_controller._wordStudyPanel;
  await wordStudyPanel.updateWithKey(strongsKey, true);

  switchToPanel('word-study-panel');
}

/**
 * Handle navigation to a dictionary/map/image module entry.
 * Opens the entry in the Dictionary Panel, switching to the correct
 * module if necessary.
 * @param {string} moduleName - The dictionary module code
 * @param {string} key - The entry key to open
 */
async function handleDictionaryReference(moduleName, key) {
  let dictionaryPanel = app_controller.dictionaryPanel;
  await dictionaryPanel.openModuleEntry(moduleName, key);

  switchToPanel('dictionary-panel');
}

/**
 * Handle navigation to a commentary module entry.
 * Opens the entry in the Commentary Panel, switching to the correct
 * module if necessary.
 * @param {string} moduleName - The commentary module code
 * @param {string} key - The entry key to open
 */
async function handleCommentaryReference(moduleName, key) {
  let commentaryPanel = app_controller.commentaryPanel;
  await commentaryPanel.openModuleEntry(moduleName, key);

  switchToPanel('commentary-panel');
}

/**
 * Handle a scripture reference key (e.g., Gen.1.1).
 * If a referenceBoxHelper is provided, the reference is shown inline
 * in the calling panel's reference box. Otherwise it is ignored.
 * @param {string} key - The OSIS scripture reference
 * @param {Object} [referenceBoxHelper=null] - Optional ReferenceBoxHelper
 */
async function handleScriptureReference(key, referenceBoxHelper) {
  if (referenceBoxHelper != null) {
    // Create a synthetic element with the reference as osisRef for the reference box helper
    let syntheticEvent = {
      target: document.createElement('span')
    };
    syntheticEvent.target.setAttribute('osisRef', key);
    syntheticEvent.target.textContent = key;

    referenceBoxHelper.handleReferenceClick(syntheticEvent, false);
  }
}

/**
 * Show a toast notification when a referenced module is not installed.
 * @param {string} moduleName - The module code that is not installed
 */
function showModuleNotInstalledMessage(moduleName) {
  // eslint-disable-next-line no-undef
  iziToast.info({
    message: i18n.t('general.module-not-installed', { module_name: moduleName }),
    position: platformHelper.getIziPosition(),
    timeout: 5000
  });
}

/**
 * Switch the tool panel to the specified panel ID.
 * @param {string} panelId - The panel ID to switch to (e.g., 'dictionary-panel', 'word-study-panel')
 */
function switchToPanel(panelId) {
  let panelButtons = document.querySelector('panel-buttons');
  if (panelButtons) {
    panelButtons._updatePanels(panelId, false);
  }
}

/**
 * Set up click handlers for all sword:// links within a given container element.
 * This finds all <a> elements whose href contains 'sword://' and attaches
 * click handlers that delegate to handleSwordUrl.
 *
 * @param {HTMLElement} container - The DOM element to search for sword:// links
 * @param {Object} [referenceBoxHelper=null] - Optional ReferenceBoxHelper for scripture refs
 */
module.exports.initSwordUrlLinks = function(container, referenceBoxHelper) {
  if (container == null) {
    return;
  }

  let aElements = container.querySelectorAll('a');

  aElements.forEach((a) => {
    let href = a.getAttribute('href');

    if (href != null && href.indexOf('sword://') != -1) {
      // Skip links that point to the same SWORD module as the containing section
      let parsed = parseSwordUrl(href);
      if (parsed != null && parsed.moduleName != '') {
        let moduleSection = a.closest('[module-context]');
        if (moduleSection != null && moduleSection.getAttribute('module-context') === parsed.moduleName) {
          a.style.cursor = 'default';
          a.style.color = 'inherit';
          a.style.textDecoration = 'none';
          a.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          return;
        }
      }

      a.style.cursor = 'pointer';

      a.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        let linkHref = event.target.closest('a').getAttribute('href');
        module.exports.handleSwordUrl(linkHref, referenceBoxHelper);
      });
    }
  });
};

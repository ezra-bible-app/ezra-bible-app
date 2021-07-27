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


/**
 * This module contains utility functions that are used through the app
 * @module ezraHelper
 * @category Utility
 */


module.exports.sleep = async function (time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

module.exports.waitUntilIdle = async function () {
  return new Promise(resolve => {
    window.requestIdleCallback(() => {
      resolve();
    });
  });
}

// based on https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
module.exports.escapeRegExp = function (text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * This little function gives us the possibility for html tagged template literals.
 * 
 * Note that if we ever introduce a library like lit we may need to remove this function, because there would otherwise be a
 * clash in the global namespace.
 * 
 * proof of concept; utilizing tagged templates https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates
 * FIXME: move to utility module or use the npm package
 */
module.exports.html = (literals, ...substs) => {
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


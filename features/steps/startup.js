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

const { Then } = require('cucumber');
const { assert } = require('chai');
const spectronHelper = require('../helpers/spectron_helper.js');
const nsiHelper = require('../helpers/nsi_helper.js');

Then('the startup loading indicator is hidden', async function () {
  const displayValue = await spectronHelper.getWebClient().execute(() => {
    return window.getComputedStyle(document.getElementById('startup-loading-indicator')).display;
  });

  const resolvedDisplayValue = displayValue && displayValue.value !== undefined ? displayValue.value : displayValue;
  assert.equal(resolvedDisplayValue, 'none', 'The startup loading indicator should be hidden after startup.');
});

Then('the KJV is not available as a local module', async function () {
  const kjvModule = await nsiHelper.getLocalModule('KJV');
  assert.isNull(kjvModule, 'KJV should not be installed for the startup profiling scenario.');
});

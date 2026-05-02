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

const fs = require('fs');
const path = require('path');
const { Then } = require('cucumber');
const { assert } = require('chai');
const spectronHelper = require('../helpers/spectron_helper.js');
const nsiHelper = require('../helpers/nsi_helper.js');

function parseProfile(reportContent) {
  const profile = {};
  const lines = reportContent.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    profile[line.substring(0, separatorIndex)] = line.substring(separatorIndex + 1);
  }

  return profile;
}

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

Then('the startup profile contains ordered milestone timestamps', async function () {
  const userDataDir = await spectronHelper.getUserDataDir();
  const startupProfilePath = path.join(userDataDir, 'startup-ipc-profile.txt');

  assert.isTrue(fs.existsSync(startupProfilePath), 'The startup profile should have been written.');

  const profile = parseProfile(fs.readFileSync(startupProfilePath, 'utf8'));
  const milestoneKeys = [
    't0_app_process_start_at',
    't1_first_ui_frame_rendered_at',
    't2_first_meaningful_content_visible_at',
    't3_startup_complete_at'
  ];
  const milestoneTimes = milestoneKeys.map(key => {
    assert.isString(profile[key], 'Missing startup milestone field: ' + key);
    const timestamp = Date.parse(profile[key]);
    assert.isFalse(Number.isNaN(timestamp), 'Invalid startup milestone timestamp: ' + key);
    return timestamp;
  });

  for (let i = 1; i < milestoneTimes.length; i++) {
    assert.isAtMost(
      milestoneTimes[i - 1],
      milestoneTimes[i],
      'Startup milestone timestamps must be ordered.'
    );
  }

  const intervalChecks = [
    ['t1_minus_t0_ms', milestoneTimes[1] - milestoneTimes[0]],
    ['t2_minus_t0_ms', milestoneTimes[2] - milestoneTimes[0]],
    ['t3_minus_t0_ms', milestoneTimes[3] - milestoneTimes[0]],
    ['t2_minus_t1_ms', milestoneTimes[2] - milestoneTimes[1]],
    ['t3_minus_t2_ms', milestoneTimes[3] - milestoneTimes[2]]
  ];

  for (let i = 0; i < intervalChecks.length; i++) {
    const intervalKey = intervalChecks[i][0];
    const expectedValue = intervalChecks[i][1];

    assert.match(profile[intervalKey], /^\d+$/, 'Invalid startup interval field: ' + intervalKey);
    assert.equal(Number(profile[intervalKey]), expectedValue, 'Unexpected startup interval value: ' + intervalKey);
  }

  assert.equal(
    Number(profile.startup_duration_ms),
    Number(profile.t3_minus_t0_ms),
    'startup_duration_ms should match T3 - T0.'
  );
});

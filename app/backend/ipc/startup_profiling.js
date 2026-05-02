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
const PlatformHelper = require('../../lib/platform_helper.js');

function startupProfilingEnabled() {
  return ['1', 'true', 'yes'].includes(String(process.env.EZRA_STARTUP_PROFILING || '').toLowerCase());
}

class StartupProfiling {
  constructor() {
    this._platformHelper = new PlatformHelper();
    this._enabled = this._platformHelper.isElectron() &&
      this._platformHelper.isTest() &&
      startupProfilingEnabled();
    this.reset();
  }

  reset() {
    this._active = false;
    this._startupStartTime = null;
    this._startupEndTime = null;
    this._startupMilestones = {
      t0AppProcessStart: null,
      t1FirstUiFrameRendered: null,
      t2FirstMeaningfulContentVisible: null,
      t3StartupComplete: null
    };
    this._initializationDurations = {
      swordInitialization: null,
      databaseInitialization: null
    };
    this._categories = {
      ipcGeneral: this.createCategoryStats(),
      ipcDb: this.createCategoryStats(),
      ipcNsi: this.createCategoryStats()
    };
  }

  createCategoryStats() {
    return {
      callCount: 0,
      totalDurationNs: 0n,
      minDurationNs: null,
      maxDurationNs: null,
      calls: {}
    };
  }

  start(startupStartTime = new Date()) {
    if (!this._enabled) {
      return;
    }

    this.reset();
    this._active = true;
    this._startupStartTime = startupStartTime instanceof Date
      ? startupStartTime
      : new Date(startupStartTime);
    this._startupMilestones.t0AppProcessStart = this._startupStartTime;
    this.removeExistingReport();
  }

  isActive() {
    return this._enabled && this._active;
  }

  getCategoryName(functionName) {
    if (functionName.startsWith('general_')) {
      return 'ipcGeneral';
    }

    if (functionName.startsWith('db_')) {
      return 'ipcDb';
    }

    if (functionName.startsWith('nsi_')) {
      return 'ipcNsi';
    }

    return null;
  }

  recordHandlerCall(functionName, durationNs) {
    if (!this.isActive()) {
      return;
    }

    const categoryName = this.getCategoryName(functionName);
    if (categoryName == null) {
      return;
    }

    const categoryStats = this._categories[categoryName];
    categoryStats.callCount += 1;
    categoryStats.totalDurationNs += durationNs;

    if (categoryStats.minDurationNs == null || durationNs < categoryStats.minDurationNs) {
      categoryStats.minDurationNs = durationNs;
    }

    if (categoryStats.maxDurationNs == null || durationNs > categoryStats.maxDurationNs) {
      categoryStats.maxDurationNs = durationNs;
    }

    if (categoryStats.calls[functionName] == null) {
      categoryStats.calls[functionName] = {
        callCount: 0,
        totalDurationNs: 0n,
        minDurationNs: null,
        maxDurationNs: null
      };
    }

    const callStats = categoryStats.calls[functionName];
    callStats.callCount += 1;
    callStats.totalDurationNs += durationNs;

    if (callStats.minDurationNs == null || durationNs < callStats.minDurationNs) {
      callStats.minDurationNs = durationNs;
    }

    if (callStats.maxDurationNs == null || durationNs > callStats.maxDurationNs) {
      callStats.maxDurationNs = durationNs;
    }
  }

  recordInitializationDuration(initializationName, durationNs) {
    if (!this.isActive()) {
      return;
    }

    if (this._initializationDurations[initializationName] === undefined) {
      return;
    }

    this._initializationDurations[initializationName] = durationNs;
  }

  recordStartupMilestone(milestoneName, timestampMs = Date.now()) {
    if (!this.isActive()) {
      return;
    }

    if (this._startupMilestones[milestoneName] === undefined) {
      return;
    }

    const milestoneTime = timestampMs instanceof Date ? timestampMs : new Date(timestampMs);

    if (Number.isNaN(milestoneTime.getTime())) {
      return;
    }

    this._startupMilestones[milestoneName] = milestoneTime;
  }

  async finalize(startupCompletedTime = undefined) {
    if (!this._enabled) {
      return null;
    }

    if (startupCompletedTime !== undefined) {
      this.recordStartupMilestone('t3StartupComplete', startupCompletedTime);
    } else if (this._startupMilestones.t3StartupComplete == null) {
      this.recordStartupMilestone('t3StartupComplete');
    }

    this._startupEndTime = this._startupMilestones.t3StartupComplete == null
      ? new Date()
      : this._startupMilestones.t3StartupComplete;
    this._active = false;

    return this.writeReport();
  }

  getReportFilePath() {
    const userDataDir = this._platformHelper.getUserDataPath();
    return path.join(userDataDir, 'startup-ipc-profile.txt');
  }

  removeExistingReport() {
    const reportFilePath = this.getReportFilePath();

    if (fs.existsSync(reportFilePath)) {
      fs.unlinkSync(reportFilePath);
    }
  }

  writeReport() {
    const reportFilePath = this.getReportFilePath();
    fs.mkdirSync(path.dirname(reportFilePath), { recursive: true });
    fs.writeFileSync(reportFilePath, this.createReport(), 'utf8');
    return reportFilePath;
  }

  formatDurationNs(durationNs) {
    return (Number(durationNs) / 1000000).toFixed(3);
  }

  formatAverageDuration(totalDurationNs, callCount) {
    if (callCount === 0) {
      return '0.000';
    }

    return (Number(totalDurationNs) / callCount / 1000000).toFixed(3);
  }

  formatTimestamp(timestamp) {
    return timestamp == null ? '' : timestamp.toISOString();
  }

  formatMilestoneDeltaMs(startMilestoneName, endMilestoneName) {
    const startTime = this._startupMilestones[startMilestoneName];
    const endTime = this._startupMilestones[endMilestoneName];

    if (startTime == null || endTime == null) {
      return '';
    }

    return String(endTime.getTime() - startTime.getTime());
  }

  createCategorySection(categoryName, categoryStats) {
    const lines = [];

    lines.push('[' + categoryName + ']');
    lines.push('call_count=' + categoryStats.callCount);
    lines.push('total_duration_ms=' + this.formatDurationNs(categoryStats.totalDurationNs));
    lines.push('avg_duration_ms=' + this.formatAverageDuration(categoryStats.totalDurationNs, categoryStats.callCount));
    lines.push('min_duration_ms=' + this.formatDurationNs(categoryStats.minDurationNs == null ? 0n : categoryStats.minDurationNs));
    lines.push('max_duration_ms=' + this.formatDurationNs(categoryStats.maxDurationNs == null ? 0n : categoryStats.maxDurationNs));
    lines.push('');
    lines.push('calls:');

    const functionNames = Object.keys(categoryStats.calls).sort();
    if (functionNames.length === 0) {
      lines.push('  (none)');
      return lines.join('\n');
    }

    for (let i = 0; i < functionNames.length; i++) {
      const functionName = functionNames[i];
      const callStats = categoryStats.calls[functionName];
      lines.push(
        '  ' + functionName +
        ' | count=' + callStats.callCount +
        ' total_ms=' + this.formatDurationNs(callStats.totalDurationNs) +
        ' avg_ms=' + this.formatAverageDuration(callStats.totalDurationNs, callStats.callCount) +
        ' min_ms=' + this.formatDurationNs(callStats.minDurationNs == null ? 0n : callStats.minDurationNs) +
        ' max_ms=' + this.formatDurationNs(callStats.maxDurationNs == null ? 0n : callStats.maxDurationNs)
      );
    }

    return lines.join('\n');
  }

  createReport() {
    const lines = [];
    const startupDurationMs = this._startupStartTime != null && this._startupEndTime != null
      ? String(this._startupEndTime.getTime() - this._startupStartTime.getTime())
      : '0';

    lines.push('Ezra Bible App startup IPC profiling');
    lines.push('profile_version=3');
    lines.push('mode=test');
    lines.push('startup_started_at=' + (this._startupStartTime == null ? '' : this._startupStartTime.toISOString()));
    lines.push('startup_finished_at=' + (this._startupEndTime == null ? '' : this._startupEndTime.toISOString()));
    lines.push('startup_duration_ms=' + startupDurationMs);
    lines.push('t0_app_process_start_at=' + this.formatTimestamp(this._startupMilestones.t0AppProcessStart));
    lines.push('t1_first_ui_frame_rendered_at=' + this.formatTimestamp(this._startupMilestones.t1FirstUiFrameRendered));
    lines.push('t2_first_meaningful_content_visible_at=' + this.formatTimestamp(this._startupMilestones.t2FirstMeaningfulContentVisible));
    lines.push('t3_startup_complete_at=' + this.formatTimestamp(this._startupMilestones.t3StartupComplete));
    lines.push('t1_minus_t0_ms=' + this.formatMilestoneDeltaMs('t0AppProcessStart', 't1FirstUiFrameRendered'));
    lines.push('t2_minus_t0_ms=' + this.formatMilestoneDeltaMs('t0AppProcessStart', 't2FirstMeaningfulContentVisible'));
    lines.push('t3_minus_t0_ms=' + this.formatMilestoneDeltaMs('t0AppProcessStart', 't3StartupComplete'));
    lines.push('t2_minus_t1_ms=' + this.formatMilestoneDeltaMs('t1FirstUiFrameRendered', 't2FirstMeaningfulContentVisible'));
    lines.push('t3_minus_t2_ms=' + this.formatMilestoneDeltaMs('t2FirstMeaningfulContentVisible', 't3StartupComplete'));
    lines.push('sword_initialization_ms=' + this.formatDurationNs(
      this._initializationDurations.swordInitialization == null ? 0n : this._initializationDurations.swordInitialization
    ));
    lines.push('database_initialization_ms=' + this.formatDurationNs(
      this._initializationDurations.databaseInitialization == null ? 0n : this._initializationDurations.databaseInitialization
    ));
    lines.push('');
    lines.push(this.createCategorySection('ipcGeneral', this._categories.ipcGeneral));
    lines.push('');
    lines.push(this.createCategorySection('ipcDb', this._categories.ipcDb));
    lines.push('');
    lines.push(this.createCategorySection('ipcNsi', this._categories.ipcNsi));
    lines.push('');

    return lines.join('\n');
  }
}

module.exports = StartupProfiling;

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

const eventController = require('../../controllers/event_controller.js');
const { PRESETS, generatePlanDays } = require('../../helpers/reading_plan_helper.js');

/**
 * The ReadingPlanPanel component implements a tool panel for managing and following a Bible reading plan.
 * It supports preset reading plans; when no plan is active it shows a prompt to generate one.
 * 
 * @category Component
 */
class ReadingPlanPanel {
  constructor() {
    this._initDone = false;
    this._generateDialogInitialized = false;
    this._deleteDialogInitialized = false;
    this._bookTitleCache = {};

    eventController.subscribe('on-reading-plan-panel-switched', async (isOpen) => {
      if (isOpen && !this._initDone) {
        await this.init();
      }
    });
  }

  getPanel() {
    return document.getElementById('reading-plan-panel');
  }

  getContentContainer() {
    return document.getElementById('reading-plan-panel-content');
  }

  // ── Initialization ────────────────────────────────────────────────────────

  async init() {
    await this.refresh();
    this._initDone = true;
  }

  async refresh() {
    var settings = await ipcDb.getReadingPlanSettings();

    if (!settings || !settings.readingPlanActive) {
      this._renderNoPlan();
    } else {
      var days = await ipcDb.getAllReadingPlanDays();
      await this._buildBookTitleCache(days);
      this._renderActivePlan(days, settings.readingPlanStartDate);
    }
  }

  // ── Book title caching ─────────────────────────────────────────────────────

  async _buildBookTitleCache(days) {
    var uniqueBooks = {};

    for (var i = 0; i < days.length; i++) {
      var passages = days[i].ReadingPlanPassages || [];
      for (var j = 0; j < passages.length; j++) {
        var parts = passages[j].startVerseReference.split('.');
        var bookCode = parts[0];
        if (bookCode && !uniqueBooks[bookCode]) {
          uniqueBooks[bookCode] = true;
        }
      }
    }

    var books = Object.keys(uniqueBooks);
    for (var b = 0; b < books.length; b++) {
      var book = books[b];
      if (!this._bookTitleCache[book]) {
        try {
          var title = await ipcDb.getBookTitleTranslation(book);
          this._bookTitleCache[book] = title || book;
        } catch (e) { // eslint-disable-line no-unused-vars
          this._bookTitleCache[book] = book;
        }
      }
    }
  }

  _getPassageDisplayTitle(ref) {
    var parts = ref.split('.');
    var bookCode = parts[0];
    var chapter = parts[1] || '';
    var bookTitle = this._bookTitleCache[bookCode] || bookCode;
    return bookTitle + ' ' + chapter;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _renderNoPlan() {
    var content = this.getContentContainer();
    if (!content) {
      return;
    }

    content.innerHTML = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'reading-plan-no-plan';

    var hint = document.createElement('p');
    hint.setAttribute('i18n', 'reading-plan.no-plan-hint');
    hint.textContent = i18n.t('reading-plan.no-plan-hint');
    wrapper.appendChild(hint);

    var generateBtn = document.createElement('button');
    generateBtn.className = 'reading-plan-generate-btn fg-button ui-state-default ui-corner-all';
    generateBtn.textContent = i18n.t('reading-plan.generate-plan');
    generateBtn.addEventListener('click', () => {
      this._showGenerateDialog();
    });
    wrapper.appendChild(generateBtn);

    content.appendChild(wrapper);

    uiHelper.configureButtonStyles(content);
  }

  _renderActivePlan(days, startDate) {
    var content = this.getContentContainer();
    if (!content) {
      return;
    }

    content.innerHTML = '';

    var currentDayNumber = this._computeCurrentDayNumber(startDate, days.length);

    var list = document.createElement('ul');
    list.className = 'reading-plan-day-list';

    for (var i = 0; i < days.length; i++) {
      var day = days[i];
      var isCompleted = !!day.completedAt;
      var isCurrent = day.dayNumber === currentDayNumber;

      var entry = document.createElement('li');
      entry.className = 'reading-plan-day-entry';
      if (isCompleted) {
        entry.classList.add('completed');
      }
      if (isCurrent) {
        entry.classList.add('current-day');
      }
      entry.setAttribute('data-day-id', day.id);
      entry.setAttribute('data-day-number', day.dayNumber);
      entry.setAttribute('data-completed', isCompleted ? '1' : '0');

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'reading-plan-day-checkbox';
      checkbox.checked = isCompleted;
      checkbox.title = isCompleted ? i18n.t('reading-plan.mark-not-completed') : i18n.t('reading-plan.mark-completed');
      checkbox.addEventListener('change', this._onDayCheckboxChange.bind(this));
      entry.appendChild(checkbox);

      var label = document.createElement('span');
      label.className = 'reading-plan-day-label';

      var dayNum = document.createElement('span');
      dayNum.className = 'reading-plan-day-number';
      dayNum.textContent = i18n.t('reading-plan.day', { day: day.dayNumber }) + ':';
      label.appendChild(dayNum);

      var passages = day.ReadingPlanPassages || [];
      for (var j = 0; j < passages.length; j++) {
        var passage = passages[j];
        var link = document.createElement('a');
        link.className = 'reading-plan-passage-link';
        link.href = '#';
        link.textContent = this._getPassageDisplayTitle(passage.startVerseReference);
        link.setAttribute('data-ref', passage.startVerseReference);
        link.addEventListener('click', this._onPassageLinkClick.bind(this));
        label.appendChild(link);
      }

      if (isCurrent) {
        var badge = document.createElement('span');
        badge.className = 'reading-plan-current-indicator';
        badge.textContent = i18n.t('reading-plan.current-day');
        label.appendChild(badge);
      }

      entry.appendChild(label);
      list.appendChild(entry);
    }

    content.appendChild(list);

    var actions = document.createElement('div');
    actions.className = 'reading-plan-actions';

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'reading-plan-delete-btn fg-button ui-state-default ui-corner-all';
    deleteBtn.textContent = i18n.t('reading-plan.delete-plan');
    deleteBtn.addEventListener('click', () => {
      this._showDeleteDialog();
    });
    actions.appendChild(deleteBtn);
    content.appendChild(actions);

    uiHelper.configureButtonStyles(content);
  }

  // ── Day number calculation ────────────────────────────────────────────────────

  _computeCurrentDayNumber(startDate, totalDays) {
    if (!startDate) {
      return 1;
    }

    var start = new Date(startDate);
    var now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    var diffMs = now - start;
    var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    var dayNumber = diffDays + 1;

    if (dayNumber < 1) {
      dayNumber = 1;
    }
    if (dayNumber > totalDays) {
      dayNumber = totalDays;
    }

    return dayNumber;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  _onPassageLinkClick(event) {
    event.preventDefault();
    var ref = event.target.getAttribute('data-ref');
    if (!ref) {
      return;
    }

    var parts = ref.split('.');
    var bookCode = parts[0];
    var chapter = parts[1] ? parseInt(parts[1], 10) : undefined;
    var bookTitle = this._bookTitleCache[bookCode] || bookCode;

    app_controller.text_controller.loadBook(bookCode, bookTitle, bookTitle, true, chapter);
  }

  async _onDayCheckboxChange(event) {
    var checkbox = event.target;
    var entry = checkbox.closest('.reading-plan-day-entry');
    if (!entry) {
      return;
    }

    var dayId = parseInt(entry.getAttribute('data-day-id'), 10);
    var isChecked = checkbox.checked;

    if (isChecked) {
      var completedAt = new Date().toISOString();
      await ipcDb.setReadingPlanDayCompleted(dayId, completedAt);
      entry.classList.add('completed');
      entry.setAttribute('data-completed', '1');
      checkbox.title = i18n.t('reading-plan.mark-not-completed');
    } else {
      await ipcDb.setReadingPlanDayCompleted(dayId, null);
      entry.classList.remove('completed');
      entry.setAttribute('data-completed', '0');
      checkbox.title = i18n.t('reading-plan.mark-completed');
    }
  }

  // ── Generate plan dialog ───────────────────────────────────────────────────

  _showGenerateDialog() {
    if (!this._generateDialogInitialized) {
      this._initGenerateDialog();
    }

    // Set default date to today
    var today = new Date().toISOString().split('T')[0];
    document.getElementById('reading-plan-start-date-input').value = today;

    // Localize dialog content
    $('#reading-plan-generate-dialog').localize();
    $('#reading-plan-generate-dialog').dialog('open');
  }

  _initGenerateDialog() {
    var dialogOptions = uiHelper.getDialogOptions(400, null, true, null);
    dialogOptions.autoOpen = false;
    dialogOptions.title = i18n.t('reading-plan.generate-plan-dialog-title');
    dialogOptions.buttons = {};
    dialogOptions.buttons[i18n.t('reading-plan.start-plan')] = async () => {
      await this._onGenerateConfirmed();
    };
    dialogOptions.buttons[i18n.t('general.cancel')] = function() {
      $('#reading-plan-generate-dialog').dialog('close');
    };

    $('#reading-plan-generate-dialog').dialog(dialogOptions);
    uiHelper.fixDialogCloseIconOnCordova('reading-plan-generate-dialog');
    this._generateDialogInitialized = true;
  }

  async _onGenerateConfirmed() {
    var presetId = document.getElementById('reading-plan-preset-select').value;
    var startDateValue = document.getElementById('reading-plan-start-date-input').value;

    if (!presetId || !PRESETS[presetId]) {
      return;
    }

    var startDate = startDateValue ? startDateValue : new Date().toISOString().split('T')[0];

    var planDays = generatePlanDays(presetId);
    if (planDays.length === 0) {
      return;
    }

    await ipcDb.createReadingPlan(planDays);
    await ipcDb.updateReadingPlanSettings(true, startDate);

    $('#reading-plan-generate-dialog').dialog('close');

    // Re-render with the new plan
    this._initDone = false;
    await this.refresh();
    this._initDone = true;
  }

  // ── Delete plan dialog ─────────────────────────────────────────────────────

  _showDeleteDialog() {
    if (!this._deleteDialogInitialized) {
      this._initDeleteDialog();
    }

    $('#reading-plan-delete-dialog').dialog('open');
  }

  _initDeleteDialog() {
    var dialogOptions = uiHelper.getDialogOptions(350, null, true, null);
    dialogOptions.autoOpen = false;
    dialogOptions.title = i18n.t('reading-plan.delete-plan');
    dialogOptions.buttons = {};
    dialogOptions.buttons[i18n.t('reading-plan.delete-plan')] = async () => {
      await this._onDeleteConfirmed();
    };
    dialogOptions.buttons[i18n.t('general.cancel')] = function() {
      $('#reading-plan-delete-dialog').dialog('close');
    };

    $('#reading-plan-delete-dialog').localize();
    $('#reading-plan-delete-dialog').dialog(dialogOptions);
    uiHelper.fixDialogCloseIconOnCordova('reading-plan-delete-dialog');
    this._deleteDialogInitialized = true;
  }

  async _onDeleteConfirmed() {
    await ipcDb.deleteReadingPlan();
    await ipcDb.updateReadingPlanSettings(false, null);

    $('#reading-plan-delete-dialog').dialog('close');

    // Reset and re-render
    this._initDone = false;
    this._generateDialogInitialized = false;
    this._bookTitleCache = {};
    await this.refresh();
    this._initDone = true;
  }
}

module.exports = ReadingPlanPanel;

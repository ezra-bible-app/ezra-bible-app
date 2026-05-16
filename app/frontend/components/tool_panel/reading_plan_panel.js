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
const { PRESETS, PLAN_TYPES, generatePlanDays } = require('../../helpers/reading_plan_helper.js');

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
    this._resetDialogInitialized = false;
    this._bookTitleCache = {};
    this._selectedPlanType = null;
    this._selectedPresetId = null;
    this._startDate = null;

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
        // Also cache the end book in case the passage spans a book boundary (highly unlikely but safe)
        var endParts = passages[j].endVerseReference.split('.');
        var endBook = endParts[0];
        if (endBook && !uniqueBooks[endBook]) {
          uniqueBooks[endBook] = true;
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

  _getPassageDisplayTitle(startRef, endRef) {
    var startParts = startRef.split('.');
    var bookCode = startParts[0];
    var startChapter = startParts[1] || '';
    var bookTitle = this._bookTitleCache[bookCode] || bookCode;

    if (endRef && endRef !== startRef) {
      var endChapter = endRef.split('.')[1] || '';
      return bookTitle + ' ' + startChapter + '-' + endChapter;
    }

    return bookTitle + ' ' + startChapter;
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
    generateBtn.textContent = i18n.t('reading-plan.create-reading-plan');
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
    this._startDate = startDate || null;

    var currentDayNumber = this._computeCurrentDayNumber(startDate, days.length);

    // ── Header: start date + delete button ──
    var header = document.createElement('div');
    header.className = 'reading-plan-header';

    var startInfo = document.createElement('span');
    startInfo.className = 'reading-plan-start-info';
    if (startDate) {
      var formattedDate = new Date(startDate).toLocaleDateString();
      startInfo.textContent = i18n.t('reading-plan.plan-started', { date: formattedDate });
    } else {
      startInfo.textContent = i18n.t('reading-plan.plan-not-started');
    }
    header.appendChild(startInfo);

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'reading-plan-delete-btn fg-button ui-state-default ui-corner-all';
    deleteBtn.textContent = i18n.t('reading-plan.delete-plan');
    deleteBtn.addEventListener('click', () => {
      this._showDeleteDialog();
    });
    header.appendChild(deleteBtn);

    var resetBtn = document.createElement('button');
    resetBtn.className = 'reading-plan-reset-btn fg-button ui-state-default ui-corner-all';
    resetBtn.textContent = i18n.t('reading-plan.reset-progress');
    resetBtn.addEventListener('click', () => {
      this._showResetDialog();
    });
    header.appendChild(resetBtn);

    var generateNewBtn = document.createElement('button');
    generateNewBtn.className = 'fg-button ui-state-default ui-corner-all';
    generateNewBtn.textContent = i18n.t('reading-plan.generate-new-plan');
    generateNewBtn.addEventListener('click', () => {
      this._showGenerateDialog();
    });
    header.appendChild(generateNewBtn);
    content.appendChild(header);

    // ── Progress line ──
    var completedCount = days.filter(function(d) { return !!d.completedAt; }).length;
    var totalCount = days.length;
    var percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    var progressWrapper = document.createElement('div');
    progressWrapper.className = 'reading-plan-progress';

    var progressText = document.createElement('span');
    progressText.className = 'reading-plan-progress-text';
    progressText.textContent = i18n.t('reading-plan.progress', { completed: completedCount, total: totalCount, percent: percent });
    progressWrapper.appendChild(progressText);

    var progressBar = document.createElement('div');
    progressBar.className = 'reading-plan-progress-bar-track';
    var progressFill = document.createElement('div');
    progressFill.className = 'reading-plan-progress-bar-fill';
    progressFill.style.width = percent + '%';
    progressBar.appendChild(progressFill);
    progressWrapper.appendChild(progressBar);

    content.appendChild(progressWrapper);

    // ── Day list ──

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
        link.textContent = this._getPassageDisplayTitle(passage.startVerseReference, passage.endVerseReference);
        link.setAttribute('data-ref', passage.startVerseReference);
        link.addEventListener('click', this._onPassageLinkClick.bind(this));
        label.appendChild(link);
        if (j < passages.length - 1) {
          label.appendChild(document.createTextNode('; '));
        }
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

    var currentTab = app_controller.tab_controller.getTab();
    var bibleTranslationId = currentTab ? currentTab.getBibleTranslationId() : null;
    var secondBibleTranslationId = currentTab ? currentTab.getSecondBibleTranslationId() : null;

    app_controller.translation_controller.isInstantLoadingBook(
      bibleTranslationId,
      secondBibleTranslationId,
      bookCode
    ).then((instantLoad) => {
      app_controller.text_controller.loadBook(bookCode, bookTitle, bookTitle, instantLoad, chapter);
    });
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

    // Record start date automatically on the first day checked
    if (isChecked && !this._startDate) {
      this._startDate = new Date().toISOString().split('T')[0];
      await ipcDb.updateReadingPlanSettings(true, this._startDate);
      await this.refresh();
      return;
    }

    this._updateProgressBar();
  }

  _updateProgressBar() {
    var content = this.getContentContainer();
    if (!content) {
      return;
    }

    var allEntries = content.querySelectorAll('.reading-plan-day-entry');
    var totalCount = allEntries.length;
    var completedCount = content.querySelectorAll('.reading-plan-day-entry[data-completed="1"]').length;
    var percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    var progressText = content.querySelector('.reading-plan-progress-text');
    if (progressText) {
      progressText.textContent = i18n.t('reading-plan.progress', { completed: completedCount, total: totalCount, percent: percent });
    }

    var progressFill = content.querySelector('.reading-plan-progress-bar-fill');
    if (progressFill) {
      progressFill.style.width = percent + '%';
    }
  }

  // ── Generate plan dialog ───────────────────────────────────────────────────

  _showGenerateDialog() {
    if (!this._generateDialogInitialized) {
      this._initGenerateDialog();
    }

    // Reset wizard state
    this._selectedPlanType = null;
    this._selectedPresetId = null;
    document.querySelectorAll('.rp-plan-type-card').forEach(function(c) {
      c.classList.remove('selected');
    });
    document.getElementById('rp-btn-next').disabled = true;

    this._goToGenerateStep(1);

    $('#reading-plan-generate-dialog').localize();
    // Re-set button labels after localize (localize may reset text nodes)
    document.getElementById('rp-btn-next').textContent = i18n.t('general.next');
    $('#reading-plan-generate-dialog').dialog('open');
  }

  _initGenerateDialog() {
    var dialogOptions = uiHelper.getDialogOptions(620, null, true, null);
    dialogOptions.autoOpen = false;
    dialogOptions.title = i18n.t('reading-plan.create-reading-plan-dialog-title');
    dialogOptions.buttons = [
      {
        text: i18n.t('reading-plan.create-reading-plan'),
        class: 'rp-dialog-start-btn',
        disabled: true,
        click: async () => {
          await this._onGenerateConfirmed();
        }
      },
      {
        text: i18n.t('general.cancel'),
        click: function() {
          $('#reading-plan-generate-dialog').dialog('close');
        }
      }
    ];

    $('#reading-plan-generate-dialog').dialog(dialogOptions);
    uiHelper.fixDialogCloseIconOnCordova('reading-plan-generate-dialog');

    // Plan type card selection
    var self = this;
    document.querySelectorAll('.rp-plan-type-card').forEach(function(card) {
      card.addEventListener('click', function() {
        self._onPlanTypeCardClicked(card.getAttribute('data-type'));
      });
    });

    // Step navigation buttons
    document.getElementById('rp-btn-next').addEventListener('click', function() {
      self._goToGenerateStep(2);
    });
    document.getElementById('rp-btn-back').addEventListener('click', function() {
      self._goToGenerateStep(1);
    });

    this._generateDialogInitialized = true;

    // Subscribe to the on-esc-pressed event to close the dialog when escape key is pressed
    eventController.subscribe('on-esc-pressed', () => {
      if ($('#reading-plan-generate-dialog').dialog('isOpen')) {
        $('#reading-plan-generate-dialog').dialog('close');
      }
    });
  }

  _goToGenerateStep(step) {
    var stepType = document.getElementById('rp-step-type');
    var stepTimeframe = document.getElementById('rp-step-timeframe');

    if (step === 1) {
      stepType.style.display = 'block';
      stepTimeframe.style.display = 'none';
      $('.rp-dialog-start-btn').button('disable');
    } else {
      stepType.style.display = 'none';
      stepTimeframe.style.display = 'block';
      this._renderPaceOptions();
    }
  }

  _renderPaceOptions() {
    var container = document.getElementById('rp-pace-options');
    container.innerHTML = '';

    var planType = PLAN_TYPES[this._selectedPlanType];
    if (!planType) {
      return;
    }

    var typeLabel = document.getElementById('rp-selected-type-label');
    if (typeLabel) {
      typeLabel.textContent = i18n.t(planType.titleKey);
    }

    var self = this;
    var paces = planType.paces;

    // If there is only one pace, auto-select it and show it as a fixed label (no radio)
    if (paces.length === 1) {
      var fixedLabel = document.createElement('span');
      fixedLabel.className = 'rp-pace-fixed';
      fixedLabel.textContent = i18n.t(paces[0].i18nKey);
      container.appendChild(fixedLabel);
      this._onPaceSelected(paces[0].presetId);
    } else {
      for (var i = 0; i < paces.length; i++) {
        var pace = paces[i];
        var label = document.createElement('label');
        label.className = 'rp-pace-option';

        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'rp-pace';
        radio.value = pace.presetId;
        radio.addEventListener('change', (function(presetId) {
          return function() {
            self._onPaceSelected(presetId);
          };
        }(pace.presetId)));

        label.appendChild(radio);
        label.appendChild(document.createTextNode(i18n.t(pace.i18nKey)));
        container.appendChild(label);
      }

      // Disable Start until a pace is explicitly chosen
      $('.rp-dialog-start-btn').button('disable');
    }

    document.getElementById('rp-btn-back').textContent = i18n.t('general.previous');
    uiHelper.configureButtonStyles(document.getElementById('reading-plan-generate-dialog'));
  }

  _onPlanTypeCardClicked(typeId) {
    this._selectedPlanType = typeId;
    this._selectedPresetId = null;
    document.querySelectorAll('.rp-plan-type-card').forEach(function(c) {
      c.classList.remove('selected');
    });
    var card = document.querySelector('.rp-plan-type-card[data-type="' + typeId + '"]');
    if (card) {
      card.classList.add('selected');
    }
    document.getElementById('rp-btn-next').disabled = false;
  }

  _onPaceSelected(presetId) {
    this._selectedPresetId = presetId;
    $('.rp-dialog-start-btn').button('enable');
  }

  async _onGenerateConfirmed() {
    var presetId = this._selectedPresetId;

    if (!presetId || !PRESETS[presetId]) {
      return;
    }

    // Close dialog and show loading indicator immediately
    $('#reading-plan-generate-dialog').dialog('close');
    this._renderLoading();

    var planDays = generatePlanDays(presetId);
    if (planDays.length === 0) {
      this._renderNoPlan();
      return;
    }

    await ipcDb.createReadingPlan(planDays);
    await ipcDb.updateReadingPlanSettings(true, null);

    // Re-render with the new plan
    this._initDone = false;
    await this.refresh();
    this._initDone = true;
  }

  _renderLoading() {
    var content = this.getContentContainer();
    if (!content) {
      return;
    }

    content.innerHTML = '';

    var loader = document.createElement('loading-indicator');
    loader.style.display = 'block';
    loader.style.margin = '1.5em auto';
    loader.style.width = 'fit-content';
    content.appendChild(loader);
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

    dialogOptions.buttons[i18n.t('reading-plan.delete-plan')] = {
      text: i18n.t('reading-plan.delete-plan'),
      click: async () => {
        await this._onDeleteConfirmed();
      }
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

  // ── Reset progress dialog ──────────────────────────────────────────────────

  _showResetDialog() {
    if (!this._resetDialogInitialized) {
      this._initResetDialog();
    }

    $('#reading-plan-reset-dialog').dialog('open');
  }

  _initResetDialog() {
    var dialogOptions = uiHelper.getDialogOptions(350, null, true, null);
    dialogOptions.autoOpen = false;
    dialogOptions.title = i18n.t('reading-plan.reset-progress');
    dialogOptions.buttons = {};

    dialogOptions.buttons[i18n.t('reading-plan.reset-progress')] = {
      text: i18n.t('reading-plan.reset-progress'),
      click: async () => {
        await this._onResetConfirmed();
      }
    };

    dialogOptions.buttons[i18n.t('general.cancel')] = function() {
      $('#reading-plan-reset-dialog').dialog('close');
    };

    $('#reading-plan-reset-dialog').localize();
    $('#reading-plan-reset-dialog').dialog(dialogOptions);
    uiHelper.fixDialogCloseIconOnCordova('reading-plan-reset-dialog');
    this._resetDialogInitialized = true;
  }

  async _onResetConfirmed() {
    var days = await ipcDb.getAllReadingPlanDays();
    for (var i = 0; i < days.length; i++) {
      if (days[i].completedAt) {
        await ipcDb.setReadingPlanDayCompleted(days[i].id, null);
      }
    }
    await ipcDb.updateReadingPlanSettings(true, null);
    this._startDate = null;

    $('#reading-plan-reset-dialog').dialog('close');
    await this.refresh();
  }
}

module.exports = ReadingPlanPanel;

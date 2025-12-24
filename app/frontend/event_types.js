/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */



// For consistency event name should be a string in-kebab-case with the following template: "on-[(optional)object]-[action]"

/**
 * @typedef { "on-verse-list-init" | "on-bible-text-loaded" | "on-translation1-changed" | "on-translation2-changed" | "on-verses-selected" } BibleTextEvents
 */
/**
 * @typedef { "on-tab-selected" | "on-tab-added" | "on-tab-removed" | "on-tab-menu-clicked" | "on-tab-scrolled" | "on-tab-controller-loaded" } TabEvents
 */
/**
 * @typedef { "on-tab-search-results-available" | "on-tab-search-reset" } TabSearchEvents
 */
/**
 * @typedef { "on-all-translations-removed" | "on-translation-removed" | "on-translation-added" | "on-dictionary-added" | "on-dictionary-removed" | "on-commentary-added" | "on-commentary-removed" | "on-module-install-completed" | "on-module-removal-completed" } ModuleAssistantEvents
 */
/**
 * @typedef { "on-repo-update-started" | "on-repo-update-progress" | "on-repo-update-completed" } RepoUpdateEvents
 */
/**
 * @typedef { "on-locale-changed" } I18nEvents
 */
/**
 * @typedef { "on-startup-completed" | "on-theme-changed" | "on-fullscreen-changed" | "on-button-clicked" | "on-body-clicked" | "on-db-refresh" | "on-enter-pressed" | "on-esc-pressed" } AppEvents
 */
/**
 * @typedef { "on-tag-panel-switched" | "on-tag-statistics-panel-switched" | "on-word-study-panel-switched" | "on-compare-panel-switched" } PanelEvents
 */
/**
 * @typedef { "on-tag-created" | "on-tag-deleted" | "on-tag-renamed" | "on-latest-tag-changed" } TagEvents
 */
/**
 * @typedef { "on-note-created" | "on-note-deleted" | "on-note-file-changed" | "on-note-file-deleted" } NoteEvents
 */
/**
 * @typedef { "on-tag-group-list-activated" | "on-tag-selection-menu-group-list-activated" | "on-tag-selection-menu-group-selected" | "on-tag-selection-menu-all-tags-selected" | "on-tag-group-selected" | "on-tag-group-all-selected" | "on-tag-group-creation" | "on-tag-group-created" | "on-tag-group-member-changed" | "on-tag-group-multiple-members-changed" | "on-tag-group-renamed" | "on-tag-group-deleted" | "on-tag-group-filter-enabled" | "on-tag-group-filter-disabled" } TagGroupEvents
 */
/**
 * @typedef { "on-module-search-started" } ModuleSearchEvents
 */
/**
 * @typedef { BibleTextEvents | TabEvents | TabSearchEvents | ModuleAssistantEvents | RepoUpdateEvents | I18nEvents | AppEvents | PanelEvents | TagEvents | TagGroupEvents | NoteEvents | ModuleSearchEvents } EzraEvent
 */

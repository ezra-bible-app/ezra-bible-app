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


async function changeLocale(newLlocale) {
  console.log('Language changed', newLlocale);

  await i18n.changeLanguage(newLlocale);
  $(document).localize();

  // Todo: Bind to event in respective dependent components instead
  window.reference_separator = i18n.t('general.chapter-verse-separator');
  await app_controller.book_selection_menu.localizeBookSelectionMenu();
  await app_controller.assign_last_tag_button.updateLabel();
  await app_controller.verse_selection.updateSelectedVersesLabel();
  app_controller.tab_controller.localizeTemplate();
  await app_controller.updateTagsView(undefined, true);
  tags_controller.refreshTagDialogs();

}
async function detectLocale() {
  const systemLocale = 'en';
  await changeLocale(systemLocale);
}


module.exports.changeLocale = changeLocale;
module.exports.detectLocale = detectLocale;
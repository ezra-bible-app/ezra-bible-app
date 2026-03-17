#  This file is part of Ezra Bible App.
#
#  Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>
#
#  Ezra Bible App is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 2 of the License, or
#  (at your option) any later version.
#
#  Ezra Bible App is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Ezra Bible App. See the file LICENSE.
#  If not, see <http://www.gnu.org/licenses/>.

# features/008_locale_change.feature

Feature: Change app language (locale)
  In order to be able to use Ezra Bible App in my native language I can manualy select desired app language
  Background:
    Given I open the book selection menu
    And I select the book Ezra
    And I have the navigation displayed
    And I have the current tab search displayed

  Scenario Outline: Switch app locale
    Given I open the options dialog
    When I change to the "<locale_native>" locale
    Then the tab title is "<tab_title>"
    And I open the tag panel
    And the tag stat text is "<tag_stat>"
    And I open the dictionary panel
    And the dictionary header text is "<dictionary>"
    And the search button text is "<search>"
    And the tab search case option text is "<tab_search_option>"
    And the selected locale text is "<locale_native>"
    And I open the book selection menu
    And the Revelation book name text is "<revelation>"
    But I close the book selection menu
    And I open the translation selection menu
    And the English option group text is "<english>"
    And I close the translation selection menu

    Examples:
        | locale_native | tab_title   | tag_stat                 | dictionary | search | tab_search_option                | revelation  | english    |
        | Deutsch       | Esra [KJV]  | 0 benutzt / 0 gesamt     | Wörterbuch |  Suche | Groß- / Kleinschreibung beachten | Offenbarung | Englisch   |
        | Русский       | Ездра [KJV] | 0 использовано / 0 всего | Словарь    |  Поиск | С учетом регистра                | Откровение  | Английский |



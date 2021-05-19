#  This file is part of Ezra Bible App.
#
#  Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>
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

# features/007_locale_change.feature

Feature: Change app language (locale)
  In order to be able to use Ezra Bible App in my native language I can manualy select desired app language
  Background:
    Given I open the book selection menu
    And I select the book Ezra
    And I have toolbar displayed
    And I have dictionary displayed
    And I have navigation displayed
    And I have current tab search displayed

  Scenario: Switch app locale
    Given I open the options dialog
    When I change to the first available locale
    Then the tab title is "Esra [KJV]"
    And the tag stat text is "0 benutzt / 0 gesamt"
    And the dictionary header text is "Wörterbuch"
    And the search button text is "Suche"
    And the tab search case option text is "Groß- / Kleinschreibung beachten"
    And the selected locale text is "Deutsch"
    And I open the book selection menu
    And the Revelation book name text is "Offenbarung"



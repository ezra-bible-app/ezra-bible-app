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

# features/005_verse_tagging.feature

Feature: Verse tagging
  In order to categorize verses I can assign tags to each individual verse.

  @remove-last-tag-after-scenario
  Scenario: Creating and assigning a tag to one verse
    Given I open the book selection menu
    And I select the book Ephesians
    And I create the tag "God's love"
    And I select the verse "Ephesians 2:4"
    When I assign the tag "God's love" to the current verse selection
    Then the tag "God's love" is assigned to "Ephesians 2:4" in the database
    And the tag "God's love" is visible in the bible browser at the selected verse
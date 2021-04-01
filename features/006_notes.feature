#  This file is part of Ezra Bible App.
#
#  Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>
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

# features/006_notes.feature

Feature: Adding, viewing and editing notes
  In order to keep study notes I can add, view and edit notes for individual verses and books.

  Scenario: Adding a note to a book
    Given I have notes displayed
    And I open the book selection menu
    And I select the book Ephesians
    And I click on "Ephesians" book note
    And I enter markdown text
    ```
    # A Letter From Prison

    Written: _aprox. 60-63 A.D._

    **Themes**:
    - Gospel
    - Faith
    - Church
    ```
    When I click note "Save" button
    Then the note assigned to "Ephesians" in the database starts with text "# A Letter From Prison"
    And the note assigned to "Ephesians" has "h1" text "A Letter From Prison"
    And the note assigned to "Ephesians" has "em" text "aprox. 60-63 A.D."
    And the note assigned to "Ephesians" has "strong" text "Themes"
    And the note assigned to "Ephesians" has 3 list items
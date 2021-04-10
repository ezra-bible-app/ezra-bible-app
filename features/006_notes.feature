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

# features/006_notes.feature

Feature: Adding, viewing and editing notes
  In order to keep study notes I can add, view and edit notes for individual verses and books.
  Background:
    Given I open the book selection menu
    And I select the book Ephesians

  @remove-last-note-after-scenario
  Scenario: Adding a note to a book
    Given I have notes displayed
    And I click on "Ephesians" note
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

  Scenario: Adding a note to a verse
    Given I have notes hidden
    And I have indicators displayed
    And I click on note indicator for the verse "Ephesians 1:2"
    And I enter markdown text
    ```
    **Grace and peace** greeting
    ```
    When I click outside of the note editor
    Then the note assigned to "Ephesians 1:2" in the database starts with text "**Grace and peace"
    And the note assigned to "Ephesians 1:2" has "strong" text "Grace and peace"

  @remove-last-note-after-scenario
  Scenario: Cancel verse note editing
    Given I have notes hidden
    And I have indicators displayed
    And the note assigned to "Ephesians 1:2" in the database starts with text "**Grace and peace"
    And the note assigned to "Ephesians 1:2" has "strong" text "Grace and peace"
    And I click on "Ephesians 1:2" note
    And I enter markdown text
    ```
    abracadabra
    ```
    When I click note "Cancel" button
    Then the note assigned to "Ephesians 1:2" in the database starts with text "**Grace and peace"
    And the note assigned to "Ephesians 1:2" has "strong" text "Grace and peace"
